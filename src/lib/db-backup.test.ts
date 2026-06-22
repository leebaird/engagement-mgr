import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { assertExtractedPathsContained } from './db-backup';

describe('backup archive path validation', () => {
  it('accepts regular extracted files under the restore directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      await mkdir(join(root, 'engagement-manager-backup', 'uploads'), { recursive: true });
      await writeFile(join(root, 'engagement-manager-backup', 'uploads', 'image.png'), 'png');

      await assert.doesNotReject(() => assertExtractedPathsContained(root));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects symlinks before restored uploads are copied', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      const uploadsDir = join(root, 'engagement-manager-backup', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      await symlink('/etc/passwd', join(uploadsDir, 'leak.png'));

      await assert.rejects(
        () => assertExtractedPathsContained(root),
        /archive contains symlinks/
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
