import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPgToolsConnection } from './require-admin';

describe('getPgToolsConnection', () => {
  it('keeps the password out of argv while preserving PostgreSQL options', () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL =
      'postgresql://db_user:p%40ss%3Aword@db.example:5433/engagements?schema=private&sslmode=require';
    try {
      const connection = getPgToolsConnection();
      assert.equal(
        connection.connectionUrl,
        'postgresql://db_user@db.example:5433/engagements?sslmode=require'
      );
      assert.equal(
        connection.pgPassLine,
        'db.example:5433:engagements:db_user:p@ss\\:word'
      );
      assert.equal(connection.connectionUrl.includes('p%40ss'), false);
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it('uses the unbracketed IPv6 host expected by pgpass', () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL =
      'postgresql://db_user:secret@[::1]:5432/engagements';
    try {
      const connection = getPgToolsConnection();
      assert.equal(connection.connectionUrl, 'postgresql://db_user@[::1]:5432/engagements');
      assert.equal(connection.pgPassLine, '\\:\\:1:5432:engagements:db_user:secret');
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
