import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

async function dashboardPages(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await dashboardPages(path)));
    } else if (entry.name === 'page.tsx') {
      paths.push(path);
    }
  }
  return paths;
}

describe('dashboard page authorization', () => {
  it('requires a current database-backed session in every dashboard page', async () => {
    const pages = await dashboardPages(join(process.cwd(), 'src/app/dashboard'));
    assert.ok(pages.length > 0);

    for (const page of pages) {
      const source = await readFile(page, 'utf8');
      assert.match(source, /await requireDashboardSession\(\)/, page);
    }
  });
});
