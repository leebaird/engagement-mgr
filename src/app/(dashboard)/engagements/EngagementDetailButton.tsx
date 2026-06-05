'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateEngagement, deleteEngagement } from '@/app/actions/engagement';
import { focusEditFieldAtStart } from '@/lib/edit-field-focus';
import { EngagementFormFields, engagementToFormValues } from './EngagementFormFields';
import {
  EngagementFindingsPanel,
  type EngagementFindingSummary,
} from './EngagementFindingsPanel';

const noop = () => {};

function mapEngagementFindings(findings: any[] = []): EngagementFindingSummary[] {
  return findings.map((f) => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    category: f.category,
    background: f.background,
    remediation: f.remediation,
    supportingData: f.supportingData,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    observation: f.engagementContext?.observation ?? null,
    affectedHosts: f.engagementContext?.affectedHosts ?? null,
  }));
}

export function EngagementDetailButton({
  engagement: initialEngagement,
  clients,
  contacts,
  operators
}: {
  engagement: any,
  clients: { id: string, company: string }[],
  contacts: { id: string, name: string, clientId: string }[],
  operators: { id: string, name: string, title: string | null }[]
}) {
  const [engagement, setEngagement] = useState(initialEngagement);
  const [findings, setFindings] = useState<EngagementFindingSummary[]>(
    mapEngagementFindings(initialEngagement.findings)
  );

  useEffect(() => {
    setEngagement(initialEngagement);
    setFindings(mapEngagementFindings(initialEngagement.findings));
  }, [initialEngagement]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    codeName: initialEngagement.codeName,
    clientName: initialEngagement.client?.company || '',
    chargeCode: initialEngagement.chargeCode || '',
    type: initialEngagement.type || '',
    location: initialEngagement.location || '',
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
  const codeNameInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const operatorsTriggerRef = useRef<HTMLDivElement>(null);
  const contactsTriggerRef = useRef<HTMLDivElement>(null);
  const taTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) focusEditFieldAtStart(codeNameInputRef.current);
  }, [isEditing]);

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
    if (!formData.codeName.trim() || !formData.clientName.trim()) {
      setError('Code Name and Client are required.');
      return;
    }
    
    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('clientId', engagement.clientId);
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
        const updatedClient =
          clients.find((c) => c.company.toLowerCase() === formData.clientName.trim().toLowerCase()) ||
          engagement.client;
        setEngagement({
          ...engagement,
          ...formData,
          clientId: updatedClient?.id ?? engagement.clientId,
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

  const findingsSection = (
    <section className="glass-panel engagement-findings-section">
      <EngagementFindingsPanel
        engagementId={engagement.id}
        findings={findings}
        onFindingsChange={setFindings}
      />
    </section>
  );

  const createdUpdatedFooter = !isEditing ? (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'max-content 1fr',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        gap: '0 0.25rem',
      }}
    >
      <div>Created</div>
      <div>{new Date(engagement.createdAt).toLocaleDateString()}</div>
      <div>Updated</div>
      <div>{new Date(engagement.updatedAt).toLocaleDateString()}</div>
    </div>
  ) : undefined;

  return (
    <>
      <button
        type="button"
        className="detail-icon-btn"
        onClick={() => setIsOpen(true)}
        title="View details"
      >
        <Eye size={16} />
      </button>

      {isOpen && (
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
                  clientName: engagement.client?.company || '',
                  chargeCode: engagement.chargeCode || '',
                  type: engagement.type || '',
                  location: engagement.location || '',
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
          <div className="engagement-create-form">
            <EngagementFormFields
              readOnly
              values={engagementToFormValues(engagement)}
              clients={clients}
              contacts={contacts}
              operators={operators}
              selectedOps={engagement.operators?.map((o: any) => o.id) || []}
              setSelectedOps={noop}
              opsOpen={false}
              setOpsOpen={noop}
              selectedContacts={engagement.contacts?.map((c: any) => c.id) || []}
              setSelectedContacts={noop}
              contactsOpen={false}
              setContactsOpen={noop}
              selectedTAs={engagement.trustedAgents?.map((t: any) => t.id) || []}
              setSelectedTAs={noop}
              tasOpen={false}
              setTasOpen={noop}
              dropdownRef={dropdownRef}
              contactDropdownRef={contactDropdownRef}
              taDropdownRef={taDropdownRef}
              codeNameRef={codeNameInputRef}
              notesRef={notesRef}
              contactsTriggerRef={contactsTriggerRef}
              taTriggerRef={taTriggerRef}
              operatorsTriggerRef={operatorsTriggerRef}
              column2Extra={findingsSection}
              footer={createdUpdatedFooter}
            />
          </div>
        ) : (
          <div className="engagement-create-form">
            <EngagementFormFields
              clients={clients}
              contacts={contacts}
              operators={operators}
              selectedOps={selectedOps}
              setSelectedOps={setSelectedOps}
              opsOpen={opsOpen}
              setOpsOpen={setOpsOpen}
              selectedContacts={selectedContacts}
              setSelectedContacts={setSelectedContacts}
              contactsOpen={contactsOpen}
              setContactsOpen={setContactsOpen}
              selectedTAs={selectedTAs}
              setSelectedTAs={setSelectedTAs}
              tasOpen={tasOpen}
              setTasOpen={setTasOpen}
              dropdownRef={dropdownRef}
              contactDropdownRef={contactDropdownRef}
              taDropdownRef={taDropdownRef}
              codeNameRef={codeNameInputRef}
              notesRef={notesRef}
              contactsTriggerRef={contactsTriggerRef}
              taTriggerRef={taTriggerRef}
              operatorsTriggerRef={operatorsTriggerRef}
              values={formData}
              onFieldChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
              column2Extra={findingsSection}
            />
            {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}
          </div>
        )}
      </Modal>
      )}
    </>
  );
}
