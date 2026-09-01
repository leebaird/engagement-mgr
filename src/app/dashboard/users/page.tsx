import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Upload, Download, Trash2 } from 'lucide-react';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { DisplayDate } from '@/components/DateFormatProvider';
import { UsersClient } from './UsersClient';
import { UserDetailButton } from './UserDetailButton';
import { DatabaseBackupModal } from './DatabaseBackupModal';
import { DatabaseResetModal } from './DatabaseResetModal';
import { DatabaseRestoreModal } from './DatabaseRestoreModal';
import { formatBackupPathForDisplay, resolveBackupFilePath } from '@/lib/backup-path';
import { requireDashboardSession } from '@/lib/require-auth';

type AdminTab = 'users' | 'database';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    tab?: string;
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
  }>;
}) {
  const {
    sort,
    dir,
    tab,
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
  } = await searchParams;
  const listParams = { sort, dir };
  const currentParams = {
    sort,
    dir,
    tab,
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
  };
  const clearBackupParams = { backupFile: null } as const;
  const addHref = buildPathQuery('/dashboard/users', listParams, {
    create: '1',
    detail: null,
    tab: null,
    db: null,
    dbError: null,
    dbMsg: null,
    ...clearBackupParams,
  });
  const createCloseHref = buildPathQuery('/dashboard/users', listParams, { create: null, tab: null });
  const listCloseHref = buildPathQuery('/dashboard/users', listParams, {
    detail: null,
    edit: null,
    delete: null,
    deleteError: null,
    saveError: null,
    tab: null,
  });
  const dbCloseHref = buildPathQuery('/dashboard/users', listParams, {
    db: null,
    dbError: null,
    tab: 'database',
  });
  const backupHref = buildPathQuery('/dashboard/users', listParams, {
    db: 'backup',
    dbError: null,
    dbMsg: null,
    detail: null,
    create: null,
    tab: 'database',
    ...clearBackupParams,
  });
  const restoreHref = buildPathQuery('/dashboard/users', listParams, {
    db: 'restore',
    dbError: null,
    dbMsg: null,
    detail: null,
    create: null,
    tab: 'database',
    ...clearBackupParams,
  });
  const resetHref = buildPathQuery('/dashboard/users', listParams, {
    db: 'reset',
    dbError: null,
    dbMsg: null,
    detail: null,
    create: null,
    tab: 'database',
    ...clearBackupParams,
  });
  const clearTabParams = {
    create: null,
    detail: null,
    edit: null,
    delete: null,
    deleteError: null,
    saveError: null,
    db: null,
    dbError: null,
    dbMsg: null,
    ...clearBackupParams,
  } as const;
  const usersTabHref = buildPathQuery('/dashboard/users', listParams, {
    ...clearTabParams,
    tab: null,
  });
  const databaseTabHref = buildPathQuery('/dashboard/users', listParams, {
    ...clearTabParams,
    tab: 'database',
  });
  const session = await requireDashboardSession();
  if (session.role !== 'Admin') {
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
  const backupDownloadHref =
    safeBackupFile
      ? `/api/db/backup?file=${encodeURIComponent(safeBackupFile)}`
      : null;
  const backupSavedPath = safeBackupFile
    ? formatBackupPathForDisplay(resolveBackupFilePath(safeBackupFile)!)
    : null;

  let dbMessage: string | null = null;
  if (dbMsg === 'restore') {
    dbMessage = 'Database restored successfully.';
  } else if (dbMsg === 'backup' && backupSavedPath) {
    dbMessage = `Backup created at ${backupSavedPath}. Download link expires in 5 minutes.`;
  } else if (dbMsg === 'backup') {
    dbMessage = 'Backup created successfully.';
  }

  let activeTab: AdminTab = tab === 'database' ? 'database' : 'users';
  if (db || dbError || dbMsg || backupFile) {
    activeTab = 'database';
  }
  if (create === '1' || detail) {
    activeTab = 'users';
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
      >
      <div className="glass-panel glass-panel--padded">
        <nav className="detail-tabs" aria-label="Admin sections">
          <Link
            href={usersTabHref}
            scroll={false}
            className={activeTab === 'users' ? 'detail-tab detail-tab--active' : 'detail-tab'}
            aria-current={activeTab === 'users' ? 'page' : undefined}
          >
            Users
          </Link>
          <Link
            href={databaseTabHref}
            scroll={false}
            className={activeTab === 'database' ? 'detail-tab detail-tab--active' : 'detail-tab'}
            aria-current={activeTab === 'database' ? 'page' : undefined}
          >
            Database
          </Link>
        </nav>

        {activeTab === 'users' ? (
          users.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              No users yet. Click <strong style={{ color: 'var(--text-main)' }}>New User</strong> to add one.
            </p>
          ) : (
            <table className="data-table">
              <colgroup>
                <col />
                <col style={{ width: '140px' }} />
                <col style={{ width: '220px' }} />
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
                        <span className="badge" style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active)' }}>
                          Admin
                        </span>
                      ) : (
                        'User'
                      )}
                    </td>
                    <td className="cell-numeric" style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
                      <DisplayDate value={user.lastLogin} includeTime />
                    </td>
                    <td className="table-action-cell">
                      <DetailEyeLink href={buildPathQuery('/dashboard/users', listParams, { detail: user.id, create: null })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="detail-tabpanel">
            {dbMessage ? (
              <div
                style={{
                  color: '#4ade80',
                  fontSize: '0.875rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                  borderRadius: '8px',
                }}
              >
                {dbMessage}
                {backupDownloadHref ? (
                  <>
                    {' '}
                    <a href={backupDownloadHref} style={{ color: '#4ade80', fontWeight: 600 }}>
                      Download copy
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}
            <section className="detail-section">
              <h3 className="detail-section__label">Backup &amp; Restore</h3>
              <div className="db-action-grid">
                <Link
                  href={backupHref}
                  scroll={false}
                  className="db-action-btn"
                  style={{ textDecoration: 'none' }}
                >
                  <Upload size={22} color="var(--accent)" />
                  <span className="db-action-btn-label">Backup</span>
                  <span className="db-action-btn-desc">Password-gated full backup (5-min download link).</span>
                </Link>
                <Link
                  href={restoreHref}
                  scroll={false}
                  className="db-action-btn"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={22} color="var(--accent)" />
                  <span className="db-action-btn-label">Restore</span>
                  <span className="db-action-btn-desc">Import from a previous backup zip.</span>
                </Link>
              </div>
            </section>
            <section className="danger-zone">
              <h3 className="danger-zone__title">Danger Zone</h3>
              <Link
                href={resetHref}
                scroll={false}
                className="db-action-btn db-action-btn--danger"
                style={{ textDecoration: 'none' }}
              >
                <Trash2 size={22} color="#ff3366" />
                <span className="db-action-btn-label">Reset</span>
                <span className="db-action-btn-desc">Wipe all records; your password becomes the temporary admin password.</span>
              </Link>
            </section>
          </div>
        )}
      </div>
      </UsersClient>
    </>
  );
}
