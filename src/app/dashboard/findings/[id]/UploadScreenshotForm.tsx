'use client';
import { useActionState, useEffect, useRef } from 'react';
import { uploadScreenshot } from '@/app/actions/finding';

export function UploadScreenshotForm({ findingId, version }: { findingId: string; version: number }) {
  const [state, formAction, isPending] = useActionState(uploadScreenshot, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={formRef} data-preserves-writing onPaste={event => {
      const images = Array.from(event.clipboardData.files).filter(file => ['image/png', 'image/jpeg'].includes(file.type));
      const input = formRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
      if (images.length && input) {
        event.preventDefault();
        const transfer = new DataTransfer();
        images.slice(0, 4).forEach(file => transfer.items.add(file));
        input.files = transfer.files;
      }
    }}>
      <input type="hidden" name="findingId" value={findingId} />
      <input type="hidden" name="version" value={version} />
      <div className="form-group">
        <label className="form-label">Screenshot File</label>
        <input type="file" name="screenshot" accept="image/png,image/jpeg" className="form-input" multiple required />
        <p className="writing-help">Select up to 4 images (5 MB each), or paste a screenshot into this panel. Saving evidence clears approval.</p>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <input type="text" name="description" className="form-input" placeholder="Proof of access..." />
      </div>
      {state?.error && <div className="text-error mb-4">{state.error}</div>}
      {state?.success && <p role="status">{state.success}</p>}
      <button type="submit" className="btn-primary" disabled={isPending}>{isPending ? 'Uploading...' : 'Upload'}</button>
    </form>
  );
}
