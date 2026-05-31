'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateEngagement, deleteEngagement } from '@/app/actions/engagement';

export function EngagementDetailButton({
  engagement: initialEngagement,
  clients,
  contacts,
  operators
}: {
  engagement: any,
  clients: { id: string, company: string }[],
  contacts: { id: string, name: string, clientId: string }[],
  operators: { id: string, name: string }[]
}) {
  const router = useRouter();
  const [engagement, setEngagement] = useState(initialEngagement);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    codeName: initialEngagement.codeName,
    clientId: initialEngagement.clientId,
    type: initialEngagement.type,
    location: initialEngagement.location,
    status: initialEngagement.status || '',
    focus: initialEngagement.focus || '',
    startDate: initialEngagement.startDate ? new Date(initialEngagement.startDate).toISOString().split('T')[0] : '',
    endDate: initialEngagement.endDate ? new Date(initialEngagement.endDate).toISOString().split('T')[0] : '',
    objectives: initialEngagement.objectives || '',
    targets: initialEngagement.targets || '',
    exclusions: initialEngagement.exclusions || '',
    notes: initialEngagement.notes || '',
  });

  const [selectedOps, setSelectedOps] = useState<string[]>(initialEngagement.operators?.map((o: any) => o.id) || []);
  const [opsOpen, setOpsOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>(initialEngagement.contacts?.map((c: any) => c.id) || []);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [selectedTAs, setSelectedTAs] = useState<string[]>(initialEngagement.trustedAgents?.map((t: any) => t.id) || []);
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

  const handleUpdate = async () => {
    if (!formData.codeName || !formData.clientId || !formData.type || !formData.location) {
      setError('Required fields missing');
      return;
    }
    
    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value as string);
      });
      selectedOps.forEach(id => data.append('operators', id));
      selectedContacts.forEach(id => data.append('contacts', id));
      selectedTAs.forEach(id => data.append('trustedAgents', id));

      const result = await updateEngagement(engagement.id, {}, data);
      
      if (result?.error) {
        setError(result.error);
      } else {
        const updatedClient = clients.find(c => c.id === formData.clientId);
        setEngagement({
          ...engagement,
          ...formData,
          client: updatedClient || engagement.client,
          operators: selectedOps.map(id => operators.find(o => o.id === id)).filter(Boolean),
          contacts: selectedContacts.map(id => contacts.find(c => c.id === id)).filter(Boolean),
          trustedAgents: selectedTAs.map(id => contacts.find(c => c.id === id)).filter(Boolean),
        });
        setIsEditing(false);
      }
    } catch (e) {
      setError('An error occurred while updating the engagement.');
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
        title={isEditing ? "Edit Engagement" : "Engagement Details"} 
        maxWidth="1500px"
        headerActions={isEditing ? (
          <>
            <button key="save" onClick={handleUpdate} className="btn-save" style={{ boxShadow: 'none' }} disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
            <button key="cancel" onClick={() => { setIsEditing(false); setError(null); }} className="btn-cancel" style={{ boxShadow: 'none' }}>Cancel</button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setFormData({
                  codeName: engagement.codeName,
                  clientId: engagement.clientId,
                  type: engagement.type,
                  location: engagement.location,
                  status: engagement.status || '',
                  focus: engagement.focus || '',
                  startDate: engagement.startDate ? new Date(engagement.startDate).toISOString().split('T')[0] : '',
                  endDate: engagement.endDate ? new Date(engagement.endDate).toISOString().split('T')[0] : '',
                  objectives: engagement.objectives || '',
                  targets: engagement.targets || '',
                  exclusions: engagement.exclusions || '',
                  notes: engagement.notes || '',
                });
                setSelectedOps(engagement.operators?.map((o: any) => o.id) || []);
                setSelectedContacts(engagement.contacts?.map((c: any) => c.id) || []);
                setSelectedTAs(engagement.trustedAgents?.map((t: any) => t.id) || []);
                setIsEditing(true);
                setError(null);
              }}
              style={{
                background: 'none',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0066ff';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 102, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--surface-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Edit
            </button>
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this engagement?')) return;
                const result = await deleteEngagement(engagement.id);
                if (result.success) {
                  setIsOpen(false);
                } else {
                  alert(result.error || 'Failed to delete engagement');
                }
              }}
              style={{
                background: 'none',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#ff3366';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 51, 102, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--surface-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Delete
            </button>
          </>
        )}
      >
        {!isEditing ? (
          // VIEW MODE
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Code Name</div>
                <div style={{ fontWeight: 500 }}>{engagement.codeName || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
                <div style={{ fontWeight: 500 }}>{engagement.client?.company || '-'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
                    <div>{engagement.status ? engagement.status.charAt(0).toUpperCase() + engagement.status.slice(1).toLowerCase() : '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Location</div>
                    <div>{engagement.location || '-'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Focus</div>
                  <div>{engagement.focus || '-'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Date</div>
                  <div>{engagement.startDate ? new Date(engagement.startDate).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Date</div>
                  <div>{engagement.endDate ? new Date(engagement.endDate).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Operators</div>
                <div>{engagement.operators?.length ? engagement.operators.map((o: any) => o.name).join(', ') : '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Contacts</div>
                <div>{engagement.contacts?.length ? engagement.contacts.map((c: any) => c.name).join(', ') : '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trusted Agents</div>
                <div>{engagement.trustedAgents?.length ? engagement.trustedAgents.map((t: any) => t.name).join(', ') : '-'}</div>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
              {engagement.objectives && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Objectives</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{engagement.objectives}</div>
                </div>
              )}
              {engagement.targets && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Targets</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{engagement.targets}</div>
                </div>
              )}
              {engagement.exclusions && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Exclusions</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{engagement.exclusions}</div>
                </div>
              )}
              {engagement.notes && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{engagement.notes}</div>
                </div>
              )}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                  <div>Created</div>
                  <div>{new Date(engagement.createdAt).toLocaleDateString()}</div>
                  <div>Updated</div>
                  <div>{new Date(engagement.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Code Name</div>
                <input autoFocus type="text" value={formData.codeName} onChange={e => setFormData({...formData, codeName: e.target.value})} className="form-input" required />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
                <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="form-input" required style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
                  <option value=""></option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Type</div>
                    <select value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
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
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Location</div>
                    <select value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
                    <option value=""></option>
                    <option value="INTERNAL">Internal</option>
                    <option value="EXTERNAL">External</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
                    <option value=""></option>
                    <option value="PLANNING">Planning</option>
                    <option value="ROE">ROE</option>
                    <option value="PREP">Prep</option>
                    <option value="LIVE">Live</option>
                    <option value="REPORTING">Reporting</option>
                    <option value="COMPLETE">Complete</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Focus</div>
                  <input type="text" value={formData.focus} onChange={e => setFormData({...formData, focus: e.target.value})} className="form-input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Date</div>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="form-input" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Date</div>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="form-input" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Operators</div>
                <div 
                  className="form-input" 
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
                  onClick={() => setOpsOpen(!opsOpen)}
                >
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedOps.length === 0 ? 'Select an Operator...' : selectedOps.map(id => operators.find(o => o.id === id)?.name).join(', ')}
                  </span>
                  <ChevronDown size={16} color="var(--text-muted)" />
                </div>
                {opsOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a2e', border: '1px solid var(--surface-border)', borderRadius: '8px', marginTop: '0.25rem', zIndex: 10, maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    {operators.map(o => (
                      <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '4px', background: selectedOps.includes(o.id) ? 'rgba(255,51,102,0.1)' : 'transparent' }}>
                        <input type="checkbox" checked={selectedOps.includes(o.id)} onChange={e => { if (e.target.checked) { setSelectedOps([...selectedOps, o.id]); } else { setSelectedOps(selectedOps.filter(id => id !== o.id)); } }} style={{ accentColor: 'var(--primary-color)' }} />
                        {o.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
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
                        <input type="checkbox" checked={selectedContacts.includes(c.id)} onChange={e => { if (e.target.checked) { setSelectedContacts([...selectedContacts, c.id]); } else { setSelectedContacts(selectedContacts.filter(id => id !== c.id)); } }} style={{ accentColor: 'var(--primary-color)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}><span>{c.name}</span><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{clients.find(client => client.id === c.clientId)?.company}</span></div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }} ref={taDropdownRef}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Trusted Agents</div>
                <div 
                  className="form-input" 
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
                  onClick={() => setTasOpen(!tasOpen)}
                >
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedTAs.length === 0 ? 'Select Trusted Agents...' : selectedTAs.map(id => contacts.find(c => c.id === id)?.name).join(', ')}
                  </span>
                  <ChevronDown size={16} color="var(--text-muted)" />
                </div>
                {tasOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a2e', border: '1px solid var(--surface-border)', borderRadius: '8px', marginTop: '0.25rem', zIndex: 10, maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    {contacts.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '4px', background: selectedTAs.includes(c.id) ? 'rgba(255,51,102,0.1)' : 'transparent' }}>
                        <input type="checkbox" checked={selectedTAs.includes(c.id)} onChange={e => { if (e.target.checked) { setSelectedTAs([...selectedTAs, c.id]); } else { setSelectedTAs(selectedTAs.filter(id => id !== c.id)); } }} style={{ accentColor: 'var(--primary-color)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}><span>{c.name}</span><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{clients.find(client => client.id === c.clientId)?.company}</span></div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Full width textareas */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Objectives</div>
                <textarea value={formData.objectives} onChange={e => setFormData({...formData, objectives: e.target.value})} className="form-input" rows={2} style={{ width: '100%' }}></textarea>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Targets</div>
                <textarea value={formData.targets} onChange={e => setFormData({...formData, targets: e.target.value})} className="form-input" rows={2} style={{ width: '100%' }}></textarea>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Exclusions</div>
                <textarea value={formData.exclusions} onChange={e => setFormData({...formData, exclusions: e.target.value})} className="form-input" rows={2} style={{ width: '100%' }}></textarea>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="form-input" 
                  rows={3} 
                  style={{ width: '100%' }}
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
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', height: '2.5rem' }} />
            {error && <div style={{ gridColumn: '1 / -1', color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}
          </div>
        )}
      </Modal>
    </>
  );
}
