'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateUser, deleteUser } from '@/app/actions/user';
import { focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';


interface User {
  id: string;
  username: string;
  role: string;
  createdAt: any;
  updatedAt: any;
  lastPasswordChange: any;
}

export function UserDetailButton({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) focusEditFieldAtStart(usernameInputRef.current);
  }, [isEditing]);

  const [formData, setFormData] = useState({
    username: initialUser.username,
    password: '',
    role: initialUser.role,
  });

  const handleUpdate = async () => {
    if (!formData.username || !formData.role) {
      setError('Username and Role are required.');
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value as string);
      });

      const result = await updateUser(user.id, {}, data);

      if (result?.error) {
        setError(result.error);
      } else {
        setUser({ 
          ...user, 
          username: formData.username, 
          role: formData.role,
          lastPasswordChange: formData.password ? new Date(0) : user.lastPasswordChange
        });
        setIsEditing(false);
      }
    } catch (e) {
      setError('An error occurred while updating the user.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: 'none',
          border: '1px solid transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#0066ff';
          e.currentTarget.style.borderColor = '#0066ff';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 102, 255, 0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title="View details"
      >
        <Eye size={16} />
      </button>

      <Modal 
        isOpen={isOpen} 
        onClose={() => { setIsOpen(false); setIsEditing(false); setError(null); }} 
        title={isEditing ? "Edit User" : "User Details"}
        maxWidth="450px"
        headerActions={isEditing ? (
          <>
            <button key="save" onClick={handleUpdate} className="btn-save" style={{ boxShadow: 'none' }} disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
            <button key="cancel" onClick={() => { setIsEditing(false); setError(null); }} className="btn-cancel" style={{ boxShadow: 'none' }}>Cancel</button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setFormData({
                  username: user.username,
                  password: '',
                  role: user.role,
                });
                setIsEditing(true);
                setError(null);
              }}
              style={{
                background: 'none',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0066ff';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 102, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--surface-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Edit
            </button>
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this user?')) return;
                const result = await deleteUser(user.id);
                if (result && !result.success && result.error) {
                  alert(result.error);
                } else {
                  setIsOpen(false);
                }
              }}
              style={{
                background: 'none',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#ff3366';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 51, 102, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--surface-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Delete
            </button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</div>
            {isEditing ? (
              <input
                ref={usernameInputRef}
                type="text"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="form-input"
                required
                tabIndex={1}
                style={{ width: '100%' }}
                onFocus={handleEditFieldFocus}
                onKeyDown={(e) => {
                  const modal = e.currentTarget.closest('.glass-panel');
                  if (!modal) return;
                  if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    const password = modal.querySelector('[tabindex="3"]') as HTMLElement;
                    password?.focus();
                  }
                }}
              />
            ) : (
              <input
                readOnly
                type="text"
                value={user.username}
                className="form-input"
                style={{ pointerEvents: 'none', width: '100%' }}
              />
            )}
          </div>

          <div style={{ width: '7rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Role</div>
            {isEditing ? (
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="form-input"
                required
                tabIndex={2}
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                onFocus={(e) => {
                  try {
                    if (typeof (e.target as HTMLSelectElement).showPicker === 'function') {
                      (e.target as HTMLSelectElement).showPicker();
                    }
                  } catch {
                    // ignore
                  }
                }}
                onKeyDown={(e) => {
                  const modal = e.currentTarget.closest('.glass-panel');
                  if (!modal) return;
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const password = modal.querySelector('[tabindex="3"]') as HTMLElement;
                    password?.focus();
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    const username = modal.querySelector('[tabindex="1"]') as HTMLElement;
                    username?.focus();
                  }
                }}
              >
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
              </select>
            ) : (
              <input
                readOnly
                type="text"
                value={user.role === 'ADMIN' ? 'Admin' : 'User'}
                className="form-input"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </div>

          {isEditing ? (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                New Password (leave blank to keep current)
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                tabIndex={3}
                style={{ width: '100%' }}
                onFocus={handleEditFieldFocus}
                onKeyDown={(e) => {
                  const modal = e.currentTarget.closest('.glass-panel');
                  if (!modal) return;
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const username = modal.querySelector('[tabindex="1"]') as HTMLElement;
                    username?.focus();
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    const role = modal.querySelector('[tabindex="2"]') as HTMLElement;
                    role?.focus();
                  }
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                The user will be required to change their password on the next login.
                <br />
                Password must be at least 16 characters, with one uppercase, one number, and one symbol.
              </div>
            </div>
          ) : null}

          {isEditing && error ? (
            <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>
          ) : null}

          {!isEditing ? (
            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{new Date(user.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
