export type SearchParamRecord = Record<string, string | string[] | undefined>;

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

export function parseCalendarView(
  searchParams: SearchParamRecord,
  today = new Date(),
): { viewYear: number; viewMonth: number } {
  const parsedYear = Number(searchParams.year);
  const parsedMonth = Number(searchParams.month);

  const viewYear = Number.isInteger(parsedYear) ? parsedYear : today.getFullYear();
  const viewMonth = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth - 1
    : today.getMonth();

  return { viewYear, viewMonth };
}

export function buildCalendarNavHrefs(viewYear: number, viewMonth: number) {
  const prev = new Date(viewYear, viewMonth - 1, 1);
  const next = new Date(viewYear, viewMonth + 1, 1);

  return {
    prevHref: buildPathQuery('/', {}, {
      year: String(prev.getFullYear()),
      month: String(prev.getMonth() + 1),
    }),
    nextHref: buildPathQuery('/', {}, {
      year: String(next.getFullYear()),
      month: String(next.getMonth() + 1),
    }),
    todayHref: '/',
  };
}