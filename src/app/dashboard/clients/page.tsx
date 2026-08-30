import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { ClientsClient } from './ClientsClient';
import { ClientDetailButton } from './ClientDetailButton';
import { formatPhone } from '@/lib/format';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const listParams = { sort, dir };
  const currentParams = { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError };
  const addHref = isAdmin
    ? buildPathQuery('/dashboard/clients', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/dashboard/clients', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/clients', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

  const validSortColumns = ['company', 'website', 'phoneNumber'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'company';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const orderBy: { company?: 'asc' | 'desc'; website?: 'asc' | 'desc'; phone?: 'asc' | 'desc' } =
    sortCol === 'phoneNumber' ? { phone: sortDir } : { [sortCol]: sortDir };

  const clients = await prisma.client.findMany({
    orderBy,
  });

  const sortHrefs = buildSortHrefs('/dashboard/clients', currentParams, sortCol, sortDir);

  const detailClient = detail ? clients.find((client) => client.id === detail) : undefined;
  const detailHrefs = detailClient ? buildDetailHrefs('/dashboard/clients', listParams, detailClient.id) : null;

  return (
    <>
      {detailClient ? (
        <ClientDetailButton
          client={detailClient}
          isAdmin={isAdmin}
          isDetailOpen
          isEditing={edit === '1'}
          showDeleteConfirm={deleteConfirm === '1'}
          showLink={false}
          detailHref={detailHrefs!.view}
          editHref={detailHrefs!.edit}
          deleteConfirmHref={detailHrefs!.deleteConfirm}
          viewHref={detailHrefs!.view}
          closeHref={listCloseHref}
          deleteError={deleteError}
          saveError={saveError}
          sort={sort}
          dir={dir}
        />
      ) : null}
      <ClientsClient
        isAdmin={isAdmin}
        addHref={addHref}
        showCreateModal={isAdmin && create === '1'}
        createCloseHref={createCloseHref}
      >
      <div className="glass-panel glass-panel--padded">
        {clients.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            {isAdmin ? (
              <>No clients yet. Click <strong style={{ color: 'var(--text-main)' }}>New Client</strong> to add one.</>
            ) : (
              'No clients yet.'
            )}
          </p>
        ) : (
        <table className="data-table">
          <colgroup>
            <col style={{ width: '200px' }} />
            <col style={{ width: '250px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <Link href={sortHrefs.href('company')} className="sort-link">Name{sortHrefs.icon('company')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('website')} className="sort-link">Website{sortHrefs.icon('website')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('phoneNumber')} className="sort-link">Phone{sortHrefs.icon('phoneNumber')}</Link>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id}>
                <td style={{ fontWeight: 500 }}>{client.company}</td>
                <td>{client.website || ''}</td>
                <td className="cell-numeric">{formatPhone(client.phone)}</td>
                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/dashboard/clients', listParams, { detail: client.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      </ClientsClient>
    </>
  );
}
