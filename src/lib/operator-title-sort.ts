const OPERATOR_TITLE_ORDER = [
  'Director',
  'Red Team Lead',
  'Senior Red Team Operator',
  'Red Team Operator',
  'Junior Red Team Operator',
  'Intern',
] as const;

const titleRank = new Map(
  OPERATOR_TITLE_ORDER.map((title, index) => [title.toLowerCase(), index])
);

function normalizeOperatorTitle(title: string | null): string {
  return (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function compareOperatorsByTitle<T extends { name: string; title: string | null }>(
  a: T,
  b: T,
  dir: 'asc' | 'desc' = 'asc'
): number {
  const rankA = titleRank.get(normalizeOperatorTitle(a.title)) ?? 999;
  const rankB = titleRank.get(normalizeOperatorTitle(b.title)) ?? 999;

  if (rankA !== rankB) {
    return dir === 'asc' ? rankA - rankB : rankB - rankA;
  }

  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? byName : -byName;
}

export function sortOperatorsByTitle<T extends { name: string; title: string | null }>(
  operators: T[],
  dir: 'asc' | 'desc' = 'asc'
): T[] {
  return [...operators].sort((a, b) => compareOperatorsByTitle(a, b, dir));
}

export function sortOperatorIds(
  ids: string[],
  operators: { id: string; name: string; title: string | null }[],
  dir: 'asc' | 'desc' = 'asc'
): string[] {
  const byId = new Map(operators.map((operator) => [operator.id, operator]));

  return [...ids]
    .filter((id) => byId.has(id))
    .sort((a, b) => compareOperatorsByTitle(byId.get(a)!, byId.get(b)!, dir));
}