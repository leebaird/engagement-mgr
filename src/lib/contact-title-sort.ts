const VP_RANK = 1;
const DIRECTOR_RANK = 3;
const LEAD_RANK = 5;

const CONTACT_TITLE_EXACT = new Map<string, number>([
  ['svp', 0],
  ['senior vice president', 0],
  ['senior vp', 0],
  ['sr vp', 0],
  ['sr. vp', 0],
  ['vp', VP_RANK],
  ['vice president', VP_RANK],
  ['ciso', 2],
  ['chief information security officer', 2],
  ['director', DIRECTOR_RANK],
  ['senior consultant', 4],
  ['sr consultant', 4],
  ['sr. consultant', 4],
]);

/** First matching rule wins. SVP is checked before VP, and VP before CISO. */
const CONTACT_TITLE_CONTAINS: { rank: number; pattern: RegExp }[] = [
  { rank: 0, pattern: /\bsvp\b|\bsenior vice president\b|\bsenior vp\b|\bsr\.?\s+vp\b/ },
  { rank: VP_RANK, pattern: /\bvp\b|\bvice president\b/ },
  { rank: 2, pattern: /\bciso\b|\bchief information security officer\b/ },
  { rank: DIRECTOR_RANK, pattern: /\bdirector\b/ },
  { rank: 4, pattern: /\bsenior consultant\b|\bsr\.?\s+consultant\b/ },
  { rank: LEAD_RANK, pattern: /\blead\b/ },
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

  if (rankA === VP_RANK || rankA === DIRECTOR_RANK || rankA === LEAD_RANK) {
    const byTitle = normalizeContactTitle(a.title).localeCompare(
      normalizeContactTitle(b.title),
      undefined,
      { sensitivity: 'base' }
    );
    if (byTitle !== 0) {
      return dir === 'asc' ? byTitle : -byTitle;
    }
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

export function sortContactsByClient<
  T extends { name: string; title: string | null; client: { company: string } },
>(contacts: T[], dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...contacts].sort((a, b) => {
    const byClient = a.client.company.localeCompare(b.client.company, undefined, {
      sensitivity: 'base',
    });
    if (byClient !== 0) return dir === 'asc' ? byClient : -byClient;
    return compareContactsByTitle(a, b);
  });
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