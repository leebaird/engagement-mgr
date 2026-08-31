import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  assertScreenshotQuota,
  getScreenshotStorageUsage,
  MAX_SCREENSHOTS_PER_FINDING,
  MAX_SCREENSHOT_STORAGE_BYTES,
  ScreenshotQuotaError,
  withUploadsMaintenanceLock,
} from './screenshot-storage';

describe('screenshot storage quotas', () => {
  it('holds the shared session lock across upload and maintenance operations', async () => {
    const calls: unknown[][] = [];
    let released = false;
    const databasePool = {
      connect: async () => ({
        query: async (...args: unknown[]) => {
          calls.push(args);
          return { rows: [{ locked: true }] };
        },
        release: () => {
          released = true;
        },
      }),
    };

    const result = await withUploadsMaintenanceLock(
      async () => {
        calls.push(['operation']);
        return 'completed';
      },
      databasePool
    );
    assert.equal(result, 'completed');
    assert.equal(released, true);
    assert.deepEqual(calls, [
      ['SELECT pg_try_advisory_lock($1::integer) AS locked', [1_394_517_092]],
      ['operation'],
      ['SELECT pg_advisory_unlock($1::integer)', [1_394_517_092]],
    ]);
  });

  it('fails fast when database maintenance already holds the lock', async () => {
    let operationCalled = false;
    let released = false;
    const databasePool = {
      connect: async () => ({
        query: async () => ({ rows: [{ locked: false }] }),
        release: () => {
          released = true;
        },
      }),
    };

    await assert.rejects(
      () =>
        withUploadsMaintenanceLock(async () => {
          operationCalled = true;
        }, databasePool),
      /temporarily unavailable/
    );
    assert.equal(operationCalled, false);
    assert.equal(released, true);
  });

  it('accepts an upload below the global and per-finding limits', () => {
    assert.doesNotThrow(() =>
      assertScreenshotQuota({ storedBytes: 10, storedFiles: 1, findingFiles: 1, uploadBytes: 10 })
    );
  });

  it('rejects byte and per-finding quota overflows', () => {
    assert.throws(
      () =>
        assertScreenshotQuota({
          storedBytes: MAX_SCREENSHOT_STORAGE_BYTES,
          storedFiles: 1,
          findingFiles: 1,
          uploadBytes: 1,
        }),
      ScreenshotQuotaError
    );
    assert.throws(
      () =>
        assertScreenshotQuota({
          storedBytes: 0,
          storedFiles: MAX_SCREENSHOTS_PER_FINDING,
          findingFiles: MAX_SCREENSHOTS_PER_FINDING,
          uploadBytes: 1,
        }),
      ScreenshotQuotaError
    );
  });

  it('counts stored files and bytes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'em-screenshot-storage-'));
    try {
      await writeFile(join(directory, 'existing.png'), Buffer.alloc(20));
      assert.deepEqual(await getScreenshotStorageUsage(directory), {
        storedBytes: 20,
        storedFiles: 1,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
