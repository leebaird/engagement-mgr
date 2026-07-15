import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { UsersClient } from './UsersClient';
import { UserDetailButton } from './UserDetailButton';
import { DatabaseBackupModal } from './DatabaseBackupModal';
import { DatabaseResetModal } from './DatabaseResetModal';
import { DatabaseRestoreModal } from './DatabaseRestoreModal';
import { formatBackupPathForDisplay, resolveBackupFilePath } from '@/lib/backup-path';
import { verifyBackupDownloadToken } from '@/lib/backup-download-token';

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
    backupFile?: string;
    backupToken?: string;
  }>;
}) {
  const {
    sort,
    dir,
    create,
    detail,
    edit,
    delete: deleteConfirm,
    deleteError,
    saveError,
    db,
    dbError,
    dbMsg,
    backupFile,
    backupToken,
  } = await searchParams;
  const listParams = { sort, dir };
  const currentParams = {
    sort,
    dir,
    create,
    detail,
    edit,
    delete: deleteConfirm,
    deleteError,
    saveError,
    db,
    dbError,
    dbMsg,
    backupFile,
    backupToken,
  };
  const clearBackupParams = { backupFile: null, backupToken: null } as const;
  const addHref = buildPathQuery('/dashboard/users', listParams, {
    create: '1',
    detail: null,
    db: null,
    dbError: null,
    dbMsg: null,
    ...clearBackupParams,
  });
  const createCloseHref = buildPathQuery('/dashboard/users', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/users', listParams, {
    detail: null,
    edit: null,
    delete: null,
    deleteError: null,
    saveError: null,
  });
  const dbCloseHref = buildPathQuery('/dashboard/users', listParams, { db: null, dbError: null });
  const backupHref = buildPathQuery('/dashboard/users', listParams, {
    db: 'backup',
    dbError: null,
    dbMsg: null,
    detail: null,
    create: null,
    ...clearBackupParams,
  });
  const restoreHref = buildPathQuery('/dashboard/users', listParams, {
    db: 'restore',
    dbError: null,
    dbMsg: null,
    detail: null,
    create: null,
    ...clearBackupParams,
  });
  const resetHref = buildPathQuery('/dashboard/users', listParams, {
    db: 'reset',
    dbError: null,
    dbMsg: null,
    detail: null,
    create: null,
    ...clearBackupParams,
  });
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

  const sortHrefs = buildSortHrefs('/dashboard/users', currentParams, sortCol, sortDir);

  const detailUser = detail ? users.find((user) => user.id === detail) : undefined;
  const detailHrefs = detailUser ? buildDetailHrefs('/dashboard/users', listParams, detailUser.id) : null;

  const safeBackupFile =
    backupFile && resolveBackupFilePath(backupFile) ? backupFile : null;
  const downloadTokenOk =
    !!safeBackupFile &&
    !!backupToken &&
    (await verifyBackupDownloadToken(backupToken, session.userId, safeBackupFile));
  const backupDownloadHref =
    downloadTokenOk && safeBackupFile && backupToken
      ? `/api/db/backup?file=${encodeURIComponent(safeBackupFile)}&token=${encodeURIComponent(backupToken)}`
      : null;
  const backupSavedPath = safeBackupFile
    ? formatBackupPathForDisplay(resolveBackupFilePath(safeBackupFile)!)
    : null;

  let dbMessage: string | null = null;
  if (dbMsg === 'restore') {
    dbMessage = 'Database restored successfully.';
  } else if (dbMsg === 'backup' && backupSavedPath) {
    dbMessage = downloadTokenOk
      ? `Backup created at ${backupSavedPath}. Download link expires in 5 minutes.`
      : `Backup created at ${backupSavedPath}.`;
  } else if (dbMsg === 'backup') {
    dbMessage = 'Backup created successfully.';
  }

  return (
    <>
      {db === 'backup' ? (
        <DatabaseBackupModal
          closeHref={dbCloseHref}
          sort={sort}
          dir={dir}
          dbError={dbError}
        />
      ) : null}
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
        backupHref={backupHref}
        restoreHref={restoreHref}
        resetHref={resetHref}
        dbMessage={dbMessage}
        backupDownloadHref={backupDownloadHref}
      >
      {users.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
          No users yet. Click <strong style={{ color: 'var(--text-main)' }}>New User</strong> to add one.
        </p>
      ) : (
        <table className="data-table">
          <colgroup>
            <col style={{ width: '188px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '148px' }} />
            <col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <Link href={sortHrefs.href('username')} className="sort-link">
                  Username{sortHrefs.icon('username')}
                </Link>
              </th>
              <th style={{ textAlign: 'center' }}>
                <Link href={sortHrefs.href('role')} className="sort-link">
                  Role{sortHrefs.icon('role')}
                </Link>
              </th>
              <th style={{ textAlign: 'right' }}>
                <Link href={sortHrefs.href('lastLogin')} className="sort-link" style={{ display: 'block', textAlign: 'right' }}>
                  Last Login{sortHrefs.icon('lastLogin')}
                </Link>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user.username}>{user.username}</td>
                <td style={{ textAlign: 'center' }}>
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
                <td className="cell-numeric" style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : ''}
                </td>
                <td className="table-action-cell">
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
