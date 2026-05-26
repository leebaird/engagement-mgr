'use client';
import { useActionState, useEffect, useRef } from 'react';
import { createContact } from '@/app/actions/contact';

export function CreateContactForm({ clients, onSuccess }: { clients: { id: string, company: string }[], onSuccess?: () => void }) {
  const [state, formAction, isPending] = useActionState(createContact, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} ref={formRef}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
            <select autoFocus name="clientId" className="form-input" required style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
              <option value=""></option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
            <input type="text" name="name" className="form-input" required placeholder=" " />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
            <input type="text" name="title" className="form-input" />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
            <input type="email" name="email" className="form-input" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
            <input type="text" name="phoneNumber" className="form-input" />
          </div>
        </div>

        {/* Notes - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
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
      </div>

      {state?.error && <div className="text-error mb-4" style={{ marginTop: '1rem' }}>{state.error}</div>}
      {state?.success && <div style={{ color: '#4ade80', marginBottom: '1rem', marginTop: '1rem' }}>{state.success}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
        <button type="submit" className="btn-secondary" disabled={isPending} style={{ width: 'fit-content', padding: '0.6rem 2rem' }}>
          {isPending ? 'Saving...' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}
