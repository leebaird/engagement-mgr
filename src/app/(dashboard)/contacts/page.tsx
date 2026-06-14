import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { ContactsClient } from './ContactsClient';
import { ContactDetailButton } from './ContactDetailButton';
import { formatPhone } from '@/lib/format';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const listParams = { sort, dir };
  const addHref = isAdmin
    ? buildPathQuery('/contacts', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/contacts', listParams, { create: null });
  const listCloseHref = buildPathQuery('/contacts', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

  const validSortColumns = ['name', 'title', 'email', 'phoneNumber', 'client'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  type ContactOrderBy = NonNullable<Parameters<typeof prisma.contact.findMany>[0]>['orderBy'];

  let orderBy: ContactOrderBy;
  if (sortCol === 'client') {
    orderBy = { client: { company: sortDir } };
  } else if (sortCol === 'phoneNumber') {
    orderBy = { phone: sortDir };
  } else if (sortCol === 'name') {
    orderBy = { name: sortDir };
  } else if (sortCol === 'title') {
    orderBy = { title: sortDir };
  } else {
    orderBy = { email: sortDir };
  }

  const contacts = await prisma.contact.findMany({
    include: { client: true },
    orderBy,
  });
  const clients = await prisma.client.findMany({ orderBy: { company: 'asc' } });

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/contacts?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/contacts?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const detailContact = detail ? contacts.find((contact) => contact.id === detail) : undefined;
  const detailHrefs = detailContact ? buildDetailHrefs('/contacts', listParams, detailContact.id) : null;

  return (
    <>
      {detailContact ? (
        <ContactDetailButton
          contact={detailContact}
          clients={clients}
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
      <ContactsClient
        clients={clients}
        isAdmin={isAdmin}
        addHref={addHref}
        showCreateModal={isAdmin && create === '1'}
        createCloseHref={createCloseHref}
      >
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '170px' }}>
                <Link href={getSortHref('name')} style={{ color: 'inherit', textDecoration: 'none' }}>Name{getSortIcon('name')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '170px' }}>
                <Link href={getSortHref('title')} style={{ color: 'inherit', textDecoration: 'none' }}>Title{getSortIcon('title')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('client')} style={{ color: 'inherit', textDecoration: 'none' }}>Company{getSortIcon('client')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '180px' }}>
                <Link href={getSortHref('email')} style={{ color: 'inherit', textDecoration: 'none' }}>Email{getSortIcon('email')}</Link>
              </th>
              <th style={{ padding: '0.75rem 0.75rem 0.75rem 3rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('phoneNumber')} style={{ color: 'inherit', textDecoration: 'none' }}>Phone{getSortIcon('phoneNumber')}</Link>
              </th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500, width: '170px' }}>{c.name}</td>
                <td style={{ padding: '0.75rem', width: '170px' }}>{c.title || ''}</td>
                <td style={{ padding: '0.75rem' }}>{c.client.company}</td>
                <td style={{ padding: '0.75rem' }}>{c.email || ''}</td>
                <td style={{ padding: '0.75rem 0.75rem 0.75rem 3rem', fontVariantNumeric: 'tabular-nums' }}>{formatPhone(c.phone)}</td>
                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/contacts', listParams, { detail: c.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </ContactsClient>
    </>
  );
}
