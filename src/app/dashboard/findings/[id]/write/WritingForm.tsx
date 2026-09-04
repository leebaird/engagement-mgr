'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  startTransition,
} from 'react';
import { saveDraft, saveWriting } from '@/app/actions/writing';
import { FindingMarkdown } from '@/components/FindingMarkdown';
import { contentFields, type FindingContent } from '@/lib/reporting';

const labels: Record<(typeof contentFields)[number], string> = {
  title: 'Title',
  category: 'Category',
  severity: 'Severity',
  background: 'Background',
  remediation: 'Remediation',
  supportingLinks: 'References',
  observation: 'Observation and reproduction steps',
  affectedHosts: 'Affected hosts',
};

export function WritingForm({
  id,
  version,
  initialContent,
  publishedContent,
  initialDraftVersion,
  engagementScoped,
}: {
  id: string;
  version: number;
  initialContent: FindingContent;
  publishedContent: FindingContent;
  initialDraftVersion: number;
  engagementScoped: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [baseVersion, setBaseVersion] = useState(version);
  const baseline = useRef(JSON.stringify(publishedContent));
  const [state, draftAction, pending] = useActionState(saveDraft, {
    version: initialDraftVersion,
  });
  const [writeState, writingAction, writingPending] = useActionState(
    saveWriting,
    {}
  );
  const form = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(JSON.stringify(initialContent));
  const submitted = useRef(saved);
  const current = JSON.stringify(content);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const incoming = JSON.stringify(publishedContent);
    if (incoming === baseline.current) setBaseVersion(version);
    else if (current === baseline.current || current === incoming) {
      setContent(publishedContent);
      setSaved(incoming);
      baseline.current = incoming;
      setBaseVersion(version);
    }
  }, [version, publishedContent, current]);

  useEffect(() => {
    if (state.savedAt) setSaved(submitted.current);
  }, [state.savedAt]);

  useEffect(() => {
    if (pending || writingPending || state.error || current === saved) return;
    const timer = setTimeout(() => {
      if (!form.current) return;
      submitted.current = current;
      startTransition(() => draftAction(new FormData(form.current!)));
    }, 15000);
    return () => clearTimeout(timer);
  }, [current, saved, pending, writingPending, state.error, draftAction]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (current !== saved) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [current, saved]);

  useEffect(() => {
    if (current === saved) return;
    const guard = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const navigation = event.type === 'click' && target.closest('a[href]');
      const otherForm =
        event.type === 'submit' &&
        target !== form.current &&
        !target.hasAttribute('data-preserves-writing');
      if (
        (navigation || otherForm) &&
        !window.confirm(
          'This editor has unsaved changes. Save a private draft to keep them. Continue without saving?'
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', guard, true);
    document.addEventListener('submit', guard, true);
    return () => {
      document.removeEventListener('click', guard, true);
      document.removeEventListener('submit', guard, true);
    };
  }, [current, saved]);

  return (
    <form ref={form} action={writingAction} className="writing-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={baseVersion} />
      <input
        type="hidden"
        name="draftVersion"
        value={state.version ?? initialDraftVersion}
      />
      <div className="writing-toolbar">
        <button
          className="btn-primary"
          type="submit"
          disabled={pending || writingPending}
        >
          Save finding
        </button>
        <button
          className="btn-secondary"
          type="submit"
          formAction={draftAction}
          disabled={pending || writingPending}
          onClick={() => {
            submitted.current = current;
          }}
        >
          Save private draft
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
      {writeState.error && <p role="alert">{writeState.error}</p>}
      <p role="status">
        {pending
          ? 'Saving draft…'
          : state.error ||
            (current !== saved
              ? 'Unsaved changes — draft saves after 15 seconds.'
              : state.savedAt
                ? 'Private draft saved.'
                : 'No unsaved changes.')}
      </p>
      <p className="writing-help">
        Use Markdown for headings, lists, tables and code blocks. Attach
        screenshots in the evidence panel. Links and HTML are displayed as text.
      </p>
      {contentFields.map((key) => {
        if (
          !engagementScoped &&
          (key === 'observation' || key === 'affectedHosts')
        )
          return <input key={key} type="hidden" name={key} value="" />;
        return (
          <label className="form-group" key={key}>
            <span className="form-label">{labels[key]}</span>
            {key === 'severity' ? (
              <select
                name={key}
                className="form-input"
                value={content[key]}
                onChange={(e) =>
                  setContent({
                    ...content,
                    [key]: e.target.value as FindingContent['severity'],
                  })
                }
              >
                <option value="">Unrated</option>
                {['Critical', 'High', 'Medium', 'Low', 'Info'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : key === 'title' || key === 'category' ? (
              <input
                name={key}
                className="form-input"
                required={key === 'title'}
                maxLength={key === 'title' ? 500 : 200}
                value={content[key]}
                onChange={(e) =>
                  setContent({ ...content, [key]: e.target.value })
                }
              />
            ) : (
              <textarea
                name={key}
                className="form-input"
                rows={key === 'observation' ? 10 : 5}
                maxLength={10000}
                value={content[key]}
                onChange={(e) =>
                  setContent({ ...content, [key]: e.target.value })
                }
              />
            )}
            {preview && !['title', 'category', 'severity'].includes(key) && (
              <FindingMarkdown text={content[key]} />
            )}
          </label>
        );
      })}
    </form>
  );
}
