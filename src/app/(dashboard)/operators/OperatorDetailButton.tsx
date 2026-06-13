'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateOperator, deleteOperator } from '@/app/actions/operator';
import { editEmailInputProps, focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';

export function OperatorDetailButton({ operator: initialOperator, isAdmin = false }: { operator: any; isAdmin?: boolean }) {
  const router = useRouter();
  const [operator, setOperator] = useState(initialOperator);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) focusEditFieldAtStart(nameInputRef.current);
  }, [isEditing]);

  const [formData, setFormData] = useState({
    name: initialOperator.name,
    title: initialOperator.title || '',
    email: initialOperator.email || '',
    phoneNumber: initialOperator.phoneNumber || '',
    discord: initialOperator.discord || '',
    github: initialOperator.github || '',
    notes: initialOperator.notes || '',
  });

  const handleUpdate = async () => {
    if (!formData.name) {
      setError('Name is required');
      return;
    }
    
    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value as string);
      });

      const result = await updateOperator(operator.id, {}, data);
      
      if (result?.error) {
        setError(result.error);
      } else {
        setOperator({ ...operator, ...formData });
        setIsEditing(false);
      }
    } catch (e) {
      setError('An error occurred while updating the operator.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="detail-icon-btn"
        onClick={() => setIsOpen(true)}
        title="View details"
      >
        <Eye size={16} />
      </button>

      {isOpen && (
        <Modal 
          isOpen={isOpen} 
          onClose={() => { setIsOpen(false); setIsEditing(false); setError(null); }} 
          title={isEditing ? "Edit Operator" : "Operator Details"} 
        headerActions={isEditing ? (
          <>
            <button key="save" onClick={handleUpdate} className="btn-save" style={{ boxShadow: 'none' }} disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
            <button key="cancel" onClick={() => { setIsEditing(false); setError(null); }} className="btn-cancel" style={{ boxShadow: 'none' }}>Cancel</button>
          </>
        ) : isAdmin ? (
          <>
            <button
              type="button"
              className="modal-action-btn"
              onClick={() => {
                setFormData({
                  name: operator.name,
                  title: operator.title || '',
                  email: operator.email || '',
                  phoneNumber: operator.phoneNumber || '',
                  discord: operator.discord || '',
                  github: operator.github || '',
                  notes: operator.notes || '',
                });
                setIsEditing(true);
                setError(null);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="modal-action-btn modal-action-btn--danger"
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this operator?')) return;
                const result = await deleteOperator(operator.id);
                if (result.success) {
                  setIsOpen(false);
                } else {
                  alert(result.error || 'Failed to delete operator');
                }
              }}
            >
              Delete
            </button>
          </>
        ) : undefined}
      >
        {!isEditing ? (
          // VIEW MODE - styled to match size and layout of EDIT/CREATE views exactly
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input readOnly type="text" value={operator.name} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <select disabled value={operator.title || ''} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
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
                <input readOnly type="email" value={operator.email || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input readOnly type="tel" value={operator.phoneNumber || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Discord</div>
                <input readOnly type="text" value={operator.discord || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>GitHub</div>
                <input readOnly type="text" value={operator.github || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea 
                readOnly 
                value={operator.notes || ''} 
                className="form-input" 
                rows={4} 
                style={{ width: '100%', pointerEvents: 'none' }}
              ></textarea>
            </div>

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{new Date(operator.createdAt).toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{new Date(operator.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input ref={nameInputRef} type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <select value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
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
                <input {...editEmailInputProps} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Discord</div>
                <input type="text" value={formData.discord} onChange={e => setFormData({...formData, discord: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>GitHub</div>
                <input type="text" value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="form-input" 
                rows={4} 
                style={{ width: '100%' }}
                onFocus={handleEditFieldFocus}
                onKeyDown={e => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const modal = e.currentTarget.closest('.glass-panel');
                    if (modal) {
                      const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                      if (firstField) firstField.focus();
                    }
                  }
                }}
              ></textarea>
            </div>

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }} />
            {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}
          </div>
        )}
      </Modal>
      )}
    </>
  );
}