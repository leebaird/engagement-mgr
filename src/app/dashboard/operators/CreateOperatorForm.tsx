'use client';
import { useActionState, useEffect, useRef } from 'react';
import { createOperator } from '@/app/actions/operator';

export function CreateOperatorForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState(createOperator, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form id="create-operator-form" action={formAction} ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
          <input autoFocus type="text" name="name" className="form-input" required />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
          <select name="title" className="form-input" onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}>
            <option value=""></option>
            <option value="Director">Director</option>
            <option value="Red Team Lead">Red Team Lead</option>
            <option value="Senior Red Team Operator">Senior Red Team Operator</option>
            <option value="Red Team Operator">Red Team Operator</option>
            <option value="Junior Red Team Operator">Junior Red Team Operator</option>
            <option value="Intern">Intern</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
          <input type="email" name="email" className="form-input" />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
          <input type="tel" name="phoneNumber" className="form-input" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Discord</div>
          <input type="text" name="discord" className="form-input" />
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>GitHub</div>
          <input type="text" name="github" className="form-input" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
        <textarea 
          name="notes" 
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
