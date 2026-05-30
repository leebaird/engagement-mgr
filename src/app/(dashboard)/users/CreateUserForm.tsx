'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createUser } from '@/app/actions/user';

export function CreateUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, isPending] = useActionState(createUser, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} ref={formRef} style={{ minHeight: '320px' }}>
      <div className="form-group">
        <label className="form-label" htmlFor="username">Username</label>
        <input autoFocus key={`username-${state?.fields?.username || ''}`} type="text" id="username" name="username" className="form-input" required defaultValue={state?.fields?.username || ''} style={{ minWidth: '340px', width: '100%' }} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">Password</label>
        <input type="password" id="password" name="password" className="form-input" required style={{ minWidth: '340px', width: '100%' }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          The user will be required to change their password on the next login.<br />
          Password must be at least 16 characters, with one uppercase, one number, and one symbol.
        </div>
      </div>

      <div className="form-group" style={{ width: '7rem' }}>
        <label className="form-label" htmlFor="role">Role</label>
        <select 
          key={`role-${state?.fields?.role || ''}`} 
          id="role" 
          name="role" 
          className="form-input" 
          required 
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} 
          defaultValue={state?.fields?.role || ''}
          onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}
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
        >
          <option value=""></option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
      </div>

      {state?.error && <div className="text-error mb-4">{state.error}</div>}
      {state?.success && <div style={{ color: '#4ade80', fontSize: '0.875rem', marginBottom: '1rem' }}>{state.success}</div>}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button type="submit" className="btn-secondary" disabled={isPending} style={{ width: 'fit-content', padding: '0.6rem 2rem' }}>
          {isPending ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
