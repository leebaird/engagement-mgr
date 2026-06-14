'use client';
import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateEngagementFromDetail, deleteEngagementFromDetail } from '@/app/actions/engagement';
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

const EDIT_FORM_ID = 'edit-engagement-form';
import { EngagementScheduleModal } from './EngagementScheduleModal';
import { focusEditFieldAtStart } from '@/lib/edit-field-focus';
import { EngagementFormFields, engagementToFormValues } from './EngagementFormFields';
import {
  EngagementFindingsPanel,
  type EngagementFindingSummary,
} from './EngagementFindingsPanel';
import type { SearchParamRecord } from '@/lib/list-view-params';

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
  operators,
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
  activeFindingId,
  listParams = {},
  showLink = true,
  showModal = true,
}: {
  engagement: any,
  clients: { id: string, company: string }[],
  contacts: { id: string, name: string, clientId: string }[],
  operators: { id: string, name: string, title: string | null }[],
  isAdmin?: boolean,
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
  activeFindingId?: string;
  listParams?: SearchParamRecord;
  showLink?: boolean;
  showModal?: boolean;
}) {
  const [engagement, setEngagement] = useState(initialEngagement);
  const [findings, setFindings] = useState<EngagementFindingSummary[]>(
    mapEngagementFindings(initialEngagement.findings)
  );
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);


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
    if (isEditing) {
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
      focusEditFieldAtStart(codeNameInputRef.current);
    }
  }, [isEditing, engagement]);

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

  const editFormHiddenFields = isEditing ? (
    <>
      <DetailEditFormFields
        recordId={engagement.id}
        sort={sort}
        dir={dir}
        extraFields={activeFindingId ? { finding: activeFindingId } : undefined}
      />
      {Object.entries(formData).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {selectedOps.map((id) => (
        <input key={`op-${id}`} type="hidden" name="operators" value={id} />
      ))}
      {selectedContacts.map((id) => (
        <input key={`contact-${id}`} type="hidden" name="contacts" value={id} />
      ))}
      {selectedTAs.map((id) => (
        <input key={`ta-${id}`} type="hidden" name="trustedAgents" value={id} />
      ))}
    </>
  ) : null;

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
        activeFindingId={activeFindingId}
        listParams={listParams}
        engagementIdForLinks={engagement.id}
      />
    </section>
  );

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
          onClose={() => { setIsScheduleOpen(false); }}
          title={showDeleteConfirm ? 'Delete Engagement' : isEditing ? 'Edit Engagement' : 'Engagement Details'}
        maxWidth="1500px"
        alignTop
        headerExtra={findingsSection}
        headerActions={isEditing ? (
          <>
            <button key="save" type="submit" form={EDIT_FORM_ID} className="btn-save" style={{ boxShadow: 'none' }}>Save</button>
            <DetailEditCancelLink viewHref={viewHref} />
          </>
        ) : isAdmin ? (
          <DetailViewModeActions
            editHref={editHref}
            deleteConfirmHref={deleteConfirmHref}
            showDeleteConfirm={showDeleteConfirm}
            deleteFormId="delete-engagement-form"
            deleteFormAction={deleteEngagementFromDetail}
            recordId={engagement.id}
            viewHref={viewHref}
            sort={sort}
            dir={dir}
            extraFields={activeFindingId ? { finding: activeFindingId } : undefined}
            childrenBeforeEdit={
              <button
                type="button"
                className="modal-action-btn"
                onClick={() => setIsScheduleOpen(true)}
              >
                Schedule
              </button>
            }
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
        ) : (
        <div className="engagement-create-form">
          {isEditing ? (
            <form id={EDIT_FORM_ID} action={updateEngagementFromDetail}>
              {editFormHiddenFields}
              <EngagementFormFields
                readOnly={false}
                values={formData}
                onFieldChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
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
                footer={timestampsFooter}
              />
              {saveErrorMessage(saveError) ? (
                <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
              ) : null}
            </form>
          ) : (
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
              footer={timestampsFooter}
            />
          )}
        </div>
        )}
      </Modal>
      )}

      <EngagementScheduleModal
        engagement={engagement}
        isAdmin={isAdmin}
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
