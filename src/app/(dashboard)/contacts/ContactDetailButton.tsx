'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateContact, deleteContact } from '@/app/actions/contact';

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
      data.append('phoneNumber', formData.phoneNumber);
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
          phoneNumber: formData.phoneNumber || null,
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
        title={isEditing ? "Edit Contact" : "Contact Details"} 
        onEdit={() => {
          if (!isEditing) {
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
          }
        }} 
        onDelete={async () => {
          if (!confirm('Are you sure you want to delete this contact?')) return;
          const result = await deleteContact(contact.id);
          if (result.success) {
            setIsOpen(false);
          } else {
            alert(result.error || 'Failed to delete contact');
          }
        }} 
        hideHeaderActions={isEditing}
      >
        {!isEditing ? (
          // VIEW MODE (form field style)
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Column 1: Client + Name + Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
                <select disabled value={contact.clientId} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
                  <option value=""></option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input readOnly type="text" value={contact.name || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <input readOnly type="text" value={contact.title || ''} className="form-input" style={{ pointerEvents: 'none' }} />
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
                <input readOnly type="tel" value={contact.phone || ''} className="form-input" style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Full width below: Notes + Created */}
            <div style={{ gridColumn: '1 / -1', marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea readOnly value={contact.notes || ''} className="form-input" rows={3} style={{ width: '100%', pointerEvents: 'none' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', height: '2.5rem' }}>
              Created {new Date(contact.createdAt).toLocaleDateString()}<br />
              Edited {new Date(contact.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ) : (
          // EDIT MODE - matching view layout
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
                <select
                  autoFocus
                  value={formData.clientId}
                  onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  className="form-input"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                  onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}
                >
                  <option value=""></option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="form-input"
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
                style={{ width: '100%' }}                onKeyDown={e => {
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

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button 
                  onClick={handleUpdate}
                  className="btn-save" 
                  disabled={isPending}
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setError(null); }}
                  className="btn-cancel" 
                >
                  Cancel
                </button>
              </div>
            
            {error && (
              <div style={{ gridColumn: '1 / -1', color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
