'use client';
import { useState, useRef } from 'react';import { useRouter } from 'next/navigation';import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateClient, deleteClient } from '@/app/actions/client';
import { formatPhone } from '@/lib/format';

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

export function ClientDetailButton({ client: initialClient }: { client: Client }) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
        onClose={() => { setIsOpen(false); setIsEditing(false); }} 
        title={isEditing ? "Edit Client" : "Client Details"} 
        onEdit={() => {
          if (!isEditing) {
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
            setIsEditing(true);
          }
        }} 
        onDelete={async () => {
          if (!confirm('Are you sure you want to delete this client?')) return;
          const result = await deleteClient(client.id);
          if (result.success) {
            setIsOpen(false);
          } else {
            alert(result.error || 'Failed to delete client');
          }
        }} 
        hideHeaderActions={isEditing}
      >
        {!isEditing ? (
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>State</div>
                  <input readOnly type="text" value={client.state || ''} className="form-input" style={{ textTransform: 'uppercase', maxWidth: '60px', pointerEvents: 'none' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Zip</div>
                  <input readOnly type="text" value={client.zip || ''} className="form-input" style={{ minWidth: '140px', width: '100%', pointerEvents: 'none' }} />
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
              <textarea readOnly value={client.notes || ''} className="form-input" rows={3} style={{ width: '100%', pointerEvents: 'none' }} />
            </div>

            {/* Timestamps - full width */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{client.createdAt.toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{client.updatedAt.toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE - matching view layout & typography
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left column - matches new record form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
                <input
                  autoFocus
                  ref={nameInputRef}
                  type="text"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="form-input"
                  style={{ minWidth: '340px', width: '100%' }}
                  maxLength={30}
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  style={{ minWidth: '340px', width: '100%' }}
                  maxLength={30}
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>City</div>
                <input
                  type="text"
                  value={formData.city}
                  onChange={handleCityChange}
                  className={`form-input ${cityError ? 'field-error' : ''}`}
                  pattern="[A-Za-z\s]+"
                  title="Only letters and spaces are allowed"
                  style={{ minWidth: '340px', width: '100%' }}
                  maxLength={30}
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                />
                {cityError && <span className="text-error" style={{ fontSize: '0.7rem' }}>Only letters and spaces allowed</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>State</div>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={handleStateChange}
                    className={`form-input ${stateError ? 'field-error' : ''}`}
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    title="Two letter state code"
                    style={{ textTransform: 'uppercase', maxWidth: '60px' }}
                    onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                    onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                  />
                  {stateError && <span className="text-error" style={{ fontSize: '0.7rem' }}>Invalid state code</span>}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Zip</div>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={handleZipChange}
                    className={`form-input ${zipError ? 'field-error' : ''}`}
                    maxLength={10}
                    pattern="^\\d{5}(-\\d{4})?$"
                    title="ZIP code must be 12345 or 12345-6789"
                    style={{ minWidth: '140px', width: '100%' }}
                    onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                    onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                  />
                  {zipError && <span className="text-error" style={{ fontSize: '0.7rem' }}>ZIP must be 12345 or 12345-6789</span>}
                </div>
              </div>
            </div>

            {/* Right column - Website above Phone, aligned with Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Website</div>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="form-input"
                  style={{ width: '70%', marginLeft: 'auto' }}
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  style={{ width: '70%', marginLeft: 'auto' }}
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
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
                onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 255, 0.3)'}
                onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                onKeyDown={e => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    nameInputRef.current?.focus();
                  }
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'center' }}>
              <button 
                onClick={async () => {
                  if (cityError || stateError || zipError) {
                    alert('Please fix the highlighted fields before saving.');
                    return;
                  }

                  const result = await updateClient(client.id, {
                    company: formData.company,
                    address: formData.address || null,
                    city: formData.city || null,
                    state: formData.state || null,
                    zip: formData.zip || null,
                    website: formData.website || null,
                    phone: formData.phone || null,
                    notes: formData.notes || null,
                  });

                  if (result.success) {
                    setClient(prev => ({
                      ...prev,
                      company: formData.company,
                      address: formData.address || null,
                      city: formData.city || null,
                      state: formData.state || null,
                      zip: formData.zip || null,
                      website: formData.website || null,
                      phone: formData.phone || null,
                      notes: formData.notes || null,
                    }));
                    setIsEditing(false);
                  } else {
                    alert(result.error || 'Failed to save changes');
                  }
                }}
                className="btn-save"
              >
                Save
              </button>
              <button 
                onClick={() => {
                  setFormData({
                    company: client.company,
                    address: client.address || "",
                    city: client.city || "",
                    state: client.state || "",
                    zip: client.zip || "",
                    website: client.website || "",
                    phone: client.phone || "",
                    notes: client.notes || "",
                  });
                  setIsEditing(false);
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
