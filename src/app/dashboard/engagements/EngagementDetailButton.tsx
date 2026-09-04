'use client';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateEngagementFromDetail, deleteEngagementFromDetail } from '@/app/actions/engagement';
import {
  DetailDeleteConfirmBody,
  DETAIL_DELETE_MODAL_WIDTH,
  DetailEditCancelLink,
  DetailEditFormFields,
  DetailSaveErrorBanner,
  DetailViewModeActions,
  saveErrorMessage,
} from '@/components/DetailModalActions';

const EDIT_FORM_ID = 'edit-engagement-form';
import { EngagementScheduleModal } from './EngagementScheduleModal';
import { focusEditFieldAtStart } from '@/lib/edit-field-focus';
import { EngagementFormFields, engagementToFormValues } from './EngagementFormFields';
import { EngagementDetailView, type EngagementDetailTab } from './EngagementDetailView';
import {
  EngagementFindingsPanel,
  type EngagementFindingSummary,
} from './EngagementFindingsPanel';
import type { SearchParamRecord } from '@/lib/list-view-params';
import { DisplayDate } from '@/components/DateTimePreferencesProvider';

type EngagementRelation = { id: string };

type EngagementFindingForDetail = {
  id: string;
  version?: number;
  title: string;
  severity: string;
  category: string | null;
  background: string | null;
  remediation: string | null;
  supportingData: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  engagementContext?: {
    observation?: string | null;
    affectedHosts?: string | null;
  } | null;
};

type EngagementForDetail = {
  id: string;
  codeName: string;
  client?: { id: string; company: string } | null;
  chargeCode?: string | null;
  status?: string | null;
  focus?: string | null;
  type?: string | null;
  location?: string | null;
  objectives?: string | null;
  targets?: string | null;
  exclusions?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  operators?: EngagementRelation[];
  contacts?: EngagementRelation[];
  trustedAgents?: EngagementRelation[];
  findings?: EngagementFindingForDetail[];
  startPrep?: string | Date | null;
  endPrep?: string | Date | null;
  startRecon?: string | Date | null;
  endRecon?: string | Date | null;
  startTesting?: string | Date | null;
  endTesting?: string | Date | null;
  startReporting?: string | Date | null;
  endReporting?: string | Date | null;
  outbrief?: string | Date | null;
};

function mapEngagementFindings(findings: EngagementFindingForDetail[] = []): EngagementFindingSummary[] {
  return findings.map((f) => ({
    id: f.id,
    version: f.version,
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
  findingIsEditing = false,
  findingShowDeleteConfirm = false,
  showFindingsList = false,
  showCreateFinding = false,
  showSchedule = false,
  scheduleIsEditing = false,
  scheduleViewHref,
  scheduleEditHref,
  scheduleCloseHref,
  scheduleError,
  scheduleEditFields,
  listParams = {},
  activeTab = 'overview',
  showLink = true,
  showModal = true,
}: {
  engagement: EngagementForDetail,
  clients: { id: string, company: string }[],
  contacts: { id: string, name: string, title: string | null, clientId: string }[],
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
  findingIsEditing?: boolean;
  findingShowDeleteConfirm?: boolean;
  showFindingsList?: boolean;
  showCreateFinding?: boolean;
  showSchedule?: boolean;
  scheduleIsEditing?: boolean;
  scheduleViewHref?: string;
  scheduleEditHref?: string;
  scheduleCloseHref?: string;
  scheduleError?: string;
  scheduleEditFields?: ReactNode;
  listParams?: SearchParamRecord;
  activeTab?: EngagementDetailTab;
  showLink?: boolean;
  showModal?: boolean;
}) {
  const [engagement, setEngagement] = useState(initialEngagement);
  const [findings, setFindings] = useState<EngagementFindingSummary[]>(
    mapEngagementFindings(initialEngagement.findings)
  );
  useEffect(() => {
    queueMicrotask(() => {
      setEngagement(initialEngagement);
      setFindings(mapEngagementFindings(initialEngagement.findings));
    });
  }, [initialEngagement]);

  const [selectedOps, setSelectedOps] = useState<string[]>(initialEngagement.operators?.map((o) => o.id) || []);
  const [opsOpen, setOpsOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>(initialEngagement.contacts?.map((c) => c.id) || []);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [selectedTAs, setSelectedTAs] = useState<string[]>(initialEngagement.trustedAgents?.map((t) => t.id) || []);
  const [tasOpen, setTasOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const taDropdownRef = useRef<HTMLDivElement>(null);
  const codeNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      queueMicrotask(() => {
        setSelectedOps(engagement.operators?.map((o) => o.id) || []);
        setSelectedContacts(engagement.contacts?.map((c) => c.id) || []);
        setSelectedTAs(engagement.trustedAgents?.map((t) => t.id) || []);
        focusEditFieldAtStart(codeNameInputRef.current);
      });
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
      <div><DisplayDate value={engagement.createdAt} /></div>
      <div>Updated</div>
      <div><DisplayDate value={engagement.updatedAt} /></div>
    </div>
  );

  const findingsSection = (
    <section className="glass-panel engagement-findings-section">
      <EngagementFindingsPanel
        engagementId={engagement.id}
        findings={findings}
        activeFindingId={activeFindingId}
        findingIsEditing={findingIsEditing}
        findingShowDeleteConfirm={findingShowDeleteConfirm}
        showFindingsList={showFindingsList}
        showCreateFinding={showCreateFinding}
        deleteError={deleteError}
        saveError={saveError}
        sort={sort}
        dir={dir}
        isAdmin={isAdmin}
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

      {showModal && isDetailOpen && !showSchedule && (
        <Modal
          isOpen
          closeHref={closeHref}
          title={showDeleteConfirm ? 'Delete Engagement' : isEditing ? 'Edit Engagement' : (engagement.codeName || 'Engagement Details')}
        maxWidth={showDeleteConfirm ? DETAIL_DELETE_MODAL_WIDTH : isEditing ? '900px' : '1500px'}
        alignTop={!showDeleteConfirm}
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
          />
        ) : undefined}
      >
        {showDeleteConfirm ? (
          <DetailDeleteConfirmBody deleteError={deleteError} />
        ) : isEditing ? (
        <>
        {saveErrorMessage(saveError) ? (
          <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
        ) : null}
        <div className="engagement-create-form">
          <form id={EDIT_FORM_ID} action={updateEngagementFromDetail}>
              {editFormHiddenFields}
              <EngagementFormFields
                key={`edit-${engagement.id}-${engagement.updatedAt}`}
                readOnly={false}
                defaultValues={engagementToFormValues(engagement)}
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
                footer={timestampsFooter}
              />
          </form>
        </div>
        {findingsSection}
        </>
        ) : (
          <>
            {findingsSection}
            <EngagementDetailView
              engagement={engagement}
              contacts={contacts}
              operators={operators}
              activeTab={activeTab}
              listParams={listParams}
              scheduleEditHref={scheduleEditHref}
              isAdmin={isAdmin}
            />
            {timestampsFooter}
          </>
        )}
      </Modal>
      )}

      {showSchedule && scheduleViewHref && scheduleEditHref && scheduleCloseHref ? (
        <EngagementScheduleModal
          engagement={engagement}
          isAdmin={isAdmin}
          isOpen
          isEditing={scheduleIsEditing}
          closeHref={scheduleCloseHref}
          scheduleViewHref={scheduleViewHref}
          scheduleEditHref={scheduleEditHref}
          scheduleError={scheduleError}
          scheduleEditFields={scheduleEditFields}
          sort={sort}
          dir={dir}
          activeFindingId={activeFindingId}
        />
      ) : null}
    </>
  );
}
