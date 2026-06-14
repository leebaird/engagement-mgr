'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateOperatorFromDetail, deleteOperatorFromDetail } from '@/app/actions/operator';
import {
  DetailDeleteConfirmBanner,
  DetailDeletePrompt,
  DetailEditCancelLink,
  DetailEditFormFields,
  DetailSaveErrorBanner,
  DetailViewModeActions,
  deleteErrorMessage,
  saveErrorMessage,
} from '@/components/DetailModalActions';

const EDIT_FORM_ID = 'edit-operator-form';
import { editEmailInputProps, focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';

export function OperatorDetailButton({
  operator: initialOperator,
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
  operator: any;
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
  const [operator] = useState(initialOperator);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: operator.name,
        title: operator.title || '',
        email: operator.email || '',
        phoneNumber: operator.phoneNumber || '',
        discord: operator.discord || '',
        github: operator.github || '',
        notes: operator.notes || '',
      });
      focusEditFieldAtStart(nameInputRef.current);
    }
  }, [isEditing, operator]);

  const [formData, setFormData] = useState({
    name: initialOperator.name,
    title: initialOperator.title || '',
    email: initialOperator.email || '',
    phoneNumber: initialOperator.phoneNumber || '',
    discord: initialOperator.discord || '',
    github: initialOperator.github || '',
    notes: initialOperator.notes || '',
  });

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
          title={showDeleteConfirm ? 'Delete Operator' : isEditing ? 'Edit Operator' : 'Operator Details'}
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
            deleteFormId="delete-operator-form"
            deleteFormAction={deleteOperatorFromDetail}
            recordId={operator.id}
            viewHref={viewHref}
            sort={sort}
            dir={dir}
          />
        ) : undefined}
      >
        {showDeleteConfirm ? (
          <>
            <DetailDeletePrompt />
            {deleteErrorMessage(deleteError) ? (
              <DetailDeleteConfirmBanner message={deleteErrorMessage(deleteError)!} />
            ) : null}
          </>
        ) : !isEditing ? (
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
          <form id={EDIT_FORM_ID} action={updateOperatorFromDetail}>
            <DetailEditFormFields recordId={operator.id} sort={sort} dir={dir} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input ref={nameInputRef} name="name" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                <select name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
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
                <input {...editEmailInputProps} name="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Discord</div>
                <input name="discord" type="text" value={formData.discord} onChange={e => setFormData({...formData, discord: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>GitHub</div>
                <input name="github" type="text" value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} className="form-input" onFocus={handleEditFieldFocus} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea
                name="notes"
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
            {saveErrorMessage(saveError) ? (
              <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
            ) : null}
          </div>
          </form>
        )}
      </Modal>
      )}
    </>
  );
}