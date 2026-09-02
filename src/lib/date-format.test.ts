import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDate,
  formatDateTime,
  formatMonthYear,
  parseDateFormatId,
  parseTimeZoneId,
  toDisplayDate,
} from './date-format';

describe('parseDateFormatId', () => {
  it('accepts known format ids and defaults to os', () => {
    assert.equal(parseDateFormatId('os'), 'os');
    assert.equal(parseDateFormatId('mdy'), 'mdy');
    assert.equal(parseDateFormatId('dmy'), 'dmy');
    assert.equal(parseDateFormatId('ymd'), 'ymd');
    assert.equal(parseDateFormatId('nope'), 'os');
    assert.equal(parseDateFormatId(undefined), 'os');
  });
});

describe('parseTimeZoneId', () => {
  it('accepts UTC and defaults to the operating system', () => {
    assert.equal(parseTimeZoneId('utc'), 'utc');
    assert.equal(parseTimeZoneId('os'), 'os');
    assert.equal(parseTimeZoneId('Europe/London'), 'os');
    assert.equal(parseTimeZoneId(undefined), 'os');
  });
});

describe('toDisplayDate', () => {
  it('parses YYYY-MM-DD as a local calendar date', () => {
    const date = toDisplayDate('2026-08-12');
    assert.ok(date);
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 7);
    assert.equal(date.getDate(), 12);
  });

  it('rejects invalid calendar dates', () => {
    assert.equal(toDisplayDate('2026-02-30'), null);
    assert.equal(toDisplayDate(''), null);
  });
});

describe('formatDate', () => {
  const date = new Date(2026, 7, 12);

  it('formats month/day/year and day/month/year and iso', () => {
    assert.equal(formatDate(date, 'mdy'), '8/12/2026');
    assert.equal(formatDate(date, 'dmy'), '12/08/2026');
    assert.equal(formatDate(date, 'ymd'), '2026-08-12');
  });

  it('formats a date-only key without shifting the day', () => {
    assert.equal(formatDate('2026-08-12', 'ymd'), '2026-08-12');
    assert.equal(formatDate('2026-08-12', 'dmy'), '12/08/2026');
  });

  it('formats UTC-midnight calendar DateTimes as the stored day', () => {
    const stored = new Date('2026-08-12T00:00:00.000Z');
    assert.equal(formatDate(stored, 'ymd', true), '2026-08-12');
    assert.equal(formatDate(stored, 'dmy', true), '12/08/2026');
    assert.equal(formatDate(stored, 'mdy', true), '8/12/2026');
    assert.equal(formatDate('2026-08-12T00:00:00.000Z', 'ymd', true), '2026-08-12');
  });
});

describe('formatDateTime', () => {
  it('includes a time component', () => {
    const date = new Date(2026, 7, 12, 14, 5);
    const text = formatDateTime(date, 'ymd');
    assert.match(text, /2026-08-12/);
    assert.match(text, /14:05|2:05/);
  });

  it('formats absolute timestamps in UTC when selected', () => {
    const text = formatDateTime('2026-08-12T23:05:00.000-07:00', 'ymd', 'utc');
    assert.match(text, /2026-08-13/);
    assert.match(text, /0?6:05/);
  });

  it('does not shift stored calendar dates when UTC is selected', () => {
    assert.equal(formatDate('2026-08-12', 'ymd', true, 'utc'), '2026-08-12');
  });
});

describe('formatMonthYear', () => {
  it('returns a month name and year', () => {
    const text = formatMonthYear(2026, 7, 'mdy');
    assert.match(text, /August/);
    assert.match(text, /2026/);
  });
});
