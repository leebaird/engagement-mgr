import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { UsersClient } from './UsersClient';
import { UserDetailButton } from './UserDetailButton';
import { DatabaseResetModal } from './DatabaseResetModal';
import { DatabaseRestoreModal } from './DatabaseRestoreModal';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    create?: string;
    detail?: string;
    edit?: string;
    delete?: string;
    deleteError?: string;
    saveError?: string;
    db?: string;
    dbError?: string;
    dbMsg?: string;
  }>;
}) {
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError, db, dbError, dbMsg } = await searchParams;
  const listParams = { sort, dir };
  const addHref = buildPathQuery('/dashboard/users', listParams, { create: '1', detail: null, db: null, dbError: null, dbMsg: null });
  const createCloseHref = buildPathQuery('/dashboard/users', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/users', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });
  const dbCloseHref = buildPathQuery('/dashboard/users', listParams, { db: null, dbError: null });
  const restoreHref = buildPathQuery('/dashboard/users', listParams, { db: 'restore', dbError: null, dbMsg: null, detail: null, create: null });
  const resetHref = buildPathQuery('/dashboard/users', listParams, { db: 'reset', dbError: null, dbMsg: null, detail: null, create: null });
  const session = await getSession();
  if (session?.role !== 'Admin') {
    redirect('/dashboard');
  }

  const validSortColumns = ['username', 'role', 'lastLogin'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'username';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true, lastPasswordChange: true, lastLogin: true },
    orderBy: { [sortCol]: sortDir }
  });

  const adminCount = users.filter(u => u.role === 'Admin').length;

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/dashboard/users?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/dashboard/users?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const detailUser = detail ? users.find((user) => user.id === detail) : undefined;
  const detailHrefs = detailUser ? buildDetailHrefs('/dashboard/users', listParams, detailUser.id) : null;

  const dbMessage = dbMsg === 'restore' ? 'Database restored successfully.' : null;

  return (
    <>
      {db === 'reset' ? (
        <DatabaseResetModal
          closeHref={dbCloseHref}
          sort={sort}
          dir={dir}
          dbError={dbError}
        />
      ) : null}
      {db === 'restore' ? (
        <DatabaseRestoreModal
          closeHref={dbCloseHref}
          sort={sort}
          dir={dir}
          dbError={dbError}
        />
      ) : null}
      {detailUser ? (
        <UserDetailButton
          user={detailUser}
          isLastAdmin={detailUser.role === 'Admin' && adminCount <= 1}
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
      <UsersClient
        addHref={addHref}
        showCreateModal={create === '1'}
        createCloseHref={createCloseHref}
        restoreHref={restoreHref}
        resetHref={resetHref}
        dbMessage={dbMessage}
      >
      {users.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
          No users yet. Click <strong style={{ color: 'var(--text-main)' }}>New User</strong> to add one.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '188px' }}>
                <Link href={getSortHref('username')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Username{getSortIcon('username')}
                </Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '160px', textAlign: 'center' }}>
                <Link href={getSortHref('role')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Role{getSortIcon('role')}
                </Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '148px', textAlign: 'right' }}>
                <Link href={getSortHref('lastLogin')} style={{ color: 'inherit', textDecoration: 'none', display: 'block', textAlign: 'right' }}>
                  Last Login{getSortIcon('lastLogin')}
                </Link>
              </th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '188px' }} title={user.username}>{user.username}</td>
                <td style={{ padding: '0.75rem', width: '160px', textAlign: 'center' }}>
                  {user.role === 'Admin' ? (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: 'var(--sidebar-active-bg)',
                      color: 'var(--sidebar-active)',
                    }}>
                      Admin
                    </span>
                  ) : (
                    'User'
                  )}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '148px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : ''}
                </td>
                <td className="table-action-cell" style={{ width: '40px' }}>
                  <DetailEyeLink href={buildPathQuery('/dashboard/users', listParams, { detail: user.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </UsersClient>
    </>
  );
}
