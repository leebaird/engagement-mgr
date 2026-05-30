'use client';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateUser, deleteUser } from '@/app/actions/user';

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
        maxWidth="600px"
        onEdit={() => {
          if (!isEditing) {
            setFormData({
              username: user.username,
              password: '',
              role: user.role,
            });
            setIsEditing(true);
            setError(null);
          }
        }}
        onDelete={async () => {
          if (!confirm('Are you sure you want to delete this user?')) return;
          const result = await deleteUser(user.id);
          if (result && !result.success && result.error) {
            alert(result.error);
          } else {
            setIsOpen(false);
          }
        }}
        hideHeaderActions={isEditing}
      >
        {!isEditing ? (
          // VIEW MODE - using same sizes as EDIT/CREATE MODE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: '340px', lineHeight: 1.5, paddingBottom: '0.5rem' }}>
            <div className="form-group">
              <span className="form-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Username</span>
              <div style={{ fontWeight: 500, color: '#fff', minWidth: '340px' }}>{user.username}</div>
            </div>
            
            <div className="form-group" style={{ width: '7rem' }}>
              <span className="form-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Role</span>
              <div>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: user.role === 'ADMIN' ? 'var(--sidebar-active-bg)' : 'rgba(255,255,255,0.1)',
                  color: user.role === 'ADMIN' ? 'var(--sidebar-active)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  {user.role === 'ADMIN' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{new Date(user.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</div>
              <input 
                autoFocus 
                type="text" 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                className="form-input" 
                required 
                style={{ minWidth: '340px', width: '100%' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>New Password (leave blank to keep current)</div>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="form-input" 
                placeholder="••••••••"
                style={{ minWidth: '340px', width: '100%' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                The user will be required to change their password on the next login.<br />
                Password must be at least 16 characters, with one uppercase, one number, and one symbol.
              </div>
            </div>

            <div style={{ width: '7rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Role</div>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
                className="form-input" 
                required 
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
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
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <button onClick={handleUpdate} className="btn-save" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
                <button onClick={() => { setIsEditing(false); setError(null); }} className="btn-cancel">Cancel</button>
            </div>
            
            {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}
          </div>
        )}
      </Modal>
    </>
  );
}
