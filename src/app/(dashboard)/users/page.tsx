import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { UsersClient } from './UsersClient';
import { UserDetailButton } from './UserDetailButton';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;
  const session = await getSession();
  if (session?.role !== 'ADMIN') {
    redirect('/');
  }

  const validSortColumns = ['username', 'role', 'lastLogin'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'username';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true, lastPasswordChange: true, lastLogin: true },
    orderBy: { [sortCol]: sortDir }
  });

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

  return (
    <UsersClient>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.25rem', color: 'var(--text-muted)', width: '188px' }}>
                <Link href={getSortHref('username')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Username{getSortIcon('username')}
                </Link>
              </th>
              <th style={{ padding: '0.25rem', color: 'var(--text-muted)', width: '160px', textAlign: 'center' }}>
                <Link href={getSortHref('role')} style={{ color: 'inherit', textDecoration: 'none' }}>
                  Role{getSortIcon('role')}
                </Link>
              </th>
              <th style={{ padding: '0.25rem', color: 'var(--text-muted)', width: '148px', textAlign: 'right' }}>
                <Link href={getSortHref('lastLogin')} style={{ color: 'inherit', textDecoration: 'none', display: 'block', textAlign: 'right' }}>
                  Last Login{getSortIcon('lastLogin')}
                </Link>
              </th>
              <th style={{ padding: '0.25rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '188px' }} title={user.username}>{user.username}</td>
                <td style={{ padding: '0.25rem', width: '160px', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: user.role === 'ADMIN' ? 'var(--sidebar-active-bg)' : 'rgba(255,255,255,0.1)',
                    color: user.role === 'ADMIN' ? 'var(--sidebar-active)' : 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    {user.role === 'ADMIN' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td style={{ padding: '0.25rem', color: 'var(--text-muted)', width: '148px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : ''}
                </td>
                <td style={{ padding: '0.25rem', display: 'flex', justifyContent: 'flex-end', width: '40px' }}>
                  <UserDetailButton user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </UsersClient>
  );
}
