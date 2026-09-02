'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateContactFromDetail, deleteContactFromDetail } from '@/app/actions/contact';
import {
  DetailDeleteConfirmBody,
  DETAIL_DELETE_MODAL_WIDTH,
  DetailEditCancelLink,
  DetailEditFormFields,
  DetailSaveErrorBanner,
  DetailViewModeActions,
  saveErrorMessage,
} from '@/components/DetailModalActions';

const EDIT_FORM_ID = 'edit-contact-form';
import { DisplayDate } from '@/components/DateTimePreferencesProvider';
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

export function ContactDetailButton({
  contact: initialContact,
  clients,
  isAdmin = false,
  isDetailOpen,
  isEditing = false,
  showDeleteConfirm = false,
  detailHref,
  editHref,
  deleteConfirmHref,
  viewHref,
  closeHref,
  deleteError,
  saveError,
  sort,
  dir,
  showLink = true,
  showModal = true,
}: {
  contact: Contact;
  clients: Client[];
  isAdmin?: boolean;
  isDetailOpen: boolean;
  isEditing?: boolean;
  showDeleteConfirm?: boolean;
  detailHref: string;
  editHref: string;
  deleteConfirmHref: string;
  viewHref: string;
  closeHref: string;
  deleteError?: string;
  saveError?: string;
  sort?: string;
  dir?: string;
  showLink?: boolean;
  showModal?: boolean;
}) {
  const [contact] = useState(initialContact);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    clientId: initialContact.clientId,
    name: initialContact.name,
    title: initialContact.title || '',
    email: initialContact.email || '',
    phone: initialContact.phone || '',
    notes: initialContact.notes || '',
  });

  useEffect(() => {
    if (isEditing) {
      queueMicrotask(() => {
        setFormData({
          clientId: contact.clientId,
          name: contact.name,
          title: contact.title || '',
          email: contact.email || '',
          phone: contact.phone || '',
          notes: contact.notes || '',
        });
        focusEditFieldAtStart(nameInputRef.current);
      });
    }
  }, [isEditing, contact]);

  return (
    <>
      {showLink ? (
        <a
          href={detailHref}
          className="detail-icon-btn"
          title="View details"
        >
          <Eye size={16} />
        </a>
      ) : null}

      {showModal && isDetailOpen && (
        <Modal
          isOpen
          closeHref={closeHref}
          title={showDeleteConfirm ? 'Delete Contact' : isEditing ? 'Edit Contact' : 'Contact Details'}
          maxWidth={showDeleteConfirm ? DETAIL_DELETE_MODAL_WIDTH : undefined}
        headerActions={isEditing ? (
          <>
            <button key="save" type="submit" form={EDIT_FORM_ID} className="btn-save" style={{ boxShadow: 'none' }}>Save</button>
            <DetailEditCancelLink viewHref={viewHref} />
          </>
        ) : isAdmin ? (
          <DetailViewModeActions
            editHref={editHref}
            deleteConfirmHref={deleteConfirmHref}
            showDeleteConfirm={showDeleteConfirm}
            deleteFormId="delete-contact-form"
            deleteFormAction={deleteContactFromDetail}
            recordId={contact.id}
            viewHref={viewHref}
            sort={sort}
            dir={dir}
          />
        ) : undefined}
      >
        {showDeleteConfirm ? (
          <DetailDeleteConfirmBody deleteError={deleteError} />
        ) : !isEditing ? (
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
                <select disabled value={contact.clientId} className="form-input" style={{ pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
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
                <div><DisplayDate value={contact.createdAt} /></div>
                <div>Updated</div>
                <div><DisplayDate value={contact.updatedAt} /></div>
              </div>
            </div>
          </div>
        ) : (
          <form id={EDIT_FORM_ID} action={updateContactFromDetail}>
            <DetailEditFormFields recordId={contact.id} sort={sort} dir={dir} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.75fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input
                  ref={nameInputRef}
                  name="name"
                  type="text"
                  value={formData.name}
                  required
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  onFocus={handleEditFieldFocus}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <input
                  name="title"
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
                  name="clientId"
                  value={formData.clientId}
                  required
                  onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                  className="form-input"
                  onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
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
                  name="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  onFocus={handleEditFieldFocus}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input
                  name="phoneNumber"
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
                name="notes"
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
            {saveErrorMessage(saveError) ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
              </div>
            ) : null}
          </div>
          </form>
        )}
      </Modal>
      )}
    </>
  );
}
