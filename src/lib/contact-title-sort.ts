const CONTACT_TITLE_EXACT = new Map<string, number>([
  ['vp', 0],
  ['vice president', 0],
  ['ciso', 1],
  ['chief information security officer', 1],
  ['director', 2],
  ['senior consultant', 3],
  ['sr consultant', 3],
  ['sr. consultant', 3],
]);

/** First matching rule wins; VP is checked before CISO so "VP and CISO" ranks at the top. */
const CONTACT_TITLE_CONTAINS: { rank: number; pattern: RegExp }[] = [
  { rank: 0, pattern: /\bvp\b|\bvice president\b/ },
  { rank: 1, pattern: /\bciso\b|\bchief information security officer\b/ },
  { rank: 2, pattern: /\bdirector\b/ },
  { rank: 3, pattern: /\bsenior consultant\b|\bsr\.?\s+consultant\b/ },
];

function normalizeContactTitle(title: string | null): string {
  return (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getContactTitleRank(title: string | null): number {
  const normalized = normalizeContactTitle(title);
  if (!normalized) return 999;

  const exact = CONTACT_TITLE_EXACT.get(normalized);
  if (exact !== undefined) return exact;

  for (const { rank, pattern } of CONTACT_TITLE_CONTAINS) {
    if (pattern.test(normalized)) return rank;
  }

  return 999;
}

export function compareContactsByTitle<T extends { name: string; title: string | null }>(
  a: T,
  b: T,
  dir: 'asc' | 'desc' = 'asc'
): number {
  const rankA = getContactTitleRank(a.title);
  const rankB = getContactTitleRank(b.title);

  if (rankA !== rankB) {
    return dir === 'asc' ? rankA - rankB : rankB - rankA;
  }

  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) {
    return dir === 'asc' ? byName : -byName;
  }

  const byTitle = normalizeContactTitle(a.title).localeCompare(
    normalizeContactTitle(b.title),
    undefined,
    { sensitivity: 'base' }
  );
  return dir === 'asc' ? byTitle : -byTitle;
}

export function sortContactsByTitle<T extends { name: string; title: string | null }>(
  contacts: T[],
  dir: 'asc' | 'desc' = 'asc'
): T[] {
  return [...contacts].sort((a, b) => compareContactsByTitle(a, b, dir));
}

export function sortContactIds(
  ids: string[],
  contacts: { id: string; name: string; title: string | null }[],
  dir: 'asc' | 'desc' = 'asc'
): string[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]));

  return [...ids]
    .filter((id) => byId.has(id))
    .sort((a, b) => compareContactsByTitle(byId.get(a)!, byId.get(b)!, dir));
}