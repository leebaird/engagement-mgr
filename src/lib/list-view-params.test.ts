import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCalendarDayCloseHref,
  buildCalendarDayHref,
  buildDetailHrefs,
  buildSortHrefs,
  parseCalendarDayKey,
  parseListPage,
} from './list-view-params';

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

describe('parseListPage', () => {
  it('accepts positive integer pages and rejects unbounded offsets', () => {
    assert.equal(parseListPage('2'), 2);
    assert.equal(parseListPage('0'), 1);
    assert.equal(parseListPage('-1'), 1);
    assert.equal(parseListPage('1.5'), 1);
    assert.equal(parseListPage('10001'), 1);
    assert.equal(parseListPage('not-a-page'), 1);
  });
});

describe('buildDetailHrefs', () => {
  it('keeps extra overlay params when switching finding modes', () => {
    const hrefs = buildDetailHrefs(
      '/dashboard/engagements',
      { sort: 'codeName' },
      'eng-1',
      { finding: 'f-1', findings: '1' },
    );

    assert.equal(
      hrefs.view,
      '/dashboard/engagements?sort=codeName&finding=f-1&findings=1&detail=eng-1',
    );
    assert.equal(
      hrefs.edit,
      '/dashboard/engagements?sort=codeName&finding=f-1&findings=1&detail=eng-1&edit=1',
    );
    assert.equal(hrefs.close, '/dashboard/engagements?sort=codeName');
  });
});

describe('calendar day params', () => {
  it('parses a valid calendar day key', () => {
    assert.equal(parseCalendarDayKey({ day: '2026-08-12' }), '2026-08-12');
  });

  it('rejects invalid calendar day keys', () => {
    assert.equal(parseCalendarDayKey({ day: '2026-13-01' }), null);
    assert.equal(parseCalendarDayKey({ day: '2026-02-30' }), null);
    assert.equal(parseCalendarDayKey({ day: '08-12-2026' }), null);
  });

  it('builds day picker hrefs that preserve the viewed month', () => {
    assert.equal(
      buildCalendarDayHref(2026, 7, '2026-08-12'),
      '/dashboard?year=2026&month=8&day=2026-08-12',
    );
    assert.equal(
      buildCalendarDayCloseHref(2026, 7),
      '/dashboard?year=2026&month=8',
    );
  });
});
