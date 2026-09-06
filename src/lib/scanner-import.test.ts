import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  const adversarialExports: [string, ScannerFormat, string][] = [
    [
      'unmatched text delimiters',
      'Nuclei',
      JSON.stringify({ info: { name: '<'.repeat(1024 * 1024) } }),
    ],
    [
      'escaped text delimiters',
      'Nuclei',
      '{"info":{"name":"' + '\\u003c'.repeat(256 * 1024) + '"}}',
    ],
    ['incomplete XML tags', 'Burp', '<a'.repeat(512 * 1024)],
    ['incomplete CDATA sections', 'Burp', '<![CDATA['.repeat(100000)],
    ['incomplete document types', 'Burp', '<!DOCTYPE a ['.repeat(80000)],
    [
      'unmatched delimiters inside CDATA',
      'Burp',
      '<issues><issue><name><![CDATA[' +
        '<'.repeat(1024 * 1024) +
        ']]></name></issue></issues>',
    ],
  ];
  for (const [name, format, input] of adversarialExports)
    it(`rejects ${name} within the processing budget`, () => {
      // A separate process can interrupt synchronous parsing if ReDoS returns.
      const directory = mkdtempSync(join(tmpdir(), 'scanner-import-test-'));
      const inputPath = join(directory, 'input.json');
      writeFileSync(inputPath, JSON.stringify({ input, format }), { mode: 0o600 });
      try {
        const result = spawnSync(
          process.execPath,
          ['--import', 'tsx', '--eval', `
          const assert = require('node:assert/strict');
          const { readFileSync } = require('node:fs');
          const { parseScannerExport } = require('./src/lib/scanner-import.ts');
          const { input, format } = JSON.parse(readFileSync(process.argv[1], 'utf8'));
          assert.throws(() => parseScannerExport(input, format));
        `, inputPath],
          {
            encoding: 'utf8',
            timeout: 5000,
            killSignal: 'SIGKILL',
          }
        );
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  it('preserves markup stripping, unmatched text and one-pass entity decoding', () => {
    for (const [description, expected] of [
      ['<p>Details &amp; evidence</p>', 'Details & evidence'],
      ['<a<b>tail', 'tail'],
      ['x<<', 'x<<'],
      ['&lt;b&gt;x&lt;/b&gt;', '<b>x</b>'],
      ['&amp;lt;', '&lt;'],
      ['<b></b>'.repeat(20000) + 'Details', 'Details'],
    ]) {
      const input = JSON.parse(exports.Nuclei);
      input.info.description = description;
      assert.equal(
        parseScannerExport(JSON.stringify(input), 'Nuclei')[0].background,
        expected
      );
    }
  });
  it('preserves internal DTDs, quoted delimiters, comments and processing instructions', () => {
    const input = exports.Burp.replace(
      '<!ELEMENT issue ANY>',
      '<!ELEMENT issue ANY><!ATTLIST issue note CDATA "a > ] b"><!-- unmatched [ --><?note [ ?>'
    ).replace('<issues>', '<issues note="a > b"><!-- <fake> --><?note <fake> ?>');
    assert.deepEqual(
      parseScannerExport(input, 'Burp'),
      parseScannerExport(exports.Burp, 'Burp')
    );
  });
  it('enforces depth across all element names without counting inert content', () => {
    for (const name of ['a', '_a', 'é']) {
      const nested = (depth: number) =>
        `<${name}>`.repeat(depth) + `</${name}>`.repeat(depth);
      assert.throws(
        () => parseScannerExport(nested(64), 'Burp'),
        /No supported Burp records/
      );
      for (const prefix of [
        '',
        '<!--' + '</a>'.repeat(64) + '-->',
        '<?note ' + '</a>'.repeat(64) + '?>',
      ])
        assert.throws(
          () => parseScannerExport(prefix + nested(65), 'Burp'),
          /nesting is too deep/
        );
    }
    assert.throws(
      () => parseScannerExport(
        '<a><![CDATA[' + '</a>'.repeat(64) + ']]>' +
          '<a>'.repeat(64) + '</a>'.repeat(65),
        'Burp'
      ),
      /nesting is too deep/
    );
  });
  it('retains the XML element budget and ignores markup inside comments and CDATA', () => {
    for (const content of [
      '<!--' + '<fake>'.repeat(30001) + '-->',
      '<![CDATA[' + '<fake>'.repeat(30001) + ']]>',
    ])
      assert.throws(
        () => parseScannerExport(`<a>${content}</a>`, 'Burp'),
        /No supported Burp records/
      );
    assert.throws(
      () => parseScannerExport('<a>' + '<b/>'.repeat(29998) + '</a>', 'Burp'),
      /No supported Burp records/
    );
    assert.throws(
      () => parseScannerExport('<a>' + '<b/>'.repeat(29999) + '</a>', 'Burp'),
      /too many XML elements/
    );
  });
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
  it('bounds SARIF rule tables before repeated result resolution', () => {
    const sarif = {
      runs: [
        {
          tool: { driver: { rules: Array.from({ length: 10_001 }, () => ({})) } },
          results: Array.from({ length: 500 }, () => ({ ruleId: 'missing' })),
        },
      ],
    };
    assert.throws(
      () => parseScannerExport(JSON.stringify(sarif), 'SARIF'),
      /at most 10000 rules/
    );
    const excessiveLocations = JSON.parse(exports.SARIF);
    excessiveLocations.runs[0].results[0].locations = Array.from(
      { length: 101 },
      () => ({})
    );
    assert.throws(
      () => parseScannerExport(JSON.stringify(excessiveLocations), 'SARIF'),
      /at most 100 locations/
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
  it('imports Burp evidence that quotes an ENTITY payload inside CDATA', () => {
    const input = exports.Burp.replace(
      '<issueDetail>Observed</issueDetail>',
      '<issueDetail><![CDATA[Quoted XXE sample: <!ENTITY xxe SYSTEM "file:///etc/passwd">]]></issueDetail>'
    );
    const findings = parseScannerExport(input, 'Burp');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].title, 'TLS issue');
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
