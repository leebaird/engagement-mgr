'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateClientFromDetail, deleteClientFromDetail } from '@/app/actions/client';
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

const EDIT_FORM_ID = 'edit-client-form';
import { formatPhone } from '@/lib/format';
import {
  focusEditFieldAtStart,
  handleClientEditFieldBlur,
  handleClientEditFieldFocus,
} from '@/lib/edit-field-focus';

interface Client {
  id: string;
  company: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function ClientDetailButton({
  client: initialClient,
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
  client: Client;
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
  const [client] = useState(initialClient);
  const [formData, setFormData] = useState({
    company: initialClient.company,
    address: initialClient.address || '',
    city: initialClient.city || '',
    state: initialClient.state || '',
    zip: initialClient.zip || '',
    website: initialClient.website || '',
    phone: initialClient.phone || '',
    notes: initialClient.notes || '',
  });

  const [cityError, setCityError] = useState(false);
  const [stateError, setStateError] = useState(false);
  const [zipError, setZipError] = useState(false);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const hasNumbers = /[0-9]/.test(val);
    const hasSymbols = /[^A-Za-z\s]/.test(val);
    setCityError(hasNumbers || hasSymbols);
    setFormData({ ...formData, city: val });
  };

  const validStates = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
  ];

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    const isValid = validStates.includes(val) || val === '';
    setStateError(!isValid);
    setFormData({ ...formData, state: val });
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const isValid = /^\d{5}(-\d{4})?$/.test(val) || val === '';
    setZipError(!isValid);
    setFormData({ ...formData, zip: val });
  };

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        company: client.company,
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || '',
        website: client.website || '',
        phone: client.phone || '',
        notes: client.notes || '',
      });
      focusEditFieldAtStart(nameInputRef.current);
    }
  }, [isEditing, client]);

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
          title={showDeleteConfirm ? 'Delete Client' : isEditing ? 'Edit Client' : 'Client Details'}
          headerActions={isEditing ? (
            <>
              <button
                key="save"
                type="submit"
                form={EDIT_FORM_ID}
                className="btn-save"
                style={{ boxShadow: 'none' }}
              >
                Save
              </button>
              <DetailEditCancelLink viewHref={viewHref} />
            </>
          ) : isAdmin ? (
            <DetailViewModeActions
              editHref={editHref}
              deleteConfirmHref={deleteConfirmHref}
              showDeleteConfirm={showDeleteConfirm}
              deleteFormId="delete-client-form"
              deleteFormAction={deleteClientFromDetail}
              recordId={client.id}
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
          // VIEW MODE - matching edit layout & typography
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left column - Name, Address, City, State, Zip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input readOnly type="text" value={client.company} className="form-input" style={{ minWidth: '340px', width: '100%', pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
                <input readOnly type="text" value={client.address || ''} className="form-input" style={{ minWidth: '340px', width: '100%', pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>City</div>
                <input readOnly type="text" value={client.city || ''} className="form-input" style={{ minWidth: '340px', width: '100%', pointerEvents: 'none' }} />
              </div>
              <div className="client-state-zip-row">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>State</div>
                  <input readOnly type="text" value={client.state || ''} className="form-input" style={{ textTransform: 'uppercase', maxWidth: '60px', pointerEvents: 'none' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Zip</div>
                  <input readOnly type="text" value={client.zip || ''} className="form-input client-zip-input" style={{ pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            {/* Right column - Website + Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Website</div>
                <input readOnly type="text" value={client.website || ''} className="form-input" style={{ width: '70%', marginLeft: 'auto', pointerEvents: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input readOnly type="tel" value={formatPhone(client.phone)} className="form-input" style={{ width: '70%', marginLeft: 'auto', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Notes - full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <textarea readOnly value={client.notes || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
            </div>

            {/* Timestamps - full width */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{new Date(client.createdAt).toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{new Date(client.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ) : (
          <form
            id={EDIT_FORM_ID}
            action={updateClientFromDetail}
            onSubmit={(e) => {
              if (cityError || stateError || zipError) {
                e.preventDefault();
                alert('Please fix the highlighted fields before saving.');
              }
            }}
          >
            <DetailEditFormFields recordId={client.id} sort={sort} dir={dir} />
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left column - matches new record form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input
                  ref={nameInputRef}
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="form-input"
                  style={{ minWidth: '340px', width: '100%' }}
                  maxLength={30}
                  onFocus={handleClientEditFieldFocus}
                  onBlur={handleClientEditFieldBlur}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
                <input
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  style={{ minWidth: '340px', width: '100%' }}
                  maxLength={30}
                  onFocus={handleClientEditFieldFocus}
                  onBlur={handleClientEditFieldBlur}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>City</div>
                <input
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleCityChange}
                  className={`form-input ${cityError ? 'field-error' : ''}`}
                  pattern="[A-Za-z\s]+"
                  title="Only letters and spaces are allowed"
                  style={{ minWidth: '340px', width: '100%' }}
                  maxLength={30}
                  onFocus={handleClientEditFieldFocus}
                  onBlur={handleClientEditFieldBlur}
                />
                {cityError && <span className="text-error" style={{ fontSize: '0.7rem' }}>Only letters and spaces allowed</span>}
              </div>
              <div>
                <div className="client-state-zip-row">
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>State</div>
                    <input
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={handleStateChange}
                      className={`form-input ${stateError ? 'field-error' : ''}`}
                      maxLength={2}
                      pattern="[A-Za-z]{2}"
                      title="Two letter state code"
                      style={{ textTransform: 'uppercase', maxWidth: '60px' }}
                      onFocus={handleClientEditFieldFocus}
                      onBlur={handleClientEditFieldBlur}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Zip</div>
                    <input
                      name="zip"
                      type="text"
                      value={formData.zip}
                      onChange={handleZipChange}
                      className={`form-input client-zip-input ${zipError ? 'field-error' : ''}`}
                      maxLength={10}
                      pattern="^\\d{5}(-\\d{4})?$"
                      title="ZIP code must be 12345 or 12345-6789"
                      onFocus={handleClientEditFieldFocus}
                      onBlur={handleClientEditFieldBlur}
                    />
                  </div>
                </div>
                {stateError ? <span className="text-error" style={{ fontSize: '0.7rem' }}>Invalid state code</span> : null}
                {zipError ? <span className="text-error" style={{ fontSize: '0.7rem', display: 'block' }}>ZIP must be 12345 or 12345-6789</span> : null}
              </div>
            </div>

            {/* Right column - Website above Phone, aligned with Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Website</div>
                <input
                  name="website"
                  type="text"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="form-input"
                  style={{ width: '70%', marginLeft: 'auto' }}
                  onFocus={handleClientEditFieldFocus}
                  onBlur={handleClientEditFieldBlur}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  style={{ width: '70%', marginLeft: 'auto' }}
                  onFocus={handleClientEditFieldFocus}
                  onBlur={handleClientEditFieldBlur}
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
                onFocus={handleClientEditFieldFocus}
                onBlur={handleClientEditFieldBlur}
                onKeyDown={e => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    nameInputRef.current?.focus();
                  }
                }}
              />
            </div>

            {saveErrorMessage(saveError) ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
              </div>
            ) : null}

            <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem', visibility: 'hidden' }}>
                <div>Created</div>
                <div></div>
                <div>Updated</div>
                <div></div>
              </div>
            </div>
          </div>
          </form>
        )}
      </Modal>
      )}
    </>
  );
}
