import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSortHrefs } from './list-view-params';

describe('buildSortHrefs', () => {
  it('toggles direction for the active column', () => {
    const sortHrefs = buildSortHrefs('/dashboard/clients', { sort: 'company', dir: 'asc' }, 'company', 'asc');

    assert.equal(sortHrefs.href('company'), '/dashboard/clients?sort=company&dir=desc');
  });

  it('preserves existing query params while sorting', () => {
    const sortHrefs = buildSortHrefs(
      '/dashboard/clients',
      { sort: 'company', dir: 'asc', detail: 'client-1', edit: '1' },
      'company',
      'asc',
    );

    assert.equal(sortHrefs.href('website'), '/dashboard/clients?detail=client-1&edit=1&sort=website&dir=asc');
  });

  it('returns icons only for the active column', () => {
    const ascSortHrefs = buildSortHrefs('/dashboard/clients', { sort: 'company', dir: 'asc' }, 'company', 'asc');
    const descSortHrefs = buildSortHrefs('/dashboard/clients', { sort: 'company', dir: 'desc' }, 'company', 'desc');

    assert.equal(ascSortHrefs.icon('company'), ' ↑');
    assert.equal(descSortHrefs.icon('company'), ' ↓');
    assert.equal(ascSortHrefs.icon('website'), null);
  });
});