import { toDateInputValue } from '@/lib/date-input-value';

export const DATE_FORMAT_STORAGE_KEY = 'em-date-format';

export type DateTimeFormatId = 'os' | 'mdy' | 'dmy' | 'ymd';

export const DATE_FORMAT_OPTIONS: { id: DateTimeFormatId; label: string }[] = [
  { id: 'os', label: 'Operating system' },
  { id: 'mdy', label: '8/12/2026' },
  { id: 'dmy', label: '12/08/2026' },
  { id: 'ymd', label: '2026-08-12' },
];

export function parseDateTimeFormatId(value: unknown): DateTimeFormatId {
  if (value === 'os' || value === 'mdy' || value === 'dmy' || value === 'ymd') return value;
  return 'os';
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

function localeFor(format: DateTimeFormatId): string | undefined {
  if (format === 'os') return undefined;
  if (format === 'dmy') return 'en-GB';
  if (format === 'ymd') return 'sv-SE';
  return 'en-US';
}

export function formatDate(
  value: string | Date | null | undefined,
  format: DateTimeFormatId,
  dateOnly = false,
): string {
  const date = toDisplayDate(value, dateOnly);
  if (!date) return '';
  return date.toLocaleDateString(localeFor(format));
}

export function formatDateTime(
  value: string | Date | null | undefined,
  format: DateTimeFormatId,
): string {
  const date = toDisplayDate(value);
  if (!date) return '';
  return date.toLocaleString(localeFor(format), {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMonthYear(year: number, month: number, format: DateTimeFormatId): string {
  return new Date(year, month, 1).toLocaleDateString(localeFor(format), {
    month: 'long',
    year: 'numeric',
  });
}
