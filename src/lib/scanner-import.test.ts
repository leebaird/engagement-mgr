import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  importFingerprint,
  parseScannerExport,
  type ScannerFormat,
} from './scanner-import';

const exports: Record<ScannerFormat, string> = {
  Burp: '<?xml version="1.0"?><!DOCTYPE issues [<!ELEMENT issues (issue*)><!ELEMENT issue ANY>]><issues><issue><type>123</type><name>TLS issue</name><severity>High</severity><host>https://example.test</host><path>/login</path><issueBackground><![CDATA[<p>Details &amp; evidence</p>]]></issueBackground><issueDetail>Observed</issueDetail><remediationBackground>Fix</remediationBackground></issue></issues>',
  Nessus:
    '<NessusClientData_v2><Report><ReportHost name="example.test"><ReportItem pluginID="123" pluginName="TLS issue" severity="3" port="443" protocol="tcp"><description>Details</description><solution>Fix</solution><plugin_output>Observed</plugin_output></ReportItem></ReportHost></Report></NessusClientData_v2>',
  Nmap: '<!DOCTYPE nmaprun><nmaprun><host><address addr="192.0.2.1"/><ports><port portid="443" protocol="tcp"><state state="open"/><service name="https"/></port><port portid="22" protocol="tcp"><state state="closed"/></port></ports></host></nmaprun>',
  OpenVAS:
    '<get_reports_response><report><report><results><result><name>TLS issue</name><severity>8.0</severity><host>example.test</host><port>443/tcp</port><description>Observed</description><solution>Fix</solution><nvt oid="123"><tags>Details</tags></nvt></result></results></report></report></get_reports_response>',
  ZAP: JSON.stringify({
    site: [
      {
        '@name': 'https://example.test',
        alerts: [
          {
            name: 'TLS issue',
            pluginid: '123',
            riskcode: '3',
            desc: 'Details',
            solution: 'Fix',
            instances: [
              { uri: 'https://example.test/login', evidence: 'Observed' },
            ],
          },
        ],
      },
    ],
  }),
  Nuclei: JSON.stringify({
    'template-id': 'tls-issue',
    info: {
      name: 'TLS issue',
      severity: 'high',
      description: 'Details',
      remediation: 'Fix',
    },
    'matched-at': 'https://example.test',
    'extracted-results': ['Observed'],
  }),
  Qualys:
    '<SCAN><IP value="192.0.2.1"><VULNS><CAT><VULN number="123" severity="4"><TITLE>TLS issue</TITLE><DIAGNOSIS>Details</DIAGNOSIS><SOLUTION>Fix</SOLUTION><RESULT>Observed</RESULT></VULN></CAT></VULNS></IP></SCAN>',
  SARIF: JSON.stringify({
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            rules: [
              {
                id: '123',
                shortDescription: { text: 'TLS issue' },
                fullDescription: { text: 'Details' },
                help: { text: 'Fix' },
              },
            ],
          },
        },
        results: [
          {
            ruleId: '123',
            level: 'error',
            message: { text: 'Observed' },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: 'src/app.ts' },
                  region: { startLine: 12 },
                },
              },
            ],
          },
        ],
      },
    ],
  }),
};

describe('scanner export imports', () => {
  it('preserves SARIF security scores and rule-index locations without guessing missing scores', () => {
    const sarif = JSON.parse(exports.SARIF);
    sarif.runs[0].tool.driver.rules[0].properties = {
      'security-severity': '9.8',
    };
    delete sarif.runs[0].results[0].ruleId;
    sarif.runs[0].results[0].ruleIndex = 0;
    const finding = parseScannerExport(JSON.stringify(sarif), 'SARIF')[0];
    assert.equal(finding.severity, 'Critical');
    assert.equal(finding.sourceId, '123');
    assert.equal(finding.affectedHosts, 'src/app.ts:12');
    assert.equal(
      parseScannerExport(
        exports.OpenVAS.replace('<severity>8.0</severity>', ''),
        'OpenVAS'
      )[0].severity,
      ''
    );
  });
  for (const [format, input] of Object.entries(exports))
    it(`imports ${format} with its native severity and evidence`, () => {
      const findings = parseScannerExport(input, format as ScannerFormat);
      assert.equal(findings.length, 1);
      assert.equal(findings[0].severity, format === 'Nmap' ? 'Info' : 'High');
      assert.ok(findings[0].affectedHosts);
      assert.ok(findings[0].observation);
      assert.equal(findings[0].source, format);
    });
  it('rejects file/HTTP external entities, external DTDs, malformed XML and excessive nesting', () => {
    for (const input of [
      '<!DOCTYPE issues SYSTEM "file:///etc/passwd"><issues/>',
      '<!DOCTYPE issues [<!ENTITY x SYSTEM "http://127.0.0.1/secret">]><issues>&x;</issues>',
      '<issues><issue></issues>',
      '<a>'.repeat(65) + '</a>'.repeat(65),
    ])
      assert.throws(() => parseScannerExport(input, 'Burp'));
  });
  it('bounds bytes, result counts and field lengths', () => {
    assert.throws(() =>
      parseScannerExport('x'.repeat(2 * 1024 * 1024 + 1), 'Burp')
    );
    assert.throws(() =>
      parseScannerExport(Array(501).fill(exports.Nuclei).join('\n'), 'Nuclei')
    );
    assert.throws(() =>
      parseScannerExport(
        exports.Nessus.replace('Observed', 'x'.repeat(10001)),
        'Nessus'
      )
    );
  });
  it('deduplicates repeated scanner identities without combining different affected targets', () => {
    assert.equal(
      parseScannerExport(`${exports.Nuclei}\n${exports.Nuclei}`, 'Nuclei')
        .length,
      1
    );
    const finding = parseScannerExport(exports.Nuclei, 'Nuclei')[0];
    assert.notEqual(
      importFingerprint(finding),
      importFingerprint({ ...finding, affectedHosts: 'different.test' })
    );
  });
  it('does not treat Nmap closed ports as findings or infer vulnerabilities from open ports', () => {
    const finding = parseScannerExport(exports.Nmap, 'Nmap')[0];
    assert.match(finding.title, /443/);
    assert.equal(finding.severity, 'Info');
  });
});
