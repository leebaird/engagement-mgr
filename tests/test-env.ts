import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const envFile = join(__dirname, '..', '.env');

/**
 * A test-only setting from the environment or the project .env. Only the named key is read,
 * so the application's DATABASE_URL and secrets never enter test processes.
 */
export function testSetting(
  name: 'REPORTING_TEST_DATABASE_URL' | 'REPORTING_TEST_BROWSER'
): string | undefined {
  if (process.env[name]) return process.env[name];
  return existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8'))[name] : undefined;
}
