export type EngagementScheduleValues = {
  startPrep: string;
  endPrep: string;
  startRecon: string;
  endRecon: string;
  startTesting: string;
  endTesting: string;
  startReporting: string;
  endReporting: string;
  outbrief: string;
};

const SCHEDULE_DATE_FIELDS = [
  'startPrep',
  'endPrep',
  'startRecon',
  'endRecon',
  'startTesting',
  'endTesting',
  'startReporting',
  'endReporting',
  'outbrief',
] as const;

type ScheduleDateSource = {
  startPrep?: string | Date | null;
  endPrep?: string | Date | null;
  startRecon?: string | Date | null;
  endRecon?: string | Date | null;
  startTesting?: string | Date | null;
  endTesting?: string | Date | null;
  startReporting?: string | Date | null;
  endReporting?: string | Date | null;
  outbrief?: string | Date | null;
};

/** Format a stored schedule/calendar date for `<input type="date">` (YYYY-MM-DD). */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (value == null) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return formatUtcDateParts(value);
  }

  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';

  return formatUtcDateParts(parsed);
}

function formatUtcDateParts(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function engagementToScheduleValues(engagement: ScheduleDateSource): EngagementScheduleValues {
  return {
    startPrep: toDateInputValue(engagement.startPrep),
    endPrep: toDateInputValue(engagement.endPrep),
    startRecon: toDateInputValue(engagement.startRecon),
    endRecon: toDateInputValue(engagement.endRecon),
    startTesting: toDateInputValue(engagement.startTesting),
    endTesting: toDateInputValue(engagement.endTesting),
    startReporting: toDateInputValue(engagement.startReporting),
    endReporting: toDateInputValue(engagement.endReporting),
    outbrief: toDateInputValue(engagement.outbrief),
  };
}

/** Serialize Prisma schedule dates for stable server → client props. */
export function serializeEngagementScheduleDates<T extends ScheduleDateSource>(engagement: T): T {
  const serialized = { ...engagement };
  for (const field of SCHEDULE_DATE_FIELDS) {
    const value = engagement[field];
    serialized[field] = value instanceof Date ? value.toISOString() : value ?? null;
  }
  return serialized;
}