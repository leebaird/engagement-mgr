'use client';

import { useActionState, useRef } from 'react';
import { login } from '@/app/actions/auth';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const usernameRef = useRef(null);
  const submitButtonRef = useRef(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sidebar-active-bg)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Shield size={32} color="var(--sidebar-active)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Engagement Manager</h1>
        </div>

        <form action={formAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input 
              ref={usernameRef}
              type="text" 
              id="username" 
              name="username" 
              className="form-input" 
              required 
              tabIndex={1}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && e.shiftKey) {
                  e.preventDefault();
                  (submitButtonRef.current as HTMLButtonElement | null)?.focus();
                }
              }}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              required 
              tabIndex={2}
            />
          </div>

          {state?.error && (
            <div className="text-error mb-4 text-center">
              {state.error}
            </div>
          )}

          <button 
            ref={submitButtonRef}
            type="submit" 
            className="btn-secondary" 
            disabled={isPending} 
            tabIndex={3}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                (usernameRef.current as HTMLInputElement | null)?.focus();
              }
            }}
            style={{ padding: '0.6rem 1.2rem', width: 'fit-content', margin: '0 auto', display: 'block', outline: 'none' }}
          >
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
