'use client';

import { useActionState, useRef } from 'react';
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
  const exportFile = useRef<File | null>(null);
  const exportFormat = useRef(formats[0] ?? '');
  const [state, action, pending] = useActionState<ImportPreview, FormData>(
    previewScannerImport,
    {}
  );

  async function confirm(formData: FormData) {
    const file = exportFile.current;
    if (file) formData.set('file', file);
    formData.set('format', exportFormat.current);
    await confirmScannerImport(formData);
  }
  return (
    <>
      <section className="glass-panel glass-panel--padded">
        <form action={action} className="import-form">
          <div className="import-form__grid">
            <div className="import-field">
              <label className="import-field__label" htmlFor="import-engagement">Engagement</label>
              <select
                id="import-engagement"
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
            </div>
            <div className="import-field">
              <label className="import-field__label" htmlFor="import-format">Export format</label>
              <select
                id="import-format"
                name="format"
                className="form-input"
                defaultValue={formats[0]}
                onChange={(event) => {
                  exportFormat.current = event.target.value;
                }}
              >
                {formats.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="import-field">
            <label className="import-field__label" htmlFor="import-file">Export file (up to 2 MB)</label>
            <input
              id="import-file"
              type="file"
              name="file"
              className="form-input"
              accept=".xml,.json,.jsonl,.sarif,.nessus"
              required
              onChange={(event) => {
                exportFile.current = event.target.files?.[0] ?? null;
              }}
            />
          </div>
          <button
            className="btn-secondary"
            disabled={pending}
            style={{ width: 'fit-content' }}
          >
            {pending ? 'Reading Export…' : 'Preview Import'}
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
          <form action={confirm}>
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
              className="btn-secondary"
              style={{ width: 'fit-content' }}
            >
              Import Selected Findings
            </button>
          </form>
        </section>
      )}
    </>
  );
}
