'use client';
import { useActionState, useEffect, useRef } from 'react';
import { uploadScreenshot } from '@/app/actions/finding';

export function UploadScreenshotForm({ findingId }: { findingId: string }) {
  const [state, formAction, isPending] = useActionState(uploadScreenshot, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={formRef}>
      <input type="hidden" name="findingId" value={findingId} />
      <div className="form-group">
        <label className="form-label">Screenshot File</label>
        <input type="file" name="screenshot" accept="image/*" className="form-input" required />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <input type="text" name="description" className="form-input" placeholder="Proof of access..." />
      </div>
      {state?.error && <div className="text-error mb-4">{state.error}</div>}
      <button type="submit" className="btn-primary" disabled={isPending}>{isPending ? 'Uploading...' : 'Upload'}</button>
    </form>
  );
}
