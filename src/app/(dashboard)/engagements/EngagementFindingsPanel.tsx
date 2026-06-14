'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildPathQuery, type SearchParamRecord } from '@/lib/list-view-params';
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
  onFindingsChange,
  activeFindingId,
  listParams = {},
  engagementIdForLinks,
}: {
  engagementId: string;
  findings: EngagementFindingSummary[];
  onFindingsChange: (findings: EngagementFindingSummary[]) => void;
  activeFindingId?: string;
  listParams?: SearchParamRecord;
  engagementIdForLinks?: string;
}) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const counts = countFindingsBySeverity(findings);
  const addFormId = `engagement-findings-add-${engagementId}`;

  const handleRefresh = () => {
    router.refresh();
  };

  const handleOptimisticDelete = (id: string) => {
    onFindingsChange(findings.filter((f) => f.id !== id));
  };

  const handleAddSuccess = () => {
    setAddOpen(false);
    handleRefresh();
  };

  const detailFinding = activeFindingId ? findings.find((finding) => finding.id === activeFindingId) : undefined;

  return (
    <>
      {detailFinding && engagementIdForLinks ? (
        <FindingDetailButton
          engagementScoped
          zIndex={1200}
          finding={{
            ...detailFinding,
            supportingLinks: detailFinding.supportingData ?? '',
            observation: detailFinding.observation ?? '',
            affectedHosts: detailFinding.affectedHosts ?? '',
          }}
          onOptimisticDelete={(id) => {
            handleOptimisticDelete(id);
            handleRefresh();
          }}
          isDetailOpen
          showLink={false}
          detailHref={buildPathQuery('/engagements', listParams, { detail: engagementIdForLinks, finding: detailFinding.id, create: null })}
          closeHref={buildPathQuery('/engagements', listParams, { detail: engagementIdForLinks, finding: null, create: null })}
        />
      ) : null}
      <button
        type="button"
        className="engagement-findings-panel"
        onClick={() => setViewOpen(true)}
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
      </button>

      {viewOpen && (
        <Modal
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          title="Engagement Findings"
          maxWidth="600px"
          zIndex={1100}
          headerActions={
            <button type="button" className="modal-action-btn" onClick={() => setAddOpen(true)}>
              Add
            </button>
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
                          href={buildPathQuery('/engagements', listParams, { detail: engagementIdForLinks, finding: f.id, create: null })}
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

      {addOpen && (
        <Modal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          title="Add Engagement Finding"
          maxWidth="1500px"
          zIndex={1100}
          headerActions={
            <button type="submit" form={addFormId} className="btn-save" style={{ boxShadow: 'none' }}>
              Add
            </button>
          }
        >
          <CreateFindingForm
            formId={addFormId}
            engagementId={engagementId}
            onSuccess={handleAddSuccess}
          />
        </Modal>
      )}
    </>
  );
}