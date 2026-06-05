'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateContact, deleteContact } from '@/app/actions/contact';
import { formatPhone } from '@/lib/format';
import { editEmailInputProps, focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';

interface Client {
  id: string;
  company: string;
}

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  clientId: string;
  client?: Client;
  createdAt: Date;
  updatedAt: Date;
}

export function ContactDetailButton({ contact: initialContact, clients }: { contact: Contact, clients: Client[] }) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) focusEditFieldAtStart(nameInputRef.current);
  }, [isEditing]);

  const [formData, setFormData] = useState({
    clientId: initialContact.clientId,
    name: initialContact.name,
    title: initialContact.title || '',
    email: initialContact.email || '',
    phone: initialContact.phone || '',
    notes: initialContact.notes || '',
  });

  const handleUpdate = async () => {
    if (!formData.name || !formData.clientId) {
      setError('Client and Name are required');
      return;
    }
    
    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('clientId', formData.clientId);
      data.append('name', formData.name);
      data.append('title', formData.title);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('notes', formData.notes);

      const result = await updateContact(contact.id, {}, data);
      
      if (result?.error) {
        setError(result.error);
      } else {
        const selectedClient = clients.find(c => c.id === formData.clientId);
        setContact({
          ...contact,
          ...formData,
          client: selectedClient || contact.client,
          title: formData.title || null,
          email: formData.email || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
        });
        setIsEditing(false);
      }
    } catch (e) {
      setError('An error occurred while updating the contact.');
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
          title={isEditing ? "Edit Contact" : "Contact Details"} 
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
                  clientId: contact.clientId,
                  name: contact.name,
                  title: contact.title || '',
                  email: contact.email || '',
                  phone: contact.phone || '',
                  notes: contact.notes || '',
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
                if (!confirm('Are you sure you want to delete this contact?')) return;
                const result = await deleteContact(contact.id);
                if (result.success) {
                  setIsOpen(false);
                } else {
                  alert(result.error || 'Failed to delete contact');
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
        {!isEditing ? (
          // VIEW MODE (form field style)
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.75fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Column 1: Name + Title + Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input readOnly type="text" value={contact.name || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <input readOnly type="text" value={contact.title || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
                <select disabled value={contact.clientId} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
                  <option value=""></option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
            </div>

            {/* Column 2: Email + Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                <input readOnly type="email" value={contact.email || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input readOnly type="tel" value={formatPhone(contact.phone)} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Full width below: Notes + Created */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea readOnly value={contact.notes || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{new Date(contact.createdAt).toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{new Date(contact.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE - matching view layout
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.75fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  onFocus={handleEditFieldFocus}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                  onFocus={handleEditFieldFocus}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
                <select
                  value={formData.clientId}
                  onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  className="form-input"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                  onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}
                >
                  <option value=""></option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                <input
                  {...editEmailInputProps}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  onFocus={handleEditFieldFocus}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  onFocus={handleEditFieldFocus}
                />
              </div>
            </div>

            {/* Notes - full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
                }}              ></textarea>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', height: '2.5rem' }} />
            {error && (
              <div style={{ gridColumn: '1 / -1', color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </Modal>
      )}
    </>
  );
}
