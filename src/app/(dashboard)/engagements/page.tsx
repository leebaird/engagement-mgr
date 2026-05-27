import { prisma } from '@/lib/db';
import Link from 'next/link';
import { EngagementsClient } from './EngagementsClient';
import { EngagementDetailButton } from './EngagementDetailButton';

export default async function EngagementsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['codeName', 'client', 'type', 'startDate'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'codeName';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  let orderBy: any = { [sortCol]: sortDir };
  if (sortCol === 'client') {
    orderBy = { client: { company: sortDir } };
  }

  const engagements = await prisma.engagement.findMany({
    include: { client: true, trustedAgents: true, operators: true, contacts: true },
    orderBy: orderBy
  });

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
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Focus</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('type')} style={{ color: 'inherit', textDecoration: 'none' }}>Type{getSortIcon('type')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('startDate')} style={{ color: 'inherit', textDecoration: 'none' }}>Start{getSortIcon('startDate')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>End</th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {engagements.map(eng => (
              <tr key={eng.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{eng.codeName}</td>
                <td style={{ padding: '0.75rem' }}>{eng.client.company}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                  {eng.status ? eng.status.charAt(0).toUpperCase() + eng.status.slice(1).toLowerCase() : '-'}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.focus || '-'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.type ? eng.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '-'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.startDate?.toLocaleDateString() || '-'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{eng.endDate?.toLocaleDateString() || '-'}</td>
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
