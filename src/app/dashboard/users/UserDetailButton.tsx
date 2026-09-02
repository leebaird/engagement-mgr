'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateUserFromDetail, deleteUserFromDetail } from '@/app/actions/user';
import {
  DetailDeleteConfirmBody,
  DETAIL_DELETE_MODAL_WIDTH,
  DetailEditCancelLink,
  DetailEditFormFields,
  DetailSaveErrorBanner,
  DetailViewModeActions,
  saveErrorMessage,
} from '@/components/DetailModalActions';

const EDIT_FORM_ID = 'edit-user-form';
import { focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';
import { DisplayDate } from '@/components/DateTimePreferencesProvider';


interface User {
  id: string;
  username: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastPasswordChange: Date;
}

export function UserDetailButton({
  user: initialUser,
  isLastAdmin = false,
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
  user: User;
  isLastAdmin?: boolean;
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
  const [user] = useState(initialUser);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    username: initialUser.username,
    password: '',
    role: initialUser.role,
  });

  useEffect(() => {
    if (isEditing) {
      queueMicrotask(() => {
        setFormData({
          username: user.username,
          password: '',
          role: user.role,
        });
        focusEditFieldAtStart(usernameInputRef.current);
      });
    }
  }, [isEditing, user.username, user.role]);

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
          title={showDeleteConfirm ? 'Delete User' : isEditing ? 'Edit User' : 'User Details'}
        maxWidth={showDeleteConfirm ? DETAIL_DELETE_MODAL_WIDTH : '450px'}
        headerActions={isEditing ? (
          <>
            <button key="save" type="submit" form={EDIT_FORM_ID} className="btn-save" style={{ boxShadow: 'none' }}>Save</button>
            <DetailEditCancelLink viewHref={viewHref} />
          </>
        ) : (
          <DetailViewModeActions
            editHref={editHref}
            deleteConfirmHref={deleteConfirmHref}
            showDeleteConfirm={showDeleteConfirm}
            deleteFormId="delete-user-form"
            deleteFormAction={deleteUserFromDetail}
            recordId={user.id}
            viewHref={viewHref}
            sort={sort}
            dir={dir}
            deleteLinkDisabled={isLastAdmin}
            deleteLinkTitle={isLastAdmin ? 'Cannot delete the last admin account' : undefined}
          />
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
          {showDeleteConfirm ? (
            <DetailDeleteConfirmBody deleteError={deleteError} />
          ) : (
          <>
          {isEditing ? (
            <form id={EDIT_FORM_ID} action={updateUserFromDetail}>
              <DetailEditFormFields recordId={user.id} sort={sort} dir={dir} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</div>
              <input
                ref={usernameInputRef}
                name="username"
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
          </div>

          <div style={{ width: '7rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Role</div>
              <select
                name="role"
                value={formData.role}
                onChange={e => {
                  if (isLastAdmin && e.target.value === 'User') return;
                  setFormData({ ...formData, role: e.target.value });
                }}
                className="form-input"
                required
                tabIndex={2}
                onFocus={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
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
                <option value="Admin">Admin</option>
                <option value="User" disabled={isLastAdmin}>User</option>
              </select>
          </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                New Password (leave blank to keep current)
              </div>
              <input
                name="password"
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

          {isLastAdmin ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              This is the only admin account. Role cannot be changed to User.
            </div>
          ) : null}

          {saveErrorMessage(saveError) ? (
            <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
          ) : null}
              </div>
            </form>
          ) : (
          <>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</div>
              <input
                readOnly
                type="text"
                value={user.username}
                className="form-input"
                style={{ pointerEvents: 'none', width: '100%' }}
              />
          </div>

          <div style={{ width: '7rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Role</div>
              <input
                readOnly
                type="text"
                value={user.role === 'Admin' ? 'Admin' : 'User'}
                className="form-input"
                style={{ pointerEvents: 'none' }}
              />
          </div>

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div><DisplayDate value={user.createdAt} /></div>
                <div>Updated</div>
                <div><DisplayDate value={user.updatedAt} /></div>
              </div>
            </div>
          </>
          )}
          </>
          )}
        </div>
      </Modal>
      )}
    </>
  );
}
