import { Modal } from '@/components/Modal';
import { importDatabaseBackup } from '@/app/actions/db';

const DB_ERRORS: Record<string, string> = {
  password: 'Incorrect password.',
  file: 'Invalid or missing backup file.',
  unauthorized: 'Unauthorized.',
  generic: 'Restore failed. Use a valid .zip or .sql backup file.',
};

export function DatabaseRestoreModal({
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
      title="Restore backup"
      maxWidth="480px"
      headerActions={
        <>
          <button
            type="submit"
            form="restore-database-form"
            className="btn-save"
            style={{ boxShadow: 'none' }}
          >
            Restore
          </button>
          <a href={closeHref} className="btn-cancel" style={{ boxShadow: 'none', textDecoration: 'none' }}>
            Cancel
          </a>
        </>
      }
    >
      <form id="restore-database-form" action={importDatabaseBackup} encType="multipart/form-data">
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        {dir ? <input type="hidden" name="dir" value={dir} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Restore will replace all database data and uploaded screenshots with the selected backup. This cannot be undone.
          </p>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Backup file
            </div>
            <input
              type="file"
              name="file"
              className="form-input"
              accept=".zip,.sql,application/zip,application/sql,text/plain"
              required
              style={{ width: '100%' }}
            />
          </div>
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