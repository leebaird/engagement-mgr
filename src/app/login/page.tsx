'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,51,102,0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Shield size={32} color="var(--primary-color)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Engagement Manager</h1>
        </div>

        <form action={formAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              className="form-input" 
              required 
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
            />
          </div>

          {state?.error && (
            <div className="text-error mb-4 text-center">
              {state.error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
