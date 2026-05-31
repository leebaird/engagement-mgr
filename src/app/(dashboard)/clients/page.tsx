import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ClientsClient } from './ClientsClient';
import { ClientDetailButton } from './ClientDetailButton';
import { formatPhone } from '@/lib/format';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['company', 'website', 'phoneNumber'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'company';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const clients = await prisma.client.findMany({ 
    orderBy: { [sortCol]: sortDir } 
  });

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/clients?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/clients?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <ClientsClient>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '200px' }}>
                <Link href={getSortHref('company')} style={{ color: 'inherit', textDecoration: 'none' }}>Name{getSortIcon('company')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '250px' }}>
                <Link href={getSortHref('website')} style={{ color: 'inherit', textDecoration: 'none' }}>Website{getSortIcon('website')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '180px' }}>
                <Link href={getSortHref('phoneNumber')} style={{ color: 'inherit', textDecoration: 'none' }}>Phone{getSortIcon('phoneNumber')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: 'auto', minWidth: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{client.company}</td>
                <td style={{ padding: '0.75rem' }}>{client.website || ''}</td>
                <td style={{ padding: '0.75rem' }}>{formatPhone(client.phone)}</td>
                <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <ClientDetailButton client={client} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ClientsClient>
  );
}
