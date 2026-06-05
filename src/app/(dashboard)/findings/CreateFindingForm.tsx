'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createFinding } from '@/app/actions/finding';

export function CreateFindingForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState(createFinding, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [severity, setSeverity] = useState('');

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setSeverity('');
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case 'Critical': return { color: '#b366ff', background: 'rgba(179,102,255,0.1)', border: '1px solid rgba(179,102,255,0.3)' };
      case 'High': return { color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)' };
      case 'Medium': return { color: '#ffa64d', background: 'rgba(255,166,77,0.1)', border: '1px solid rgba(255,166,77,0.3)' };
      case 'Low': return { color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' };
      case 'Info': return { color: '#66b3ff', background: 'rgba(102,179,255,0.1)', border: '1px solid rgba(102,179,255,0.3)' };
      default: return { color: 'var(--text-main)', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)' };
    }
  };

  return (
    <form id="create-finding-form" action={formAction} ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 120px', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
          <input autoFocus type="text" name="title" className="form-input" required />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
          <select name="category" className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}>
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
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}
            onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}
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

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
        <textarea name="background" className="form-input" rows={4} style={{ width: '100%' }}></textarea>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remediation</div>
        <textarea name="remediation" className="form-input" rows={4} style={{ width: '100%' }}></textarea>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>See Also</div>
        <textarea 
          name="supportingLinks" 
          className="form-input" 
          rows={4} 
          style={{ width: '100%' }}
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
        ></textarea>
      </div>

      {state?.error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{state.error}</div>}
    </form>
  );
}
