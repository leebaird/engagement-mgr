'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createEngagement } from '@/app/actions/engagement';
import { ChevronDown } from 'lucide-react';

export function CreateEngagementForm({
  clients, contacts, operators, onSuccess
}: {
  clients: { id: string, company: string }[],
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
      {/* Hidden inputs so multi-selects submit to the server action */}
      {selectedContacts.map(id => <input type="hidden" key={id} name="contacts" value={id} />)}
      {selectedTAs.map(id => <input type="hidden" key={id} name="trustedAgents" value={id} />)}
      {selectedOps.map(id => <input type="hidden" key={id} name="operators" value={id} />)}

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
              {clients.map(c => <option key={c.id} value={c.company} />)}
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

        {/* Column 3 - Multi-select relationships */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Contacts */}
          <div style={{ position: 'relative' }} ref={contactDropdownRef}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Contacts</div>
            <div
              className="form-input"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
              onClick={() => setContactsOpen(!contactsOpen)}
            >
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedContacts.length === 0 ? 'Select Contacts...' : selectedContacts.map(id => contacts.find(c => c.id === id)?.name).join(', ')}
              </span>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
            {contactsOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a2e', border: '1px solid var(--surface-border)', borderRadius: '8px', marginTop: '0.25rem', zIndex: 10, maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {contacts.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '4px', background: selectedContacts.includes(c.id) ? 'rgba(255,51,102,0.1)' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedContacts([...selectedContacts, c.id]);
                        } else {
                          setSelectedContacts(selectedContacts.filter(id => id !== c.id));
                        }
                      }}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {clients.find(client => client.id === c.clientId)?.company}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Trusted Agents (max 2) */}
          <div style={{ position: 'relative' }} ref={taDropdownRef}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trusted Agents</div>
            <div
              className="form-input"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
              onClick={() => setTasOpen(!tasOpen)}
            >
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedTAs.length === 0 ? 'Select 1-2 Trusted Agents...' : selectedTAs.map(id => contacts.find(c => c.id === id)?.name).join(', ')}
              </span>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
            {tasOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a2e', border: '1px solid var(--surface-border)', borderRadius: '8px', marginTop: '0.25rem', zIndex: 10, maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {contacts.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '4px', background: selectedTAs.includes(c.id) ? 'rgba(255,51,102,0.1)' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={selectedTAs.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          if (selectedTAs.length < 2) {
                            setSelectedTAs([...selectedTAs, c.id]);
                          }
                        } else {
                          setSelectedTAs(selectedTAs.filter(id => id !== c.id));
                        }
                      }}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {clients.find(client => client.id === c.clientId)?.company}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Operators */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Operators</div>
            <div
              className="form-input"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
              onClick={() => setOpsOpen(!opsOpen)}
            >
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOps.length === 0 ? 'Select Operators...' : selectedOps.map(id => operators.find(o => o.id === id)?.name).join(', ')}
              </span>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
            {opsOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a2e', border: '1px solid var(--surface-border)', borderRadius: '8px', marginTop: '0.25rem', zIndex: 10, maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {operators.map(o => (
                  <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '4px', background: selectedOps.includes(o.id) ? 'rgba(255,51,102,0.1)' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={selectedOps.includes(o.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedOps([...selectedOps, o.id]);
                        } else {
                          setSelectedOps(selectedOps.filter(id => id !== o.id));
                        }
                      }}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    {o.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
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
