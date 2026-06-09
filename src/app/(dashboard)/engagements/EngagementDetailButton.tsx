'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateEngagement, deleteEngagement } from '@/app/actions/engagement';
import { EngagementScheduleModal } from './EngagementScheduleModal';
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
  const [isOpen, setIsOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEngagement(initialEngagement);
    setFindings(mapEngagementFindings(initialEngagement.findings));
  }, [initialEngagement]);

  const [formData, setFormData] = useState({
    codeName: initialEngagement.codeName,
    clientName: initialEngagement.client?.company || '',
    chargeCode: initialEngagement.chargeCode || '',
    type: initialEngagement.type || '',
    location: initialEngagement.location || '',
    status: initialEngagement.status || '',
    focus: initialEngagement.focus || '',
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

  const timestampsFooter = (
    <div className="engagement-form-timestamps">
      <div>Created</div>
      <div>{new Date(engagement.createdAt).toLocaleDateString()}</div>
      <div>Updated</div>
      <div>{new Date(engagement.updatedAt).toLocaleDateString()}</div>
    </div>
  );

  const findingsSection = (
    <section className="glass-panel engagement-findings-section">
      <EngagementFindingsPanel
        engagementId={engagement.id}
        findings={findings}
        onFindingsChange={setFindings}
      />
    </section>
  );

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
          onClose={() => { setIsOpen(false); setIsScheduleOpen(false); setIsEditing(false); setError(null); }} 
          title={isEditing ? "Edit Engagement" : "Engagement Details"} 
        maxWidth="1500px"
        alignTop
        headerExtra={findingsSection}
        headerActions={isEditing ? (
          <>
            <button key="save" onClick={handleUpdate} className="btn-save" style={{ boxShadow: 'none' }} disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
            <button key="cancel" onClick={() => { setIsEditing(false); setError(null); }} className="btn-cancel" style={{ boxShadow: 'none' }}>Cancel</button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="modal-action-btn"
              onClick={() => setIsScheduleOpen(true)}
            >
              Schedule
            </button>
            <button
              type="button"
              className="modal-action-btn"
              onClick={() => {
                setFormData({
                  codeName: engagement.codeName,
                  clientName: engagement.client?.company || '',
                  chargeCode: engagement.chargeCode || '',
                  type: engagement.type || '',
                  location: engagement.location || '',
                  status: engagement.status || '',
                  focus: engagement.focus || '',
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
            >
              Edit
            </button>
            <button
              type="button"
              className="modal-action-btn modal-action-btn--danger"
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this engagement?')) return;
                const result = await deleteEngagement(engagement.id);
                if (result.success) {
                  setIsOpen(false);
                } else {
                  alert(result.error || 'Failed to delete engagement');
                }
              }}
            >
              Delete
            </button>
          </>
        )}
      >
        <div className="engagement-create-form">
          <EngagementFormFields
            readOnly={!isEditing}
            values={isEditing ? formData : engagementToFormValues(engagement)}
            onFieldChange={isEditing ? (field, value) => setFormData((prev) => ({ ...prev, [field]: value })) : undefined}
            clients={clients}
            contacts={contacts}
            operators={operators}
            selectedOps={isEditing ? selectedOps : (engagement.operators?.map((o: any) => o.id) || [])}
            setSelectedOps={isEditing ? setSelectedOps : noop}
            opsOpen={isEditing ? opsOpen : false}
            setOpsOpen={isEditing ? setOpsOpen : noop}
            selectedContacts={isEditing ? selectedContacts : (engagement.contacts?.map((c: any) => c.id) || [])}
            setSelectedContacts={isEditing ? setSelectedContacts : noop}
            contactsOpen={isEditing ? contactsOpen : false}
            setContactsOpen={isEditing ? setContactsOpen : noop}
            selectedTAs={isEditing ? selectedTAs : (engagement.trustedAgents?.map((t: any) => t.id) || [])}
            setSelectedTAs={isEditing ? setSelectedTAs : noop}
            tasOpen={isEditing ? tasOpen : false}
            setTasOpen={isEditing ? setTasOpen : noop}
            dropdownRef={dropdownRef}
            contactDropdownRef={contactDropdownRef}
            taDropdownRef={taDropdownRef}
            codeNameRef={codeNameInputRef}
            notesRef={notesRef}
            contactsTriggerRef={contactsTriggerRef}
            taTriggerRef={taTriggerRef}
            operatorsTriggerRef={operatorsTriggerRef}
            footer={timestampsFooter}
          />
          {isEditing && error ? (
            <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>
          ) : null}
        </div>
      </Modal>
      )}

      <EngagementScheduleModal
        engagement={engagement}
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onUpdated={(updated) => {
          const toNullableDate = (value: string | Date | null | undefined) => {
            if (!value) return null;
            return value instanceof Date ? value : new Date(value);
          };
          setEngagement({
            ...engagement,
            startPrep: toNullableDate(updated.startPrep),
            endPrep: toNullableDate(updated.endPrep),
            startRecon: toNullableDate(updated.startRecon),
            endRecon: toNullableDate(updated.endRecon),
            startTesting: toNullableDate(updated.startTesting),
            endTesting: toNullableDate(updated.endTesting),
            startReporting: toNullableDate(updated.startReporting),
            endReporting: toNullableDate(updated.endReporting),
            outbrief: toNullableDate(updated.outbrief),
          });
        }}
      />
    </>
  );
}
