import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { createUploadFilePath, resolveUploadFilePath } from './uploads-path';

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
