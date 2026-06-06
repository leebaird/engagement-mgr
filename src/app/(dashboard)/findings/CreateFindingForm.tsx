'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createFinding, searchFindingsByTitle, type FindingTemplateMatch } from '@/app/actions/finding';

const emptyForm = {
  title: '',
  category: '',
  severity: '',
  background: '',
  remediation: '',
  supportingLinks: '',
  observation: '',
  affectedHosts: '',
};

export function CreateFindingForm({
  onSuccess,
  engagementId,
  formId = 'create-finding-form',
}: {
  onSuccess?: () => void;
  engagementId?: string;
  formId?: string;
}) {
  const [state, formAction] = useActionState(createFinding, null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [suggestions, setSuggestions] = useState<FindingTemplateMatch[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const resetForm = () => {
    setForm(emptyForm);
    setSuggestions([]);
    setSuggestionsOpen(false);
  };

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      resetForm();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  useEffect(() => {
    if (!engagementId) return;

    const q = form.title.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const matches = await searchFindingsByTitle(q);
        setSuggestions(matches);
        setSuggestionsOpen(matches.length > 0);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [engagementId, form.title]);

  useEffect(() => {
    if (!engagementId) return;

    function handleClickOutside(e: MouseEvent) {
      if (titleWrapRef.current && !titleWrapRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [engagementId]);

  const applyTemplate = (match: FindingTemplateMatch) => {
    setForm((prev) => ({
      ...prev,
      title: match.title,
      category: match.category || '',
      severity: match.severity || '',
      background: match.background || '',
      remediation: match.remediation || '',
      supportingLinks: match.supportingLinks || '',
    }));
    setSuggestionsOpen(false);
  };

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const titleSuggestionsDropdown = suggestionsOpen ? (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: '#1a1a2e',
        border: '1px solid var(--surface-border)',
        borderRadius: '8px',
        marginTop: '0.25rem',
        zIndex: 20,
        maxHeight: '220px',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {searching ? (
        <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Searching…
        </div>
      ) : (
        suggestions.map((match) => (
          <button
            key={match.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyTemplate(match);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.65rem 0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--surface-border)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 102, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{match.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {[match.category, match.severity].filter(Boolean).join(' · ')}
            </div>
          </button>
        ))
      )}
    </div>
  ) : null;

  return (
    <form
      id={formId}
      action={formAction}
      ref={formRef}
      style={engagementId ? undefined : { display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {engagementId ? (
        <>
          <input type="hidden" name="engagementId" value={engagementId} />
          {state?.error ? (
            <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{state.error}</div>
          ) : null}
          <div className="engagement-finding-detail-form">
            <div className="engagement-finding-detail-form__header">
              <div className="engagement-finding-detail-form__left-header">
                <div>
                  <div className="engagement-finding-detail-field__label">Title</div>
                  <div ref={titleWrapRef} style={{ position: 'relative' }}>
                    <input
                      autoFocus
                      type="text"
                      name="title"
                      className="form-input"
                      required
                      value={form.title}
                      onChange={(e) => setField('title', e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setSuggestionsOpen(true);
                      }}
                      autoComplete="off"
                      style={{ width: '100%' }}
                    />
                    {titleSuggestionsDropdown}
                  </div>
                </div>
                <div className="engagement-finding-detail-form__meta">
                  <div>
                    <div className="engagement-finding-detail-field__label">Category</div>
                    <select
                      name="category"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                    >
                      <option value=""></option>
                      <option value="AI">AI</option>
                      <option value="Firewall">Firewall</option>
                      <option value="Host">Host</option>
                      <option value="OSINT">OSINT</option>
                      <option value="Physical">Physical</option>
                      <option value="Social Eng">Social Eng</option>
                      <option value="Web App">Web App</option>
                      <option value="Wireless">Wireless</option>
                    </select>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Severity</div>
                    <select
                      name="severity"
                      className="form-input"
                      value={form.severity}
                      onChange={(e) => setField('severity', e.target.value)}
                      style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}
                      onFocus={(e) => { try { if (typeof (e.target as HTMLSelectElement & { showPicker?: () => void }).showPicker === 'function') { (e.target as HTMLSelectElement & { showPicker: () => void }).showPicker(); } } catch { /* ignore */ } }}
                    >
                      <option value=""></option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Info">Info</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <div className="engagement-finding-detail-field__label">Remediation</div>
                <textarea
                  name="remediation"
                  className="form-input"
                  rows={5}
                  style={{ width: '100%' }}
                  value={form.remediation}
                  onChange={(e) => setField('remediation', e.target.value)}
                />
              </div>
            </div>
            <div className="engagement-finding-detail-form__pair">
              <div>
                <div className="engagement-finding-detail-field__label">Observation</div>
                <textarea
                  name="observation"
                  className="form-input"
                  rows={5}
                  style={{ width: '100%' }}
                  value={form.observation}
                  onChange={(e) => setField('observation', e.target.value)}
                />
              </div>
              <div>
                <div className="engagement-finding-detail-field__label">See Also</div>
                <textarea
                  name="supportingLinks"
                  className="form-input"
                  rows={5}
                  style={{ width: '100%' }}
                  value={form.supportingLinks}
                  onChange={(e) => setField('supportingLinks', e.target.value)}
                />
              </div>
            </div>
            <div className="engagement-finding-detail-form__pair">
              <div>
                <div className="engagement-finding-detail-field__label">Background</div>
                <textarea
                  name="background"
                  className="form-input"
                  rows={5}
                  style={{ width: '100%' }}
                  value={form.background}
                  onChange={(e) => setField('background', e.target.value)}
                />
              </div>
              <div>
                <div className="engagement-finding-detail-field__label">Affected Hosts</div>
                <textarea
                  name="affectedHosts"
                  className="form-input"
                  rows={5}
                  style={{ width: '100%' }}
                  value={form.affectedHosts}
                  onChange={(e) => setField('affectedHosts', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                      if (modal) {
                        const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                        if (firstField) firstField.focus();
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', height: '2.5rem' }} />
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 120px', gap: '1.25rem' }}>
          <div ref={titleWrapRef} style={{ position: 'relative' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
            <input
              autoFocus
              type="text"
              name="title"
              className="form-input"
              required
              defaultValue=""
              onChange={(e) => setField('title', e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setSuggestionsOpen(true);
              }}
              autoComplete="off"
            />
            {titleSuggestionsDropdown}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
            <select
              name="category"
              className="form-input"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}
              defaultValue=""
              onChange={(e) => setField('category', e.target.value)}
            >
              <option value=""></option>
              <option value="AI">AI</option>
              <option value="Firewall">Firewall</option>
              <option value="Host">Host</option>
              <option value="OSINT">OSINT</option>
              <option value="Physical">Physical</option>
              <option value="Social Eng">Social Eng</option>
              <option value="Web App">Web App</option>
              <option value="Wireless">Wireless</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</div>
            <select
              name="severity"
              className="form-input"
              defaultValue=""
              onChange={(e) => setField('severity', e.target.value)}
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}
              onFocus={(e) => { try { if (typeof (e.target as HTMLSelectElement & { showPicker?: () => void }).showPicker === 'function') { (e.target as HTMLSelectElement & { showPicker: () => void }).showPicker(); } } catch { /* ignore */ } }}
            >
              <option value=""></option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Info">Info</option>
            </select>
          </div>
        </div>
      )}

      {!engagementId ? (
        <>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
            <textarea
              name="background"
              className="form-input"
              rows={4}
              style={{ width: '100%' }}
              defaultValue=""
            />
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remediation</div>
            <textarea
              name="remediation"
              className="form-input"
              rows={4}
              style={{ width: '100%' }}
              defaultValue=""
            />
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>See Also</div>
            <textarea
              name="supportingLinks"
              className="form-input"
              rows={4}
              style={{ width: '100%' }}
              defaultValue=""
              onKeyDown={e => {
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                  if (modal) {
                    const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                    if (firstField) firstField.focus();
                  }
                }
              }}
            />
          </div>
        </>
      ) : null}

      {!engagementId && state?.error ? (
        <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{state.error}</div>
      ) : null}
    </form>
  );
}