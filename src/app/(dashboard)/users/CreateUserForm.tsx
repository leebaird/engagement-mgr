'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createUser } from '@/app/actions/user';
export function CreateUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState(createUser, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form id="create-user-form" action={formAction} ref={formRef}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</div>
          <input 
            autoFocus 
            type="text" 
            name="username" 
            className="form-input" 
            required 
            defaultValue={state?.fields?.username || ''} 
            tabIndex={1}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                if (modal) {
                  const button = modal.querySelector('[tabindex="4"]') as HTMLElement;
                  if (button) button.focus();
                }
              }
            }}
            style={{ width: '100%' }} 
          />
        </div>

        <div style={{ width: '7rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Role</div>
          <select 
            name="role" 
            className="form-input" 
            required 
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} 
            defaultValue={state?.fields?.role || ''}
            tabIndex={2}
            onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
          >
            <option value=""></option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
        </div>

        <div style={{ minHeight: '8.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Password</div>
          <input 
            type="password" 
            name="password" 
            className="form-input" 
            required 
            tabIndex={3}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                if (modal) {
                  const username = modal.querySelector('[tabindex="1"]') as HTMLElement;
                  if (username) username.focus();
                }
              }
            }}
            style={{ width: '100%' }} 
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            The user will be required to change their password on the next login.<br />
            Password must be at least 16 characters, with one uppercase, one number, and one symbol.
          </div>
        </div>

        {state?.error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{state.error}</div>}
        {state?.success && <div style={{ color: '#4ade80', fontSize: '0.875rem', marginBottom: '1rem' }}>{state.success}</div>}
      </div>
    </form>
  );
}
