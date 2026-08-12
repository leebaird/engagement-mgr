'use client';

import { buildDetailHrefs, buildPathQuery, type SearchParamRecord } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { Modal } from '@/components/Modal';
import { CreateFindingForm } from '../findings/CreateFindingForm';
import { FindingDetailButton } from '../findings/FindingDetailButton';
import { countFindingsBySeverity, getSeverityStyle } from '@/lib/finding-severity';

export type EngagementFindingSummary = {
  id: string;
  title: string;
  observation?: string | null;
  severity: string;
  category: string | null;
  background?: string | null;
  remediation?: string | null;
  supportingData?: string | null;
  affectedHosts?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const SEVERITY_LABELS = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;

export function EngagementFindingsPanel({
  engagementId,
  findings,
  activeFindingId,
  findingIsEditing = false,
  findingShowDeleteConfirm = false,
  showFindingsList = false,
  showCreateFinding = false,
  deleteError,
  saveError,
  sort,
  dir,
  isAdmin = false,
  listParams = {},
  engagementIdForLinks,
}: {
  engagementId: string;
  findings: EngagementFindingSummary[];
  activeFindingId?: string;
  findingIsEditing?: boolean;
  findingShowDeleteConfirm?: boolean;
  showFindingsList?: boolean;
  showCreateFinding?: boolean;
  deleteError?: string;
  saveError?: string;
  sort?: string;
  dir?: string;
  isAdmin?: boolean;
  listParams?: SearchParamRecord;
  engagementIdForLinks?: string;
}) {
  const counts = countFindingsBySeverity(findings);
  const addFormId = `engagement-findings-add-${engagementId}`;
  const overlayId = engagementIdForLinks ?? engagementId;

  const findingsListHref = buildPathQuery('/dashboard/engagements', listParams, {
    detail: overlayId,
    findings: '1',
    createFinding: null,
    finding: null,
    edit: null,
    delete: null,
    deleteError: null,
    saveError: null,
    create: null,
    schedule: null,
    scheduleEdit: null,
    scheduleError: null,
  });
  const createFindingHref = buildPathQuery('/dashboard/engagements', listParams, {
    detail: overlayId,
    findings: '1',
    createFinding: '1',
    finding: null,
    edit: null,
    delete: null,
    deleteError: null,
    saveError: null,
    create: null,
    schedule: null,
    scheduleEdit: null,
    scheduleError: null,
  });
  const findingsListCloseHref = buildPathQuery('/dashboard/engagements', listParams, {
    detail: overlayId,
    findings: null,
    createFinding: null,
    finding: null,
    edit: null,
    delete: null,
    deleteError: null,
    saveError: null,
    create: null,
  });
  const createFindingCloseHref = findingsListHref;

  const findingExtra = {
    finding: activeFindingId,
    ...(showFindingsList || showCreateFinding ? { findings: '1' } : {}),
  };

  const detailFinding = activeFindingId ? findings.find((finding) => finding.id === activeFindingId) : undefined;
  const findingHrefs = detailFinding && engagementIdForLinks
    ? buildDetailHrefs('/dashboard/engagements', listParams, engagementIdForLinks, findingExtra)
    : null;
  const findingCloseHref = engagementIdForLinks
    ? buildPathQuery('/dashboard/engagements', listParams, {
        detail: engagementIdForLinks,
        finding: null,
        edit: null,
        delete: null,
        deleteError: null,
        saveError: null,
        create: null,
        createFinding: null,
        findings: showFindingsList ? '1' : null,
      })
    : undefined;

  return (
    <>
      {detailFinding && engagementIdForLinks && findingHrefs ? (
        <FindingDetailButton
          engagementScoped
          engagementId={engagementIdForLinks}
          zIndex={1200}
          finding={{
            ...detailFinding,
            supportingLinks: detailFinding.supportingData ?? '',
            observation: detailFinding.observation ?? '',
            affectedHosts: detailFinding.affectedHosts ?? '',
          }}
          isDetailOpen
          isEditing={findingIsEditing}
          showDeleteConfirm={findingShowDeleteConfirm}
          showLink={false}
          detailHref={findingHrefs.view}
          editHref={findingHrefs.edit}
          deleteConfirmHref={findingHrefs.deleteConfirm}
          viewHref={findingHrefs.view}
          closeHref={findingCloseHref}
          deleteError={deleteError}
          saveError={saveError}
          sort={sort}
          dir={dir}
          showDelete={isAdmin}
        />
      ) : null}
      <a
        href={findingsListHref}
        className="engagement-findings-panel"
        aria-label="View engagement findings"
      >
        <span className="engagement-findings-panel__total">
          <span className="engagement-findings-panel__total-label">Total Findings</span>
          <span className="engagement-findings-panel__total-value">{counts.total}</span>
        </span>
        <span className="engagement-findings-panel__counts">
          {SEVERITY_LABELS.map((label) => (
            <span key={label} className="engagement-findings-panel__count">
              <span
                className="engagement-findings-panel__badge"
                style={getSeverityStyle(label)}
              >
                {label}
              </span>
              <span className="engagement-findings-panel__count-value">
                {counts[label]}
              </span>
            </span>
          ))}
        </span>
      </a>

      {showFindingsList && (
        <Modal
          isOpen
          closeHref={findingsListCloseHref}
          title="Engagement Findings"
          maxWidth="600px"
          zIndex={1100}
          headerActions={
            <a href={createFindingHref} className="modal-action-btn" style={{ textDecoration: 'none' }}>
              Add
            </a>
          }
        >
          {findings.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              No findings for this engagement yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Title</th>
                  <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Category</th>
                  <th style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Severity</th>
                  <th style={{ padding: '0.5rem', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 500 }}>{f.title}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {f.category || ''}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {f.severity ? (
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            ...getSeverityStyle(f.severity),
                          }}
                        >
                          {f.severity}
                        </span>
                      ) : null}
                    </td>
                    <td className="table-action-cell">
                      {engagementIdForLinks ? (
                        <DetailEyeLink
                          href={buildPathQuery('/dashboard/engagements', listParams, {
                            detail: engagementIdForLinks,
                            finding: f.id,
                            findings: '1',
                            create: null,
                            createFinding: null,
                          })}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {showCreateFinding && (
        <Modal
          isOpen
          closeHref={createFindingCloseHref}
          title="Add Engagement Finding"
          maxWidth="1500px"
          zIndex={1200}
          headerActions={
            <button type="submit" form={addFormId} className="btn-save" style={{ boxShadow: 'none' }}>
              Add
            </button>
          }
        >
          <CreateFindingForm
            formId={addFormId}
            engagementId={engagementId}
            sort={sort}
            dir={dir}
          />
        </Modal>
      )}
    </>
  );
}