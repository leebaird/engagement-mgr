'use client';

import { useState } from 'react';
import { deleteScreenshot } from '@/app/actions/finding';
import { DetailDeleteConfirmBody } from '@/components/DetailModalActions';

export function DeleteScreenshotButton({
  screenshotId,
  findingId,
}: {
  screenshotId: string;
  findingId: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        style={{
          background: 'transparent',
          border: '1px solid var(--error-color)',
          color: 'var(--error-color)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          width: '100%',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255,77,77,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        Delete Screenshot
      </button>
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
      <DetailDeleteConfirmBody deleteError={error ?? undefined}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          This screenshot file will be permanently removed.
        </p>
      </DetailDeleteConfirmBody>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          type="button"
          className="modal-action-btn modal-action-btn--danger"
          disabled={isPending}
          onClick={async () => {
            setIsPending(true);
            setError(null);
            try {
              await deleteScreenshot(screenshotId, findingId);
              window.location.reload();
            } catch {
              setError('generic');
              setIsPending(false);
            }
          }}
        >
          {isPending ? 'Deleting...' : 'Confirm Delete'}
        </button>
        <button
          type="button"
          className="btn-cancel"
          style={{ boxShadow: 'none' }}
          disabled={isPending}
          onClick={() => {
            setShowConfirm(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}