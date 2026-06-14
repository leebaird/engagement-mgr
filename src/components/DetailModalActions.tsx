'use client';

import type { ReactNode } from 'react';

const DELETE_ERRORS: Record<string, string> = {
  generic: 'Delete failed.',
  unauthorized: 'Unauthorized.',
  'last-admin': 'Cannot delete the last admin account.',
  self: 'You cannot delete yourself.',
};

const SAVE_ERRORS: Record<string, string> = {
  generic: 'Save failed.',
  unauthorized: 'Unauthorized.',
  'last-admin': 'Cannot remove the last admin account.',
  duplicate: 'A record with that value already exists.',
  password: 'The password must be at least 16 characters long, contain at least one uppercase letter, one number, and one symbol.',
};

export function deleteErrorMessage(code?: string): string | null {
  if (!code) return null;
  return DELETE_ERRORS[code] ?? DELETE_ERRORS.generic;
}

export function saveErrorMessage(code?: string): string | null {
  if (!code) return null;
  return SAVE_ERRORS[code] ?? SAVE_ERRORS.generic;
}

export function DetailDeleteConfirmBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        color: '#ff8888',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.25)',
        borderRadius: '8px',
      }}
    >
      {message}
    </div>
  );
}

export function DetailDeletePrompt() {
  return (
    <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
      Are you sure you want to delete this record? This cannot be undone.
    </p>
  );
}

export const DETAIL_DELETE_MODAL_WIDTH = '450px';

export function DetailDeleteConfirmBody({
  deleteError,
  children,
}: {
  deleteError?: string;
  children?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
      <DetailDeletePrompt />
      {children}
      {deleteErrorMessage(deleteError) ? (
        <DetailDeleteConfirmBanner message={deleteErrorMessage(deleteError)!} />
      ) : null}
    </div>
  );
}

type HiddenFields = Record<string, string | undefined>;

export function DetailViewModeActions({
  editHref,
  deleteConfirmHref,
  showDeleteConfirm,
  deleteFormId,
  deleteFormAction,
  recordId,
  viewHref,
  sort,
  dir,
  extraFields,
  deleteLinkDisabled,
  deleteLinkTitle,
  childrenBeforeEdit,
}: {
  editHref: string;
  deleteConfirmHref?: string;
  showDeleteConfirm: boolean;
  deleteFormId: string;
  deleteFormAction: (formData: FormData) => Promise<void>;
  recordId: string;
  viewHref: string;
  sort?: string;
  dir?: string;
  extraFields?: HiddenFields;
  deleteLinkDisabled?: boolean;
  deleteLinkTitle?: string;
  childrenBeforeEdit?: ReactNode;
}) {
  if (showDeleteConfirm) {
    return (
      <>
        <button
          type="submit"
          form={deleteFormId}
          className="modal-action-btn modal-action-btn--danger"
        >
          Confirm Delete
        </button>
        <a href={viewHref} className="btn-cancel" style={{ boxShadow: 'none', textDecoration: 'none' }}>
          Cancel
        </a>
        <DetailDeleteHiddenForm
          id={deleteFormId}
          action={deleteFormAction}
          recordId={recordId}
          sort={sort}
          dir={dir}
          extraFields={extraFields}
        />
      </>
    );
  }

  return (
    <>
      {childrenBeforeEdit}
      <a href={editHref} className="modal-action-btn" style={{ textDecoration: 'none' }}>
        Edit
      </a>
      {deleteLinkDisabled ? (
        <span
          className="modal-action-btn modal-action-btn--danger"
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
          title={deleteLinkTitle}
        >
          Delete
        </span>
      ) : deleteConfirmHref ? (
        <a
          href={deleteConfirmHref}
          className="modal-action-btn modal-action-btn--danger"
          style={{ textDecoration: 'none' }}
        >
          Delete
        </a>
      ) : null}
    </>
  );
}

export function DetailEditCancelLink({ viewHref }: { viewHref: string }) {
  return (
    <a href={viewHref} className="btn-cancel" style={{ boxShadow: 'none', textDecoration: 'none' }}>
      Cancel
    </a>
  );
}

export function DetailSaveErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
      {message}
    </div>
  );
}

export function DetailEditFormFields({
  recordId,
  sort,
  dir,
  extraFields,
}: {
  recordId: string;
  sort?: string;
  dir?: string;
  extraFields?: HiddenFields;
}) {
  return (
    <>
      <input type="hidden" name="id" value={recordId} />
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      {dir ? <input type="hidden" name="dir" value={dir} /> : null}
      {extraFields
        ? Object.entries(extraFields).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )
        : null}
    </>
  );
}

function DetailDeleteHiddenForm({
  id,
  action,
  recordId,
  sort,
  dir,
  extraFields,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  recordId: string;
  sort?: string;
  dir?: string;
  extraFields?: HiddenFields;
}) {
  return (
    <form id={id} action={action} style={{ display: 'none' }} aria-hidden>
      <input type="hidden" name="id" value={recordId} />
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      {dir ? <input type="hidden" name="dir" value={dir} /> : null}
      {extraFields
        ? Object.entries(extraFields).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )
        : null}
    </form>
  );
}