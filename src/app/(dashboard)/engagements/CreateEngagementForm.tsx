'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createEngagement } from '@/app/actions/engagement';
import { ChevronDown } from 'lucide-react';

export function CreateEngagementForm({
  clients, contacts, operators, onSuccess
}: {
  clients: { id: string, companyName: string }[],
  contacts: { id: string, name: string, clientId: string }[],
  operators: { id: string, name: string }[],
  onSuccess?: () => void
}) {
  const [state, formAction, isPending] = useActionState(createEngagement, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [opsOpen, setOpsOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [selectedTAs, setSelectedTAs] = useState<string[]>([]);
  const [tasOpen, setTasOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const taDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpsOpen(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setContactsOpen(false);
      }
      if (taDropdownRef.current && !taDropdownRef.current.contains(event.target as Node)) {
        setTasOpen(false);
      }
    }
    if (opsOpen || contactsOpen || tasOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [opsOpen, contactsOpen, tasOpen]);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setSelectedOps([]);
      setSelectedContacts([]);
      setSelectedTAs([]);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} ref={formRef}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

        {/* Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div className="form-group">
            <label className="form-label">Code Name</label>
            <input autoFocus type="text" name="codeName" className="form-input" required style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Client</label>
            <input name="clientName" type="text" className="form-input" required list="client-list" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
            <datalist id="client-list">
              {clients.map(c => <option key={c.id} value={c.companyName} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Charge Code</label>
            <input type="text" name="chargeCode" className="form-input" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="status" className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingTop: '0.25rem', paddingBottom: '0.25rem' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
              <option value=""></option>
              <option value="PLANNING">Planning</option>
              <option value="ROE">ROE</option>
              <option value="PREP">Prep</option>
              <option value="LIVE">Live</option>
              <option value="REPORTING">Reporting</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Focus</label>
            <input type="text" name="focus" className="form-input" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select name="type" className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingTop: '0.25rem', paddingBottom: '0.25rem' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
              <option value=""></option>
              <option value="AI">AI</option>
              <option value="CODE_REVIEW">Code Review</option>
              <option value="FIREWALL">Firewall</option>
              <option value="MULTI">Multi</option>
              <option value="PENTEST">Pentest</option>
              <option value="PHISHING">Phishing</option>
              <option value="PHYSICAL">Physical</option>
              <option value="PURPLE_TEAM">Purple Team</option>
              <option value="RED_TEAM">Red Team</option>
              <option value="USB_DROP">USB Drop</option>
              <option value="VISHING">Vishing</option>
              <option value="WEB_APP">Web App</option>
              <option value="WIRELESS">Wireless</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select name="location" className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingTop: '0.25rem', paddingBottom: '0.25rem' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
              <option value=""></option>
              <option value="INTERNAL">Internal</option>
              <option value="EXTERNAL">External</option>
            </select>
          </div>
        </div> {/* close column 1 */}
        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Kickoff</label>
              <input type="date" name="kickOffDate" className="form-input" style={{ colorScheme: 'dark', paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Start</label>
              <input type="date" name="startDate" className="form-input" style={{ colorScheme: 'dark', paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
            </div>
            <div className="form-group">
              <label className="form-label">End</label>
              <input type="date" name="endDate" className="form-input" style={{ colorScheme: 'dark', paddingTop: '0.25rem', paddingBottom: '0.25rem' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Objectives</label>
            <textarea name="objectives" className="form-input" rows={2} style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Targets</label>
            <textarea name="targets" className="form-input" rows={2} style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Exclusions</label>
            <textarea name="exclusions" className="form-input" rows={2} style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea name="notes" className="form-input" rows={3} style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}></textarea>
          </div>
        </div> {/* close column 2 */}
      </div> {/* close main grid */}
      {/* Error and Success Messages */}
      {state?.error && <div className="text-error mb-4">{state.error}</div>}
      {state?.success && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{state.success}</div>}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button type="submit" className="btn-secondary" disabled={isPending} style={{ width: 'fit-content', padding: '0.6rem 2rem' }}>
          {isPending ? 'Saving...' : 'Add Engagement'}
        </button>
      </div>
    </form>
  );
}
