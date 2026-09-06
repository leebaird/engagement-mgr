export type SearchParamRecord = Record<string, string | string[] | undefined>;

export function buildDetailHrefs(
  pathname: string,
  listParams: SearchParamRecord,
  id: string,
  extra: SearchParamRecord = {},
) {
  const shared = { ...extra, detail: id, create: null };
  const extraKeys = new Set(Object.keys(extra));
  const clearExtra = Object.fromEntries(
    Object.keys(extra).map((key) => [key, null]),
  ) as Record<string, null>;
  const clearModal = Object.fromEntries(
    Object.entries({
      edit: null,
      delete: null,
      deleteError: null,
      saveError: null,
      schedule: null,
      scheduleEdit: null,
      scheduleError: null,
      findings: null,
      createFinding: null,
    }).filter(([key]) => !extraKeys.has(key)),
  ) as Record<string, null>;

  return {
    view: buildPathQuery(pathname, listParams, { ...shared, ...clearModal }),
    edit: buildPathQuery(pathname, listParams, { ...shared, ...clearModal, edit: '1' }),
    deleteConfirm: buildPathQuery(pathname, listParams, { ...shared, ...clearModal, delete: '1' }),
    schedule: buildPathQuery(pathname, listParams, { ...shared, ...clearModal, schedule: '1' }),
    scheduleEdit: buildPathQuery(pathname, listParams, { ...shared, ...clearModal, schedule: '1', scheduleEdit: '1' }),
    close: buildPathQuery(pathname, listParams, { detail: null, ...clearModal, ...clearExtra }),
  };
}

export function buildPathQuery(
  pathname: string,
  current: SearchParamRecord,
  updates: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'string' && !(key in updates)) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value != null && value !== '') {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildSortHrefs(
  pathname: string,
  current: SearchParamRecord,
  activeCol: string,
  activeDir: 'asc' | 'desc',
) {
  return {
    href: (col: string) => buildPathQuery(pathname, current, {
      sort: col,
      dir: activeCol === col && activeDir === 'asc' ? 'desc' : 'asc',
      page: null,
    }),
    icon: (col: string) => (activeCol !== col ? null : activeDir === 'asc' ? ' ↑' : ' ↓'),
  };
}

export function parseListPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 10_000 ? page : 1;
}

export function parseCalendarView(
  searchParams: SearchParamRecord,
  today = new Date(),
): { viewYear: number; viewMonth: number } {
  const parsedYear = Number(searchParams.year);
  const parsedMonth = Number(searchParams.month);

  const viewYear = Number.isInteger(parsedYear) && parsedYear >= 1970 && parsedYear <= 2100
    ? parsedYear
    : today.getFullYear();
  const viewMonth = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth - 1
    : today.getMonth();

  return { viewYear, viewMonth };
}

export function buildEngagementScheduleHref(engagementId: string) {
  return buildPathQuery('/dashboard/engagements', {}, { detail: engagementId, schedule: '1' });
}

export function buildCalendarNavHrefs(viewYear: number, viewMonth: number) {
  const prev = new Date(viewYear, viewMonth - 1, 1);
  const next = new Date(viewYear, viewMonth + 1, 1);

  return {
    prevHref: buildPathQuery('/dashboard', {}, {
      year: String(prev.getFullYear()),
      month: String(prev.getMonth() + 1),
    }),
    nextHref: buildPathQuery('/dashboard', {}, {
      year: String(next.getFullYear()),
      month: String(next.getMonth() + 1),
    }),
    todayHref: '/dashboard',
  };
}

const CALENDAR_DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDayKey(searchParams: SearchParamRecord): string | null {
  const raw = typeof searchParams.day === 'string' ? searchParams.day : '';
  const match = CALENDAR_DAY_KEY.exec(raw);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return raw;
}

export function buildCalendarDayHref(viewYear: number, viewMonth: number, dateKey: string) {
  return buildPathQuery('/dashboard', {
    year: String(viewYear),
    month: String(viewMonth + 1),
  }, { day: dateKey });
}

export function buildCalendarDayCloseHref(viewYear: number, viewMonth: number) {
  return buildPathQuery('/dashboard', {}, {
    year: String(viewYear),
    month: String(viewMonth + 1),
  });
}
