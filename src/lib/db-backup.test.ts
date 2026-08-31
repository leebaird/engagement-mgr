import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  assertExtractedPathsContained,
  assertZipEntriesSafe,
  extractBackupArchive,
  replaceDirectoryDuringOperation,
} from './db-backup';
import { MAX_SCREENSHOT_BYTES } from './validation/upload';

type TestZipEntry = {
  name: string;
  data?: Buffer;
  declaredSize?: number;
  externalAttributes?: number;
};

function makeZip(entries: TestZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data ?? Buffer.alloc(0);
    const declaredSize = entry.declaredSize ?? data.length;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(declaredSize, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(declaredSize, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(entry.externalAttributes ?? 0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, central, end]);
}

const databaseDump = {
  name: 'engagement-manager-backup/database.dump',
  data: Buffer.from('PGDMP'),
};

describe('backup archive validation', () => {
  it('accepts and extracts the expected dump and screenshot files with private modes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    const archive = makeZip([
      databaseDump,
      {
        name: 'engagement-manager-backup/uploads/11111111-1111-4111-8111-111111111111.png',
        data: Buffer.from('image'),
      },
    ]);
    const zipPath = join(root, 'safe.zip');
    try {
      await writeFile(zipPath, archive);
      await assert.doesNotReject(() => assertZipEntriesSafe(zipPath));
      await extractBackupArchive(archive, root);
      assert.equal(
        await readFile(join(root, 'engagement-manager-backup/database.dump'), 'utf8'),
        'PGDMP'
      );
      assert.equal(
        (await stat(join(root, 'engagement-manager-backup'))).mode & 0o777,
        0o700
      );
      assert.equal(
        (await stat(join(root, 'engagement-manager-backup/database.dump'))).mode & 0o777,
        0o600
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects traversal, absolute paths, symlinks, and unexpected legacy SQL', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      for (const [name, archive] of [
        ['traversal.zip', makeZip([{ name: '../evil.txt' }, databaseDump])],
        ['absolute.zip', makeZip([{ name: '/etc/evil.txt' }, databaseDump])],
        [
          'symlink.zip',
          makeZip([
            databaseDump,
            {
              name: 'engagement-manager-backup/uploads/11111111-1111-4111-8111-111111111111.png',
              externalAttributes: (0o120777 << 16) >>> 0,
            },
          ]),
        ],
        [
          'legacy-sql.zip',
          makeZip([{ name: 'engagement-manager-backup/database.sql', data: Buffer.from('\\! id') }]),
        ],
      ] as const) {
        const path = join(root, name);
        await writeFile(path, archive);
        await assert.rejects(() => assertZipEntriesSafe(path), /Invalid backup/);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects oversized screenshots and excessive compression ratios before extraction', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      const oversized = join(root, 'oversized.zip');
      await writeFile(
        oversized,
        makeZip([
          databaseDump,
          {
            name: 'engagement-manager-backup/uploads/11111111-1111-4111-8111-111111111111.jpg',
            data: Buffer.from('x'),
            declaredSize: MAX_SCREENSHOT_BYTES + 1,
          },
        ])
      );
      await assert.rejects(() => assertZipEntriesSafe(oversized), /screenshot size/);

      const bomb = join(root, 'bomb.zip');
      await writeFile(
        bomb,
        makeZip([{ ...databaseDump, data: Buffer.from('x'), declaredSize: 100 }])
      );
      await assert.rejects(() => assertZipEntriesSafe(bomb), /extraction limits/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extracted path validation', () => {
  it('rejects symlinks before restored uploads are installed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-test-'));
    try {
      const uploads = join(root, 'engagement-manager-backup', 'uploads');
      await mkdir(uploads, { recursive: true });
      await symlink('/etc/passwd', join(uploads, 'leak.png'));
      await assert.rejects(
        () => assertExtractedPathsContained(root),
        /archive contains symlinks/
      );
      assert.equal((await lstat(join(uploads, 'leak.png'))).isSymbolicLink(), true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('directory replacement', () => {
  it('restores the previous directory when the protected operation fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-swap-'));
    const current = join(root, 'uploads');
    const prepared = join(root, 'prepared');
    try {
      await mkdir(current);
      await mkdir(prepared);
      await writeFile(join(current, 'old.png'), 'old');
      await writeFile(join(prepared, 'new.png'), 'new');

      await assert.rejects(
        () =>
          replaceDirectoryDuringOperation(current, prepared, async () => {
            throw new Error('database restore failed');
          }),
        /database restore failed/
      );
      assert.equal(await readFile(join(current, 'old.png'), 'utf8'), 'old');
      await assert.rejects(() => lstat(join(current, 'new.png')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('restores the previous directory when a database commit fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-swap-'));
    const current = join(root, 'uploads');
    const prepared = join(root, 'prepared');
    const database = {
      $transaction: async (operation: () => Promise<void>) => {
        await operation();
        throw new Error('database commit failed');
      },
    };
    try {
      await mkdir(current);
      await mkdir(prepared);
      await writeFile(join(current, 'old.png'), 'old');
      await writeFile(join(prepared, 'new.png'), 'new');

      await assert.rejects(
        () =>
          replaceDirectoryDuringOperation(current, prepared, () =>
            database.$transaction(async () => {})
          ),
        /database commit failed/
      );
      assert.equal(await readFile(join(current, 'old.png'), 'utf8'), 'old');
      await assert.rejects(() => lstat(join(current, 'new.png')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps the prepared directory after the protected operation succeeds', async () => {
    const root = await mkdtemp(join(tmpdir(), 'em-backup-swap-'));
    const current = join(root, 'uploads');
    const prepared = join(root, 'prepared');
    try {
      await mkdir(current);
      await mkdir(prepared);
      await writeFile(join(current, 'old.png'), 'old');
      await writeFile(join(prepared, 'new.png'), 'new');

      await replaceDirectoryDuringOperation(current, prepared, async () => {});
      assert.equal(await readFile(join(current, 'new.png'), 'utf8'), 'new');
      await assert.rejects(() => lstat(join(current, 'old.png')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
