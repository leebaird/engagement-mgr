'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

const modalHeaderBtnStyle = {
  background: 'none',
  border: '1px solid var(--surface-border)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  padding: '0.6rem 1.2rem',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
  transition: 'all 0.2s ease',
} as const;

export function EngagementFindingsPanel({
  engagementId,
  findings,
  onFindingsChange,
}: {
  engagementId: string;
  findings: EngagementFindingSummary[];
  onFindingsChange: (findings: EngagementFindingSummary[]) => void;
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

  return (
    <>
      <div className="engagement-findings-panel">
        <div className="engagement-findings-panel__header">
          <div className="engagement-findings-panel__total">
            <span className="engagement-findings-panel__total-label">Total Findings</span>
            <span className="engagement-findings-panel__total-value">{counts.total}</span>
          </div>
          <div className="engagement-findings-panel__actions">
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              onClick={() => setViewOpen(true)}
            >
              View Findings
            </button>
          </div>
        </div>
        <div className="engagement-findings-panel__counts">
          {SEVERITY_LABELS.map((label) => (
            <div key={label} className="engagement-findings-panel__count">
              <span
                className="engagement-findings-panel__badge"
                style={{
                  ...getSeverityStyle(label),
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              <span className="engagement-findings-panel__count-value">
                {counts[label]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {viewOpen && (
        <Modal
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          title="Engagement Findings"
          maxWidth="1500px"
          headerActions={
            <button
              type="button"
              style={modalHeaderBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0066ff';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 102, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--surface-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => setAddOpen(true)}
            >
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
                    <td style={{ padding: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <FindingDetailButton
                        engagementScoped
                        finding={{
                          ...f,
                          supportingLinks: f.supportingData ?? '',
                          observation: f.observation ?? '',
                          affectedHosts: f.affectedHosts ?? '',
                        }}
                        onOptimisticDelete={(id) => {
                          handleOptimisticDelete(id);
                          handleRefresh();
                        }}
                      />
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
          headerActions={
            <button type="submit" form={addFormId} className="btn-save" style={{ boxShadow: 'none' }}>
              Add Engagement Finding
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