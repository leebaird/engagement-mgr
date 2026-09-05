'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { saveTemplate, useTemplate } from '@/app/actions/templates';
import { FindingMarkdown } from '@/components/FindingMarkdown';
import { getSeverityStyle } from '@/lib/finding-severity';
import type { FindingContent } from '@/lib/reporting';

export type TemplateDetail = {
  id: string;
  version: number;
  approved: boolean;
  content: FindingContent;
};

export type TemplateEngagement = {
  id: string;
  codeName: string;
};

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];

function TemplateFormFields({
  content,
  formId,
}: {
  content?: FindingContent;
  formId: string;
}) {
  return (
    <>
      <label className="form-label">
        Title
        <textarea
          form={formId}
          name="title"
          className="form-input"
          rows={1}
          required
          maxLength={500}
          defaultValue={content?.title ?? ''}
        />
      </label>
      <label className="form-label">
        Category
        <textarea
          form={formId}
          name="category"
          className="form-input"
          rows={1}
          maxLength={200}
          defaultValue={content?.category ?? ''}
        />
      </label>
      <label className="form-label">
        Severity
        <select
          form={formId}
          name="severity"
          className="form-input"
          defaultValue={content?.severity ?? ''}
        >
          <option value="">Unrated</option>
          {SEVERITIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="form-label">
        Background
        <textarea
          form={formId}
          name="background"
          className="form-input"
          rows={5}
          maxLength={10000}
          defaultValue={content?.background ?? ''}
        />
      </label>
      <label className="form-label">
        Remediation
        <textarea
          form={formId}
          name="remediation"
          className="form-input"
          rows={5}
          maxLength={10000}
          defaultValue={content?.remediation ?? ''}
        />
      </label>
      <label className="form-label">
        Supporting links
        <textarea
          form={formId}
          name="supportingLinks"
          className="form-input"
          rows={5}
          maxLength={10000}
          defaultValue={content?.supportingLinks ?? ''}
        />
      </label>
    </>
  );
}

export function TemplatesClient({
  children,
  isAdmin,
  addHref,
  showCreateModal,
  createCloseHref,
  detail,
  detailCloseHref,
  engagements,
}: {
  children: ReactNode;
  isAdmin: boolean;
  addHref: string;
  showCreateModal: boolean;
  createCloseHref: string;
  detail: TemplateDetail | null;
  detailCloseHref: string;
  engagements: TemplateEngagement[];
}) {
  return (
    <div className="page-container">
      <PageHeader
        title="Finding Templates"
        addButtonLabel="Propose Template"
        addHref={addHref}
      />

      {children}

      {showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Propose Template"
          maxWidth="800px"
          alignTop
          headerActions={
            <button
              type="submit"
              form="create-template-form"
              className="btn-save"
              style={{ boxShadow: 'none' }}
            >
              Save Template
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form id="create-template-form" action={saveTemplate} />
            <TemplateFormFields formId="create-template-form" />
            {isAdmin && (
              <label>
                <input form="create-template-form" type="checkbox" name="approved" /> I
                have reviewed this wording and approve this version
              </label>
            )}
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          isOpen
          closeHref={detailCloseHref}
          title={detail.content.title}
          maxWidth="800px"
          alignTop
          headerActions={
            isAdmin ? (
              <button
                type="submit"
                form="edit-template-form"
                className="btn-save"
                style={{ boxShadow: 'none' }}
              >
                Save Template
              </button>
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="detail-field">
              <p className="detail-field__label">Status</p>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Version {detail.version} ·{' '}
                {detail.approved ? 'Approved' : 'Pending approval'}
              </p>
            </div>

            {isAdmin ? (
              <>
                <form id="edit-template-form" action={saveTemplate}>
                  <input name="id" type="hidden" value={detail.id} />
                  <input name="version" type="hidden" value={detail.version} />
                </form>
                <TemplateFormFields
                  content={detail.content}
                  formId="edit-template-form"
                />
                <label>
                  <input
                    form="edit-template-form"
                    type="checkbox"
                    name="approved"
                    defaultChecked={detail.approved}
                  />{' '}
                  I have reviewed this wording and approve this version
                </label>
              </>
            ) : (
              <>
                {detail.content.category && (
                  <div className="detail-field">
                    <p className="detail-field__label">Category</p>
                    <p style={{ margin: 0 }}>{detail.content.category}</p>
                  </div>
                )}
                {detail.content.severity && (
                  <div className="detail-field">
                    <p className="detail-field__label">Severity</p>
                    <p style={{ margin: 0 }}>
                      <span
                        className="badge"
                        style={getSeverityStyle(detail.content.severity)}
                      >
                        {detail.content.severity}
                      </span>
                    </p>
                  </div>
                )}
                {detail.content.background && (
                  <div className="detail-section">
                    <p className="detail-section__label">Background</p>
                    <FindingMarkdown text={detail.content.background} />
                  </div>
                )}
                {detail.content.remediation && (
                  <div className="detail-section">
                    <p className="detail-section__label">Remediation</p>
                    <FindingMarkdown text={detail.content.remediation} />
                  </div>
                )}
                {detail.content.supportingLinks && (
                  <div className="detail-section">
                    <p className="detail-section__label">Supporting links</p>
                    <FindingMarkdown text={detail.content.supportingLinks} />
                  </div>
                )}
              </>
            )}

            {detail.approved && engagements.length > 0 && (
              <form
                action={useTemplate}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                  borderTop: '1px solid var(--surface-border)',
                  paddingTop: '1rem',
                }}
              >
                <input name="templateId" type="hidden" value={detail.id} />
                <label className="form-label" style={{ flex: 1, margin: 0 }}>
                  Add to engagement
                  <select name="engagementId" className="form-input" required>
                    <option value="">Choose engagement</option>
                    {engagements.map((e) => (
                      <option value={e.id} key={e.id}>
                        {e.codeName}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn-primary" style={{ width: 'fit-content' }}>
                  Create finding from template
                </button>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
