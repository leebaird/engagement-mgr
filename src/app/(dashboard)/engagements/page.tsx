import { prisma } from '@/lib/db';
import Link from 'next/link';
import { EngagementsClient } from './EngagementsClient';
import { EngagementDetailButton } from './EngagementDetailButton';

function formatEngagementType(type: string): string {
  return type
    .split('_')
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper === 'AI' || upper === 'USB') return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export default async function EngagementsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['codeName', 'client', 'status', 'focus', 'type', 'startTesting', 'endTesting'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'codeName';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const statusOrder: Record<string, number> = {
    Prep: 1,
    Recon: 2,
    Testing: 3,
    Reporting: 4,
    Complete: 5,
  };

  type EngagementOrderBy = NonNullable<Parameters<typeof prisma.engagement.findMany>[0]>['orderBy'];

  let orderBy: EngagementOrderBy | undefined;
  if (sortCol === 'client') {
    orderBy = { client: { company: sortDir } };
  } else if (sortCol === 'status') {
    orderBy = undefined;
  } else if (sortCol === 'codeName') {
    orderBy = { codeName: sortDir };
  } else if (sortCol === 'focus') {
    orderBy = { focus: sortDir };
  } else if (sortCol === 'type') {
    orderBy = { type: sortDir };
  } else if (sortCol === 'startTesting') {
    orderBy = { startTesting: sortDir };
  } else {
    orderBy = { endTesting: sortDir };
  }

  let engagements = await prisma.engagement.findMany({
    include: {
      client: true,
      trustedAgents: true,
      operators: true,
      contacts: true,
      findings: {
        include: {
          engagementContext: true,
        },
        orderBy: { title: 'asc' },
      },
    },
    orderBy,
  });

  if (sortCol === 'status') {
    engagements.sort((a, b) => {
      const valA = a.status ? statusOrder[a.status] ?? 99 : 100;
      const valB = b.status ? statusOrder[b.status] ?? 99 : 100;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/engagements?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/engagements?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const clients = await prisma.client.findMany({ orderBy: { company: 'asc' } });
  const contacts = await prisma.contact.findMany({ orderBy: { name: 'asc' } });
  const operators = await prisma.operator.findMany({ orderBy: { name: 'asc' } });

  return (
    <EngagementsClient clients={clients} contacts={contacts} operators={operators}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('codeName')} style={{ color: 'inherit', textDecoration: 'none' }}>Code Name{getSortIcon('codeName')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('client')} style={{ color: 'inherit', textDecoration: 'none' }}>Client{getSortIcon('client')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('status')} style={{ color: 'inherit', textDecoration: 'none' }}>Status{getSortIcon('status')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('focus')} style={{ color: 'inherit', textDecoration: 'none' }}>Focus{getSortIcon('focus')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('type')} style={{ color: 'inherit', textDecoration: 'none' }}>Type{getSortIcon('type')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('startTesting')} style={{ color: 'inherit', textDecoration: 'none' }}>Start{getSortIcon('startTesting')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('endTesting')} style={{ color: 'inherit', textDecoration: 'none' }}>End{getSortIcon('endTesting')}</Link>
              </th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {engagements.map(eng => (
              <tr key={eng.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{eng.codeName}</td>
                <td style={{ padding: '0.75rem' }}>{eng.client.company}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                  {eng.status ?? ''}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.focus || ''}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.type ? formatEngagementType(eng.type) : ''}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.startTesting?.toLocaleDateString() || ''}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.endTesting?.toLocaleDateString() || ''}</td>
                <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <EngagementDetailButton engagement={eng} clients={clients} contacts={contacts} operators={operators} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EngagementsClient>
  );
}
