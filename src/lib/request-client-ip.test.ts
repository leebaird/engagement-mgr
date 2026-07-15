import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTrustProxyEnabled, resolveClientIp } from './request-client-ip';

describe('isTrustProxyEnabled', () => {
  it('is disabled by default', () => {
    assert.equal(isTrustProxyEnabled({}), false);
    assert.equal(isTrustProxyEnabled({ TRUST_PROXY: '' }), false);
    assert.equal(isTrustProxyEnabled({ TRUST_PROXY: '0' }), false);
    assert.equal(isTrustProxyEnabled({ TRUST_PROXY: 'false' }), false);
  });

  it('accepts common truthy values', () => {
    assert.equal(isTrustProxyEnabled({ TRUST_PROXY: '1' }), true);
    assert.equal(isTrustProxyEnabled({ TRUST_PROXY: 'true' }), true);
    assert.equal(isTrustProxyEnabled({ TRUST_PROXY: 'YES' }), true);
  });
});

describe('resolveClientIp', () => {
  it('ignores proxy headers when trustProxy is false', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: false,
        forwardedFor: '203.0.113.50',
        realIp: '198.51.100.10',
      }),
      'direct'
    );
  });

  it('uses the first X-Forwarded-For hop when trustProxy is true', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: true,
        forwardedFor: '203.0.113.50, 10.0.0.1',
        realIp: '198.51.100.10',
      }),
      '203.0.113.50'
    );
  });

  it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: true,
        forwardedFor: null,
        realIp: '198.51.100.10',
      }),
      '198.51.100.10'
    );
  });

  it('returns unknown when trusted proxy headers are empty', () => {
    assert.equal(
      resolveClientIp({
        trustProxy: true,
        forwardedFor: '  , ',
        realIp: null,
      }),
      'unknown'
    );
    assert.equal(
      resolveClientIp({
        trustProxy: true,
        forwardedFor: null,
        realIp: null,
      }),
      'unknown'
    );
  });
});
