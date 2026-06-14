import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { buildPathQuery } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { UsersClient } from './UsersClient';
import { UserDetailButton } from './UserDetailButton';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string }>;
}) {
  const { sort, dir, create, detail } = await searchParams;
  const listParams = { sort, dir };
  const addHref = buildPathQuery('/users', listParams, { create: '1', detail: null });
  const createCloseHref = buildPathQuery('/users', listParams, { create: null });
  const listCloseHref = buildPathQuery('/users', listParams, { detail: null });
  const session = await getSession();
  if (session?.role !== 'Admin') {
    redirect('/');
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
      return `/users?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/users?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const detailUser = detail ? users.find((user) => user.id === detail) : undefined;

  return (
    <>
      {detailUser ? (
        <UserDetailButton
          user={detailUser}
          isLastAdmin={detailUser.role === 'Admin' && adminCount <= 1}
          isDetailOpen
          showLink={false}
          detailHref={buildPathQuery('/users', listParams, { detail: detailUser.id, create: null })}
          closeHref={listCloseHref}
        />
      ) : null}
      <UsersClient
        addHref={addHref}
        showCreateModal={create === '1'}
        createCloseHref={createCloseHref}
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
                  <DetailEyeLink href={buildPathQuery('/users', listParams, { detail: user.id, create: null })} />
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