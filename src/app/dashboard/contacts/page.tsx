import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { ContactsClient } from './ContactsClient';
import { ContactDetailButton } from './ContactDetailButton';
import { formatPhone } from '@/lib/format';
import { sortContactsByTitle } from '@/lib/contact-title-sort';

export default async function ContactsPage({
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
    ? buildPathQuery('/dashboard/contacts', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/dashboard/contacts', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/contacts', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

  const validSortColumns = ['name', 'title', 'email', 'phoneNumber', 'client'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  type ContactOrderBy = NonNullable<Parameters<typeof prisma.contact.findMany>[0]>['orderBy'];
  let orderBy: ContactOrderBy | undefined;
  if (sortCol === 'title') {
    orderBy = undefined;
  } else if (sortCol === 'client') {
    orderBy = { client: { company: sortDir } };
  } else if (sortCol === 'phoneNumber') {
    orderBy = { phone: sortDir };
  } else if (sortCol === 'name') {
    orderBy = { name: sortDir };
  } else {
    orderBy = { email: sortDir };
  }

  // Single query (title sort finishes in memory)
  const contactsRaw = await prisma.contact.findMany({
    include: { client: true },
    orderBy,
  });
  const contacts =
    sortCol === 'title' ? sortContactsByTitle(contactsRaw, sortDir) : contactsRaw;

  const needsClients = (isAdmin && create === '1') || Boolean(detail);
  const clients = needsClients
    ? await prisma.client.findMany({ orderBy: { company: 'asc' } })
    : [];

  const sortHrefs = buildSortHrefs('/dashboard/contacts', currentParams, sortCol, sortDir);

  const detailContact = detail ? contacts.find((contact) => contact.id === detail) : undefined;
  const detailHrefs = detailContact ? buildDetailHrefs('/dashboard/contacts', listParams, detailContact.id) : null;

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
        {contacts.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            {isAdmin ? (
              <>No contacts yet. Click <strong style={{ color: 'var(--text-main)' }}>New Contact</strong> to add one.</>
            ) : (
              'No contacts yet.'
            )}
          </p>
        ) : (
        <table className="data-table">
          <colgroup>
            <col style={{ width: '170px' }} />
            <col style={{ width: '170px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <Link href={sortHrefs.href('name')} className="sort-link">Name{sortHrefs.icon('name')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('title')} className="sort-link">Title{sortHrefs.icon('title')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('client')} className="sort-link">Company{sortHrefs.icon('client')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('email')} className="sort-link">Email{sortHrefs.icon('email')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('phoneNumber')} className="sort-link">Phone{sortHrefs.icon('phoneNumber')}</Link>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td>{c.title || ''}</td>
                <td>{c.client.company}</td>
                <td>{c.email || ''}</td>
                <td className="cell-numeric">{formatPhone(c.phone)}</td>
                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/dashboard/contacts', listParams, { detail: c.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      </ContactsClient>
    </>
  );
}
