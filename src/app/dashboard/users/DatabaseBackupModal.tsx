import { Modal } from '@/components/Modal';
import { exportDatabaseBackup } from '@/app/actions/db';

const DB_ERRORS: Record<string, string> = {
  password: 'Incorrect password.',
  unauthorized: 'Unauthorized.',
  generic:
    'Export failed. Ensure pg_dump and zip are installed and DATABASE_URL is valid.',
};

export function DatabaseBackupModal({
  closeHref,
  sort,
  dir,
  dbError,
}: {
  closeHref: string;
  sort?: string;
  dir?: string;
  dbError?: string;
}) {
  const errorMessage = dbError ? DB_ERRORS[dbError] ?? DB_ERRORS.generic : null;

  return (
    <Modal
      isOpen
      closeHref={closeHref}
      title="Create backup"
      maxWidth="480px"
      headerActions={
        <>
          <button
            type="submit"
            form="backup-database-form"
            className="btn-save"
            style={{ boxShadow: 'none' }}
          >
            Backup
          </button>
          <a href={closeHref} className="btn-cancel" style={{ boxShadow: 'none', textDecoration: 'none' }}>
            Cancel
          </a>
        </>
      }
    >
      <form id="backup-database-form" action={exportDatabaseBackup}>
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        {dir ? <input type="hidden" name="dir" value={dir} /> : null}
        <input type="hidden" name="tab" value="database" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Create a full backup zip (database dump and screenshots) on the server under
            {' '}<code>backups/</code>. After it is created you can download a copy.
          </p>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Enter your password to confirm
            </div>
            <input
              type="password"
              name="password"
              className="form-input"
              autoComplete="current-password"
              required
              style={{ width: '100%' }}
            />
          </div>
          {errorMessage ? (
            <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.875rem' }}>{errorMessage}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
