'use client';

import { useActionState } from 'react';
import {
  previewScannerImport,
  confirmScannerImport,
  type ImportPreview,
} from '@/app/actions/scanner-import';

export function ImportForm({
  engagements,
  formats,
  selectedEngagement,
}: {
  engagements: { id: string; codeName: string }[];
  formats: readonly string[];
  selectedEngagement: string;
}) {
  const [state, action, pending] = useActionState<ImportPreview, FormData>(
    previewScannerImport,
    {}
  );
  return (
    <>
      <form action={action} className="writing-form">
        <label className="form-label">
          Engagement
          <select
            name="engagementId"
            className="form-input"
            required
            defaultValue={selectedEngagement}
          >
            <option value="">Choose engagement</option>
            {engagements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codeName}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Export format
          <select name="format" className="form-input">
            {formats.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Export file (up to 2 MB)
          <input
            type="file"
            name="file"
            className="form-input"
            accept=".xml,.json,.jsonl,.sarif,.nessus"
            required
          />
        </label>
        <button className="btn-primary" disabled={pending}>
          {pending ? 'Reading export…' : 'Preview import'}
        </button>
        {state.error && <p role="alert">{state.error}</p>}
      </form>
      {state.candidates && (
        <form action={confirmScannerImport}>
          <h2>Preview {state.candidates.length} findings</h2>
          <p>{state.duplicateCount ?? 0} existing matches will be skipped.</p>
          <p>
            Confirm only the findings you want. Existing matching records are
            skipped. All imported findings start as drafts and require
            validation.
          </p>
          <input name="engagementId" type="hidden" value={state.engagementId} />
          <input
            name="candidates"
            type="hidden"
            value={JSON.stringify(state.candidates)}
          />
          {state.candidates.map((f, i) => (
            <details key={i}>
              <summary>
                <label>
                  <input name="selected" type="checkbox" value={i} /> {f.title}{' '}
                  · {f.severity || 'Unrated'}
                </label>
              </summary>
              <p>{f.affectedHosts}</p>
              <pre className="import-preview">{f.observation}</pre>
              <p>{f.background}</p>
              <p>{f.remediation}</p>
            </details>
          ))}
          <button className="btn-primary">Import selected findings</button>
        </form>
      )}
    </>
  );
}
