import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { assertExtractedPathsContained, assertZipEntriesSafe } from './db-backup';

/** Minimal single-entry zip (empty stored file) so unsafe names like `../` survive. */
function makeSingleEntryZip(name: string): Buffer {
  const nameBuf = Buffer.from(name);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(nameBuf.length, 26);
  const local = Buffer.concat([localHeader, nameBuf]);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4); // version made by
  centralHeader.writeUInt16LE(20, 6); // version needed
  centralHeader.writeUInt16LE(nameBuf.length, 28);
  centralHeader.writeUInt32LE(0, 42); // local header offset
  const central = Buffer.concat([centralHeader, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8); // entries on this disk
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(local.length, 16); // central dir offset

  return Buffer.concat([local, central, eocd]);
}

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

describe('backup archive entry validation (pre-extraction)', () => {
  it('accepts archives with safe relative entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      const zipPath = join(root, 'safe.zip');
      await writeFile(zipPath, makeSingleEntryZip('engagement-manager-backup/database.sql'));

      await assert.doesNotReject(() => assertZipEntriesSafe(zipPath));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects archives with parent-directory traversal entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      const zipPath = join(root, 'traversal.zip');
      await writeFile(zipPath, makeSingleEntryZip('../evil.txt'));

      await assert.rejects(
        () => assertZipEntriesSafe(zipPath),
        /archive contains unsafe paths/
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects archives with absolute path entries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      const zipPath = join(root, 'absolute.zip');
      await writeFile(zipPath, makeSingleEntryZip('/etc/evil.txt'));

      await assert.rejects(
        () => assertZipEntriesSafe(zipPath),
        /archive contains unsafe paths/
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
