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
const MAX_SARIF_RUNS = 50;
const MAX_SARIF_RULES_PER_RUN = 10_000;
const MAX_SARIF_RESULTS_PER_RUN = 500;
const MAX_SARIF_LOCATIONS_PER_RESULT = 100;
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
  const parts: string[] = [];
  let offset = 0;
  let start = text.indexOf('<');
  while (start !== -1) {
    const end = text.indexOf('>', start + 1);
    if (end === -1) break;
    parts.push(text.slice(offset, start), ' ');
    offset = end + 1;
    start = text.indexOf('<', offset);
  }
  parts.push(text.slice(offset));
  return parts
    .join('')
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

function prepareXml(text: string): string {
  const parts: string[] = [];
  let copied = 0;
  let offset = 0;
  let depth = 0;
  let tags = 0;
  while (offset < text.length) {
    const start = text.indexOf('<', offset);
    if (start === -1) break;
    const terminator = text.startsWith('<!--', start)
      ? '-->'
      : text.startsWith('<![CDATA[', start)
        ? ']]>'
        : text.startsWith('<?', start)
          ? '?>'
          : null;
    if (terminator) {
      const end = text.indexOf(terminator, start + 2);
      if (end === -1) throw new Error('Invalid XML export.');
      offset = end + terminator.length;
      continue;
    }
    const doctype = text.slice(start, start + 9).toUpperCase() === '<!DOCTYPE';
    let quote = '';
    let subsetDepth = 0;
    let end = start + 1;
    for (; end < text.length; end++) {
      const char = text[end];
      if (quote) {
        if (char === quote) quote = '';
      } else if (
        doctype && (text.startsWith('<!--', end) || text.startsWith('<?', end))
      ) {
        const terminator = text.startsWith('<!--', end) ? '-->' : '?>';
        const contentEnd = text.indexOf(terminator, end + 2);
        if (contentEnd === -1) throw new Error('Invalid XML export.');
        end = contentEnd + terminator.length - 1;
      } else if (char === '"' || char === "'") quote = char;
      else if (doctype && char === '[') subsetDepth++;
      else if (doctype && char === ']') subsetDepth--;
      else if (char === '>' && subsetDepth === 0) break;
    }
    if (end === text.length) throw new Error('Invalid XML export.');
    offset = end + 1;
    if (doctype) {
      const declaration = text.slice(start, offset);
      if (/<!ENTITY/i.test(declaration) || /\bSYSTEM\b|\bPUBLIC\b|%/i.test(declaration))
        throw new Error('Entity declarations are not allowed.');
      if (
        !/^<!DOCTYPE\s+[A-Za-z_][\w:.-]*\s*(?:\[[\s\S]*\]\s*)?>$/i.test(declaration)
      )
        throw new Error('External or malformed DTDs are not allowed.');
      parts.push(text.slice(copied, start));
      copied = offset;
      continue;
    }
    if (++tags > 30000) throw new Error('Export has too many XML elements.');
    if (text.startsWith('</', start)) depth--;
    else if (text[end - 1] !== '/' && ++depth > 64)
      throw new Error('Export nesting is too deep.');
  }
  parts.push(text.slice(copied));
  return parts.join('');
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
    text = prepareXml(text);
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
    const runs = list(root.runs);
    if (runs.length > MAX_SARIF_RUNS)
      throw new Error(`SARIF can contain at most ${MAX_SARIF_RUNS} runs.`);
    for (const runValue of runs) {
      const run = object(runValue);
      const rules = list(object(object(run.tool).driver).rules).map(object);
      const results = list(run.results);
      if (rules.length > MAX_SARIF_RULES_PER_RUN)
        throw new Error(
          `Each SARIF run can contain at most ${MAX_SARIF_RULES_PER_RUN} rules.`
        );
      if (results.length > MAX_SARIF_RESULTS_PER_RUN)
        throw new Error(
          `Each SARIF run can contain at most ${MAX_SARIF_RESULTS_PER_RUN} results.`
        );
      const rulesById = new Map<string, Node>();
      for (const rule of rules) {
        if (typeof rule.id === 'string' && !rulesById.has(rule.id)) {
          rulesById.set(rule.id, rule);
        }
      }
      for (const value of results) {
        const result = object(value);
        const locations = list(result.locations);
        if (locations.length > MAX_SARIF_LOCATIONS_PER_RESULT)
          throw new Error(
            `Each SARIF result can contain at most ${MAX_SARIF_LOCATIONS_PER_RESULT} locations.`
          );
        const rule =
          (typeof result.ruleId === 'string'
            ? rulesById.get(result.ruleId)
            : undefined) ??
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
          hosts: locations
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
