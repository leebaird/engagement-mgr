'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createClient } from '@/app/actions/client';

export function CreateClientForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState(createClient, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [cityError, setCityError] = useState(false);
  const [stateError, setStateError] = useState(false);
  const [zipError, setZipError] = useState(false);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setCityError(false);
      setStateError(false);
      setZipError(false);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const hasNumbers = /[0-9]/.test(val);
    const hasSymbols = /[^A-Za-z\s]/.test(val);
    setCityError(hasNumbers || hasSymbols);
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
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only show error if field is non-empty and does not match the full pattern
    const isValid = val === '' || /^\d{5}(-\d{4})?$/.test(val);
    setZipError(val !== '' && !/^\d{5}(-\d{4})?$/.test(val));
  };

  return (
    <form id="create-client-form" action={formAction} ref={formRef}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
        {/* Left column - matches edit modal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
            <input autoFocus type="text" name="companyName" className="form-input" required placeholder=" " style={{ minWidth: '340px', width: '100%' }} maxLength={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Address</div>
            <input type="text" name="address" className="form-input" style={{ minWidth: '340px', width: '100%' }} maxLength={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>City</div>
            <input 
              type="text" 
              name="city" 
              className={`form-input ${cityError ? 'field-error' : ''}`} 
              pattern="[A-Za-z\s]+" 
              title="Only letters and spaces are allowed"
              onChange={handleCityChange}
              placeholder=" "
              style={{ minWidth: '340px', width: '100%' }}
              maxLength={30}
            />
            {cityError && <span className="text-error" style={{ fontSize: '0.7rem' }}>Only letters and spaces allowed</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>State</div>
              <input 
                type="text" 
                name="state" 
                className={`form-input ${stateError ? 'field-error' : ''}`} 
                maxLength={2} 
                pattern="[A-Za-z]{2}" 
                title="Two letter state code" 
                style={{ textTransform: 'uppercase', maxWidth: '60px' }} 
                onChange={handleStateChange}
              />
              {stateError && <span className="text-error" style={{ fontSize: '0.7rem' }}>Invalid state code</span>}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Zip</div>
              <input 
                type="text" 
                name="zip" 
                className={`form-input ${zipError ? 'field-error' : ''}`} 
                maxLength={10} 
                pattern="^\\d{5}(-\\d{4})?$" 
                title="ZIP code must be 12345 or 12345-6789" 
                style={{ minWidth: '140px', width: '100%' }}
                onChange={handleZipChange}
              />
              {zipError && <span className="text-error" style={{ fontSize: '0.7rem' }}>ZIP must be 12345 or 12345-6789</span>}
            </div>
          </div>
        </div>

        {/* Right column - matches edit modal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Website</div>
            <input type="text" name="website" className="form-input" style={{ width: '260px', marginLeft: 'auto' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
            <input type="text" name="phoneNumber" className="form-input" style={{ width: '260px', marginLeft: 'auto' }} />
          </div>
        </div>

        {/* Notes - full width */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
          <textarea 
            name="notes" 
            className="form-input" 
            rows={4} 
            style={{ width: '706px' }}
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
          ></textarea>
        </div>
      </div>

      {state?.error && <div className="text-error mb-4">{state.error}</div>}
      {state?.success && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{state.success}</div>}
    </form>
  );
}
