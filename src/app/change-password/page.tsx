'use client';

import { useActionState } from 'react';
import { changePassword } from '@/app/actions/auth';
import { Shield } from 'lucide-react';

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePassword, null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sidebar-active-bg)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Shield size={32} color="var(--sidebar-active)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Set New Password</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Your password was set by an administrator. Please create a new one.
          </p>
        </div>

        <form action={formAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="password">New Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className="form-input" 
              required 
              defaultValue={state?.fields?.password || ''}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Password must be:
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, listStyle: 'disc' }}>
                <li>At least 16 characters long</li>
                <li>Contain at least one uppercase letter</li>
                <li>Contain at least one number</li>
                <li>Contain at least one symbol</li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              className="form-input" 
              required 
              defaultValue={state?.fields?.confirmPassword || ''}
            />
          </div>

          {state?.error && (
            <div className="text-error mb-4 text-center">
              {state.error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
