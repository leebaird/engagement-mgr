import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { createUploadFilePath, resolveUploadFilePath, resolveUploadsDirectory } from './uploads-path';

const uploadsDir = resolve(process.cwd(), 'uploads');

describe('upload path helpers', () => {
  it('creates only allowed screenshot paths inside uploads', () => {
    const upload = createUploadFilePath('png');

    assert.ok(upload);
    assert.match(upload.fileName, /^[0-9a-f-]+\.png$/);
    assert.ok(upload.absolutePath.startsWith(`${uploadsDir}/`));
  });

  it('rejects unsupported upload extensions', () => {
    assert.equal(createUploadFilePath('svg'), null);
    assert.equal(createUploadFilePath('../png'), null);
  });

  it('rejects traversal and null-byte filenames when resolving uploads', () => {
    assert.equal(resolveUploadFilePath('../secret.png'), null);
    assert.equal(resolveUploadFilePath('nested/secret.png'), null);
    assert.equal(resolveUploadFilePath('secret.png\0.jpg'), null);
  });

  it('resolves safe basenames inside uploads', () => {
    assert.equal(resolveUploadFilePath('safe.png'), resolve(uploadsDir, 'safe.png'));
  });
});

describe('resolveUploadsDirectory', () => {
  const appRoot = '/srv/engagement-mgr';

  it('defaults to uploads/ and resolves relative folders from the application root', () => {
    assert.equal(resolveUploadsDirectory(undefined, appRoot), '/srv/engagement-mgr/uploads');
    assert.equal(resolveUploadsDirectory(' ', appRoot), '/srv/engagement-mgr/uploads');
    assert.equal(resolveUploadsDirectory('.browser-test-uploads', appRoot), '/srv/engagement-mgr/.browser-test-uploads');
    assert.equal(resolveUploadsDirectory('/var/lib/evidence', appRoot), '/var/lib/evidence');
  });

  it('refuses the application folder, its parents and the filesystem root', () => {
    for (const setting of ['.', './', '..', '/', '/srv', appRoot]) {
      assert.throws(() => resolveUploadsDirectory(setting, appRoot), /dedicated folder/, setting);
    }
  });
});
