import { deleteScreenshotFromPage } from '@/app/actions/finding';
import { DetailDeleteConfirmBody } from '@/components/DetailModalActions';

export function DeleteScreenshotButton({
  screenshotId,
  findingId,
  confirmHref,
  cancelHref,
  showConfirm,
  deleteError,
}: {
  screenshotId: string;
  findingId: string;
  confirmHref: string;
  cancelHref: string;
  showConfirm: boolean;
  deleteError?: string;
}) {
  if (!showConfirm) {
    return (
      <a
        href={confirmHref}
        style={{
          background: 'transparent',
          border: '1px solid var(--error-color)',
          color: 'var(--error-color)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          width: '100%',
          textDecoration: 'none',
          display: 'block',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        Delete Screenshot
      </a>
    );
  }

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid rgba(255, 68, 68, 0.25)',
        background: 'rgba(255, 68, 68, 0.06)',
      }}
    >
      <DetailDeleteConfirmBody deleteError={deleteError}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          This screenshot file will be permanently removed.
        </p>
      </DetailDeleteConfirmBody>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <form action={deleteScreenshotFromPage}>
          <input type="hidden" name="screenshotId" value={screenshotId} />
          <input type="hidden" name="findingId" value={findingId} />
          <button type="submit" className="modal-action-btn modal-action-btn--danger">
            Confirm Delete
          </button>
        </form>
        <a href={cancelHref} className="btn-cancel" style={{ boxShadow: 'none', textDecoration: 'none' }}>
          Cancel
        </a>
      </div>
    </div>
  );
}
