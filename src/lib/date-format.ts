import { toDateInputValue } from '@/lib/date-input-value';

export const DATE_FORMAT_STORAGE_KEY = 'em-date-format';
export const TIME_ZONE_STORAGE_KEY = 'em-time-zone';

export type DateFormatId = 'os' | 'mdy' | 'dmy' | 'ymd';
export type TimeZoneId = 'os' | 'utc';

export const DATE_FORMAT_OPTIONS: { id: DateFormatId; label: string }[] = [
  { id: 'os', label: 'Operating system' },
  { id: 'mdy', label: '8/12/2026' },
  { id: 'dmy', label: '12/08/2026' },
  { id: 'ymd', label: '2026-08-12' },
];

export const TIME_ZONE_OPTIONS: { id: TimeZoneId; label: string }[] = [
  { id: 'os', label: 'Operating system' },
  { id: 'utc', label: 'UTC' },
];

export function parseDateFormatId(value: unknown): DateFormatId {
  if (value === 'os' || value === 'mdy' || value === 'dmy' || value === 'ymd') return value;
  return 'os';
}

export function parseTimeZoneId(value: unknown): TimeZoneId {
  return value === 'utc' ? 'utc' : 'os';
}

function parseLocalDateKey(value: string): Date | null {
  const keyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!keyMatch) return null;
  const year = Number(keyMatch[1]);
  const month = Number(keyMatch[2]);
  const day = Number(keyMatch[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function toDisplayDate(
  value: string | Date | null | undefined,
  dateOnly = false,
): Date | null {
  if (value == null || value === '') return null;

  if (dateOnly) {
    return parseLocalDateKey(toDateInputValue(value));
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseLocalDateKey(value);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localeFor(format: DateFormatId): string | undefined {
  if (format === 'os') return undefined;
  if (format === 'dmy') return 'en-GB';
  if (format === 'ymd') return 'sv-SE';
  return 'en-US';
}

function timeZoneFor(timeZone: TimeZoneId): string | undefined {
  return timeZone === 'utc' ? 'UTC' : undefined;
}

export function formatDate(
  value: string | Date | null | undefined,
  format: DateFormatId,
  dateOnly = false,
  timeZone: TimeZoneId = 'os',
): string {
  const date = toDisplayDate(value, dateOnly);
  if (!date) return '';
  return date.toLocaleDateString(localeFor(format), {
    timeZone: dateOnly ? undefined : timeZoneFor(timeZone),
  });
}

export function formatDateTime(
  value: string | Date | null | undefined,
  format: DateFormatId,
  timeZone: TimeZoneId = 'os',
): string {
  const date = toDisplayDate(value);
  if (!date) return '';
  const locale = localeFor(format);
  const zone = timeZoneFor(timeZone);
  const datePart = date.toLocaleDateString(locale, { timeZone: zone });
  const timePart = date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
  });
  return `${datePart} - ${timePart}`.replace(/[\u00A0\u202F]/g, ' ');
}

export function formatMonthYear(year: number, month: number, format: DateFormatId): string {
  return new Date(year, month, 1).toLocaleDateString(localeFor(format), {
    month: 'long',
    year: 'numeric',
  });
}
