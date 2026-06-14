import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { buildPathQuery } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { ClientsClient } from './ClientsClient';
import { ClientDetailButton } from './ClientDetailButton';
import { formatPhone } from '@/lib/format';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';
  const { sort, dir, create, detail } = await searchParams;
  const listParams = { sort, dir };
  const addHref = isAdmin
    ? buildPathQuery('/clients', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/clients', listParams, { create: null });
  const listCloseHref = buildPathQuery('/clients', listParams, { detail: null });

  const validSortColumns = ['company', 'website', 'phoneNumber'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'company';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  let orderBy: { company?: 'asc' | 'desc'; website?: 'asc' | 'desc'; phone?: 'asc' | 'desc' } =
    sortCol === 'phoneNumber' ? { phone: sortDir } : { [sortCol]: sortDir };

  const clients = await prisma.client.findMany({
    orderBy,
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

  const detailClient = detail ? clients.find((client) => client.id === detail) : undefined;

  return (
    <ClientsClient
      isAdmin={isAdmin}
      addHref={addHref}
      showCreateModal={isAdmin && create === '1'}
      createCloseHref={createCloseHref}
    >
      {detailClient ? (
        <ClientDetailButton
          client={detailClient}
          isAdmin={isAdmin}
          isDetailOpen
          showLink={false}
          detailHref={buildPathQuery('/clients', listParams, { detail: detailClient.id, create: null })}
          closeHref={listCloseHref}
        />
      ) : null}
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
                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/clients', listParams, { detail: client.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ClientsClient>
  );
}
