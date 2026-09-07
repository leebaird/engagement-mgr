import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isSameOriginLoginRequest,
  MAX_LOGIN_REQUEST_BYTES,
  readLoginForm,
} from './login-request';

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://app.example.test/api/auth/login', {
    method: 'POST',
    body,
    headers: {
      origin: 'https://app.example.test',
      host: 'app.example.test',
      'content-type': 'application/x-www-form-urlencoded',
      ...headers,
    },
  });
}

describe('login request boundary', () => {
  it('accepts a small same-origin URL-encoded login', async () => {
    const form = await readLoginForm(request('username=admin&password=secret'));
    assert.equal(form.get('username'), 'admin');
    assert.equal(form.get('password'), 'secret');
  });

  it('rejects oversized bodies even when Content-Length is absent', async () => {
    const input = request(`username=admin&password=${'x'.repeat(MAX_LOGIN_REQUEST_BYTES)}`);
    input.headers.delete('content-length');
    await assert.rejects(readLoginForm(input), /too large/);
  });

  it('rejects declared oversized bodies before reading them', async () => {
    await assert.rejects(
      readLoginForm(request('username=admin', { 'content-length': String(MAX_LOGIN_REQUEST_BYTES + 1) })),
      /too large/
    );
  });

  it('rejects cross-origin and multipart submissions', async () => {
    assert.equal(
      isSameOriginLoginRequest(request('x=1', { origin: 'https://attacker.example' })),
      false
    );
    await assert.rejects(
      readLoginForm(request('x=1', { 'content-type': 'multipart/form-data; boundary=x' })),
      /content type/
    );
  });

  it('uses the forwarded host only behind an explicitly trusted proxy', () => {
    const input = request('x=1', {
      host: '127.0.0.1:3000',
      'x-forwarded-host': 'app.example.test',
    });
    assert.equal(isSameOriginLoginRequest(input, true), true);
    assert.equal(isSameOriginLoginRequest(input, false), false);
    input.headers.set('origin', 'https://attacker.example');
    assert.equal(isSameOriginLoginRequest(input, true), false);
    input.headers.set('x-forwarded-host', 'attacker.example');
    assert.equal(isSameOriginLoginRequest(input, false), false);
  });

  it('preserves direct hosts and ports and rejects ambiguous forwarded hosts', () => {
    assert.equal(isSameOriginLoginRequest(request('x=1'), true), true);
    const input = request('x=1', {
      origin: 'https://app.example.test:8443',
      host: '127.0.0.1:3000',
      'x-forwarded-host': 'app.example.test:8443',
    });
    assert.equal(isSameOriginLoginRequest(input, true), true);
    for (const host of ['', 'app.example.test', 'app.example.test:8443, attacker.example',
      'https://app.example.test:8443', 'user@app.example.test:8443', 'app.example.test:8443/path']) {
      input.headers.set('x-forwarded-host', host);
      assert.equal(isSameOriginLoginRequest(input, true), false, host);
    }
  });
});
