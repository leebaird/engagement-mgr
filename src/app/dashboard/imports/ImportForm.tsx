'use client';

import { useActionState } from 'react';
import {
  previewScannerImport,
  confirmScannerImport,
  type ImportPreview,
} from '@/app/actions/scanner-import';
import { getSeverityStyle } from '@/lib/finding-severity';

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
      <section className="glass-panel glass-panel--padded">
        <form action={action} className="writing-form">
          <div className="import-form__grid">
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
          </div>
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
          <button
            className="btn-primary"
            disabled={pending}
            style={{ width: 'fit-content' }}
          >
            {pending ? 'Reading export…' : 'Preview import'}
          </button>
          {state.error && (
            <p role="alert" className="text-error" style={{ margin: 0 }}>
              {state.error}
            </p>
          )}
        </form>
      </section>
      {state.candidates && (
        <section className="glass-panel glass-panel--padded">
          <form action={confirmScannerImport}>
            <h2 style={{ marginTop: 0 }}>
              Preview {state.candidates.length} findings
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              {state.duplicateCount ?? 0} existing matches will be skipped.
              Confirm only the findings you want. All imported findings start
              as drafts and require validation.
            </p>
            <input
              name="engagementId"
              type="hidden"
              value={state.engagementId}
            />
            <input
              name="candidates"
              type="hidden"
              value={JSON.stringify(state.candidates)}
            />
            <div className="import-candidates">
              {state.candidates.map((f, i) => (
                <details className="import-candidate" key={i}>
                  <summary>
                    <label className="import-candidate__label">
                      <input name="selected" type="checkbox" value={i} />
                      <span>{f.title}</span>
                      {f.severity ? (
                        <span
                          className="badge"
                          style={getSeverityStyle(f.severity)}
                        >
                          {f.severity}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          Unrated
                        </span>
                      )}
                    </label>
                  </summary>
                  <div className="import-candidate__body">
                    {f.affectedHosts && <p>{f.affectedHosts}</p>}
                    {f.observation && (
                      <pre className="import-preview">{f.observation}</pre>
                    )}
                    {f.background && <p>{f.background}</p>}
                    {f.remediation && <p>{f.remediation}</p>}
                  </div>
                </details>
              ))}
            </div>
            <button
              className="btn-primary"
              style={{ width: 'fit-content' }}
            >
              Import selected findings
            </button>
          </form>
        </section>
      )}
    </>
  );
}
