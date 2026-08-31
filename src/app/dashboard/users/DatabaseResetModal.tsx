import { Modal } from '@/components/Modal';
import { resetDatabase } from '@/app/actions/db';

const DB_ERRORS: Record<string, string> = {
  confirm: 'Type RESET to confirm.',
  password: 'Incorrect password.',
  passwordPolicy: 'Your current password must meet the current password policy before it can be reused for the reset admin account.',
  unauthorized: 'Unauthorized.',
  generic: 'Reset failed.',
};

export function DatabaseResetModal({
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
      title="Reset database"
      maxWidth="480px"
      headerActions={
        <>
          <button
            type="submit"
            form="reset-database-form"
            className="btn-save"
            style={{ boxShadow: 'none', borderColor: '#ff3366', color: '#ff3366' }}
          >
            Reset
          </button>
          <a href={closeHref} className="btn-cancel" style={{ boxShadow: 'none', textDecoration: 'none' }}>
            Cancel
          </a>
        </>
      }
    >
      <form id="reset-database-form" action={resetDatabase}>
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        {dir ? <input type="hidden" name="dir" value={dir} /> : null}
        <input type="hidden" name="tab" value="database" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This will permanently remove all database records and uploaded screenshots, then recreate the default admin account. Your current password becomes the temporary admin password and must be changed on first login.
          </p>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Type <strong style={{ color: 'var(--text-main)' }}>RESET</strong> to confirm
            </div>
            <input
              type="text"
              name="confirm"
              className="form-input"
              autoComplete="off"
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