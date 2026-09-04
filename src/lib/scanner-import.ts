import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { findingContentSchema, type FindingContent } from '@/lib/reporting';

export const scannerFormats = [
  'Burp',
  'Nessus',
  'Nmap',
  'OpenVAS',
  'ZAP',
  'Nuclei',
  'Qualys',
  'SARIF',
] as const;
export type ScannerFormat = (typeof scannerFormats)[number];
export type ImportFinding = FindingContent & {
  source: ScannerFormat;
  sourceId: string;
};
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
type Node = Record<string, unknown>;
const object = (value: unknown): Node =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Node)
    : {};
const list = (value: unknown): unknown[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];
function plain(value: unknown): string {
  const text =
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : String(object(value)['#text'] ?? '');
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(amp|lt|gt|quot|apos);/g,
      (_, key: string) =>
        ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[key]!
    )
    .trim();
}
function severity(value: unknown): FindingContent['severity'] {
  const name = plain(value).toLowerCase();
  return (
    (
      {
        '0': 'Info',
        '1': 'Low',
        '2': 'Medium',
        '3': 'High',
        '4': 'Critical',
        '5': 'Critical',
        information: 'Info',
        informational: 'Info',
        info: 'Info',
        low: 'Low',
        medium: 'Medium',
        moderate: 'Medium',
        high: 'High',
        critical: 'Critical',
        error: 'High',
        warning: 'Medium',
        note: 'Info',
        none: 'Info',
      } as const
    )[name as '0'] ?? ''
  );
}

function cvssSeverity(value: unknown): FindingContent['severity'] {
  const score = Number(plain(value));
  if (!plain(value) || !Number.isFinite(score) || score < 0 || score > 10)
    return '';
  return score >= 9
    ? 'Critical'
    : score >= 7
      ? 'High'
      : score >= 4
        ? 'Medium'
        : score > 0
          ? 'Low'
          : 'Info';
}

export function importFingerprint(finding: ImportFinding): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        [
          finding.source,
          finding.sourceId,
          finding.title,
          finding.affectedHosts,
        ].map((s) => s.trim())
      )
    )
    .digest('hex');
}

export function parseScannerExport(
  text: string,
  format: ScannerFormat
): ImportFinding[] {
  if (
    !scannerFormats.includes(format) ||
    !text.trim() ||
    Buffer.byteLength(text) > MAX_IMPORT_BYTES ||
    text.includes('\0')
  )
    throw new Error('Choose a supported export up to 2 MB.');
  let root: Node;
  if (['ZAP', 'Nuclei', 'SARIF'].includes(format)) {
    try {
      root =
        format === 'Nuclei'
          ? {
              results: text
                .trim()
                .split(/\r?\n/)
                .map((line) => JSON.parse(line)),
            }
          : object(JSON.parse(text));
    } catch {
      throw new Error('Invalid JSON export. Nuclei requires JSON Lines.');
    }
  } else {
    // Burp includes an internal schema DTD; discard it without interpreting it.
    // External identifiers and entity declarations are never accepted or resolved.
    if (/<!ENTITY/i.test(text))
      throw new Error('Entity declarations are not allowed.');
    text = text.replace(
      /<!DOCTYPE\s+[A-Za-z_][\w:.-]*\s*(?:\[[\s\S]*?\]\s*)?>/gi,
      (declaration) => {
        if (/\bSYSTEM\b|\bPUBLIC\b|%/i.test(declaration))
          throw new Error('External DTDs are not allowed.');
        return '';
      }
    );
    if (/<!DOCTYPE/i.test(text))
      throw new Error('External or malformed DTDs are not allowed.');
    let depth = 0;
    let tags = 0;
    for (const match of text
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
      .matchAll(/<\/?[A-Za-z][^>]*>/g)) {
      if (++tags > 30000) throw new Error('Export has too many XML elements.');
      if (match[0].startsWith('</')) depth--;
      else if (!match[0].endsWith('/>') && ++depth > 64)
        throw new Error('Export nesting is too deep.');
    }
    if (XMLValidator.validate(text) !== true)
      throw new Error('Invalid XML export.');
    root = object(
      new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
        parseAttributeValue: false,
        processEntities: false,
      }).parse(text)
    );
  }
  const findings: ImportFinding[] = [];
  const add = (value: {
    title: unknown;
    id?: unknown;
    risk?: unknown;
    background?: unknown;
    remediation?: unknown;
    observation?: unknown;
    hosts?: unknown;
    references?: unknown;
    category?: unknown;
  }) => {
    if (findings.length >= 500)
      throw new Error('Import at most 500 findings at a time.');
    const content = findingContentSchema.safeParse({
      title: plain(value.title),
      category: plain(value.category) || format,
      severity: severity(value.risk),
      background: plain(value.background),
      remediation: plain(value.remediation),
      observation: plain(value.observation),
      affectedHosts: plain(value.hosts),
      supportingLinks: plain(value.references),
    });
    if (!content.success)
      throw new Error(
        'An imported finding is missing a title or exceeds the field limits. Split or correct the export.'
      );
    const sourceId = plain(value.id).slice(0, 500);
    findings.push({ ...content.data, source: format, sourceId });
  };
  if (format === 'Burp') {
    for (const value of list(object(root.issues).issue)) {
      const issue = object(value);
      add({
        title: issue.name,
        id: issue.type,
        risk: issue.severity,
        background: issue.issueBackground,
        remediation: issue.remediationBackground,
        observation: issue.issueDetail,
        hosts: `${plain(issue.host)}${plain(issue.path)}`,
        references: issue.references,
      });
    }
  } else if (format === 'Nessus') {
    for (const hostValue of list(
      object(object(root.NessusClientData_v2).Report).ReportHost
    )) {
      const host = object(hostValue);
      for (const itemValue of list(host.ReportItem)) {
        const item = object(itemValue);
        add({
          title: item['@_pluginName'],
          id: item['@_pluginID'],
          risk: item['@_severity'],
          background: item.description,
          remediation: item.solution,
          observation: item.plugin_output,
          hosts: `${plain(host['@_name'])}:${plain(item['@_port'])}/${plain(item['@_protocol'])}`,
          references: list(item.see_also).map(plain).join('\n'),
        });
      }
    }
  } else if (format === 'Nmap') {
    for (const hostValue of list(object(root.nmaprun).host)) {
      const host = object(hostValue);
      const address = list(host.address)
        .map((v) => plain(object(v)['@_addr']))
        .join(', ');
      for (const portValue of list(object(host.ports).port)) {
        const port = object(portValue);
        if (object(port.state)['@_state'] !== 'open') continue;
        const service = plain(object(port.service)['@_name']);
        add({
          title: `Open ${plain(port['@_protocol'])} port ${plain(port['@_portid'])}${service ? ` (${service})` : ''}`,
          id: `${plain(port['@_protocol'])}/${plain(port['@_portid'])}`,
          risk: 'Info',
          observation:
            list(port.script)
              .map((v) => plain(object(v)['@_output']))
              .join('\n') ||
            'Open service discovered; validate its significance before reporting.',
          hosts: address,
        });
      }
    }
  } else if (format === 'OpenVAS') {
    const outer = object(
      root.report ?? object(root.get_reports_response).report
    );
    const report = object(outer.report ?? outer);
    for (const value of list(object(report.results).result)) {
      const result = object(value),
        nvt = object(result.nvt);
      add({
        title: result.name ?? nvt.name,
        id: nvt['@_oid'],
        risk: cvssSeverity(result.severity),
        background: nvt.tags,
        remediation: result.solution ?? nvt.solution,
        observation: result.description,
        hosts: `${plain(result.host)} ${plain(result.port)}`,
      });
    }
  } else if (format === 'ZAP') {
    for (const siteValue of list(root.site)) {
      const site = object(siteValue);
      for (const value of list(site.alerts)) {
        const alert = object(value);
        add({
          title: alert.name ?? alert.alert,
          id: alert.pluginid,
          risk: alert.riskcode,
          background: alert.desc,
          remediation: alert.solution,
          observation: list(alert.instances)
            .map((v) => {
              const i = object(v);
              return [i.uri, i.method, i.param, i.evidence]
                .map(plain)
                .join(' ');
            })
            .join('\n'),
          hosts: site['@name'],
          references: alert.reference,
        });
      }
    }
  } else if (format === 'Nuclei') {
    for (const value of list(root.results)) {
      const result = object(value),
        info = object(result.info);
      add({
        title: info.name,
        id: result['template-id'],
        risk: info.severity,
        background: info.description,
        remediation: info.remediation,
        observation:
          list(result['extracted-results']).map(plain).join('\n') ||
          result['matched-at'],
        hosts: result['matched-at'] ?? result.host,
        references: list(info.reference).map(plain).join('\n'),
      });
    }
  } else if (format === 'Qualys') {
    const scan = object(root.SCAN);
    for (const hostValue of list(scan.IP)) {
      const host = object(hostValue);
      for (const section of ['VULNS', 'PRACTICES', 'INFOS']) {
        for (const categoryValue of list(object(host[section]).CAT)) {
          const category = object(categoryValue);
          for (const value of list(
            category.VULN ?? category.PRACTICE ?? category.INFO
          )) {
            const item = object(value);
            const risk =
              (
                {
                  '1': 'Info',
                  '2': 'Low',
                  '3': 'Medium',
                  '4': 'High',
                  '5': 'Critical',
                } as Record<string, string>
              )[plain(item['@_severity'])] ?? '';
            add({
              title: item.TITLE,
              id: item['@_number'],
              risk,
              background: item.DIAGNOSIS,
              remediation: item.SOLUTION,
              observation: item.RESULT,
              hosts: host['@_value'],
              references: list(object(item.CVE_ID_LIST).CVE_ID)
                .map(plain)
                .join('\n'),
            });
          }
        }
      }
    }
  } else {
    for (const runValue of list(root.runs)) {
      const run = object(runValue);
      const rules = list(object(object(run.tool).driver).rules).map(object);
      for (const value of list(run.results)) {
        const result = object(value),
          rule =
            rules.find((r) => r.id === result.ruleId) ??
            (typeof result.ruleIndex === 'number'
              ? rules[result.ruleIndex]
              : undefined) ??
            {};
        add({
          title:
            object(rule.shortDescription).text ??
            rule.name ??
            result.ruleId ??
            rule.id,
          id: result.ruleId ?? rule.id,
          risk:
            cvssSeverity(object(rule.properties)['security-severity']) ||
            result.level ||
            object(rule.defaultConfiguration).level,
          background:
            object(rule.fullDescription).text ??
            object(rule.fullDescription).markdown,
          remediation: object(rule.help).text ?? object(rule.help).markdown,
          observation:
            object(result.message).text ?? object(result.message).markdown,
          hosts: list(result.locations)
            .map((v) => {
              const p = object(object(v).physicalLocation);
              return `${plain(object(p.artifactLocation).uri)}:${plain(object(p.region).startLine)}`;
            })
            .join('\n'),
          references: rule.helpUri,
        });
      }
    }
  }
  if (!findings.length)
    throw new Error(
      `No supported ${format} records found. Check the selected format and export type.`
    );
  return [...new Map(findings.map((f) => [importFingerprint(f), f])).values()];
}
