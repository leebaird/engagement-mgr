'use client';
import { deleteScreenshot } from '@/app/actions/finding';

export function DeleteScreenshotButton({ screenshotId, findingId }: { screenshotId: string, findingId: string }) {
  return (
    <button 
      onClick={() => deleteScreenshot(screenshotId, findingId)}
      style={{
        background: 'transparent',
        border: '1px solid var(--error-color)',
        color: 'var(--error-color)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        width: '100%',
        transition: 'all 0.2s'
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
