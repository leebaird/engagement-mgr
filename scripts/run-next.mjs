import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanIPv4Addresses } from './lan-ipv4.mjs';

const mode = process.argv[2];
if (mode !== 'dev' && mode !== 'start') {
  console.error('Usage: node scripts/run-next.mjs dev|start [...next args]');
  process.exit(1);
}

const extra = process.argv.slice(3);

function takeFlag(argv, names) {
  const remaining = [];
  let value;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const matched = names.find((name) => arg === name || arg.startsWith(`${name}=`));
    if (!matched) {
      remaining.push(arg);
      continue;
    }
    if (arg.startsWith(`${matched}=`)) {
      value = arg.slice(matched.length + 1);
      continue;
    }
    value = argv[i + 1];
    i += 1;
  }
  return { value, remaining };
}

const portResult = takeFlag(extra, ['-p', '--port']);
const hostResult = takeFlag(portResult.remaining, ['-H', '--hostname']);
const port = portResult.value || process.env.PORT || '3000';
const hostname = hostResult.value || '0.0.0.0';
const forwarded = hostResult.remaining;
const lan = lanIPv4Addresses();

function rewriteListenBanner(text) {
  if (lan.length === 0) {
    return text;
  }
  const [primary, ...rest] = lan;
  let out = text.replace(/http:\/\/0\.0\.0\.0(:\d+)?/g, (_match, portPart) => `http://${primary}${portPart ?? ''}`);
  if (rest.length > 0) {
    out = out.replace(/(- Network:\s+)(http:\/\/[^\s]+)/, (_full, label, url) => {
      const urlPort = url.match(/:(\d+)\s*$/)?.[1] ?? port;
      const extra = rest.map((ip) => `${label}http://${ip}:${urlPort}`).join('\n');
      return `${label}${url}\n${extra}`;
    });
  }
  return out;
}

const nextBin = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/.bin/next');
const child = spawn(nextBin, [mode, '-H', hostname, '-p', String(port), ...forwarded], {
  stdio: ['inherit', 'pipe', 'inherit'],
  env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' },
});

child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  process.stdout.write(rewriteListenBanner(chunk));
});

function shutDown(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on('SIGINT', () => shutDown('SIGINT'));
process.on('SIGTERM', () => shutDown('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
