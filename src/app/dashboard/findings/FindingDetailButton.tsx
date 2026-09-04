"use client";
import { useState, useRef, useEffect, useCallback } from 'react';

import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateFinding, updateFindingFromDetail, deleteFindingFromDetail } from '@/app/actions/finding';
import {
  DetailDeleteConfirmBody,
  DETAIL_DELETE_MODAL_WIDTH,
  DetailEditCancelLink,
  DetailEditFormFields,
  DetailSaveErrorBanner,
  DetailViewModeActions,
  saveErrorMessage,
} from '@/components/DetailModalActions';

const EDIT_FORM_ID = 'edit-finding-form';
import { focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';
import { DisplayDate } from '@/components/DateTimePreferencesProvider';

export type FindingDetail = {
  id: string;
  version?: number;
  title: string;
  observation?: string | null;
  category?: string | null;
  severity?: string | null;
  background?: string | null;
  remediation?: string | null;
  supportingLinks?: string | null;
  affectedHosts?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function FindingDetailButton({ 
  finding: initialFinding, 
  engagementScoped = false,
  engagementId,
  zIndex,
  isDetailOpen = false,
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
  showLink = true,
  showModal = true,
  showDelete = true,
}: { 
  finding: FindingDetail;
  engagementScoped?: boolean;
  engagementId?: string;
  zIndex?: number;
  showDelete?: boolean;
  isDetailOpen?: boolean;
  isEditing?: boolean;
  showDeleteConfirm?: boolean;
  detailHref?: string;
  editHref?: string;
  deleteConfirmHref?: string;
  viewHref?: string;
  closeHref?: string;
  deleteError?: string;
  saveError?: string;
  sort?: string;
  dir?: string;
  showLink?: boolean;
  showModal?: boolean;
}) {
  const [finding, setFinding] = useState(initialFinding);
  const [isOpen, setIsOpen] = useState(false);
  const modalOpen = detailHref ? isDetailOpen : isOpen;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (closeHref) {
      window.location.assign(closeHref);
      return;
    }
    setIsOpen(false);
    setError(null);
  }, [closeHref]);

  const [formData, setFormData] = useState({
    title: initialFinding.title,
    observation: initialFinding.observation || '',
    category: initialFinding.category || '',
    severity: initialFinding.severity || '',
    background: initialFinding.background || '',
    remediation: initialFinding.remediation || '',
    supportingLinks: initialFinding.supportingLinks || '',
    affectedHosts: initialFinding.affectedHosts || '',
  });

  const appendEngagementScopedFields = (data: FormData) => {
    if (engagementScoped) {
      data.append('engagementScoped', 'true');
      data.append('observation', formData.observation);
      data.append('affectedHosts', formData.affectedHosts);
    }
  };

    const titleInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (isEditing) {
        queueMicrotask(() => {
          setFormData({
            title: finding.title,
            observation: engagementScoped ? (finding.observation || '') : '',
            category: finding.category || '',
            severity: finding.severity || '',
            background: finding.background || '',
            remediation: finding.remediation || '',
            supportingLinks: finding.supportingLinks || '',
            affectedHosts: engagementScoped ? (finding.affectedHosts || '') : '',
          });
          setError(null);
          focusEditFieldAtStart(titleInputRef.current);
        });
      }
    }, [isEditing, finding, engagementScoped]);

  const useFormSave = Boolean(viewHref);

  const handleUpdate = async () => {
    if (!formData.title) {
      setError('Title is required');
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
      data.set('version', String(finding.version ?? 1));
      Object.entries(formData).forEach(([key, value]) => {
        if (!engagementScoped && (key === 'observation' || key === 'affectedHosts')) return;
        data.append(key, value as string);
      });
      appendEngagementScopedFields(data);

      const result = await updateFinding(finding.id, {}, data);

      if (result?.error) {
        setError(result.error);
      } else {
        setFinding({ ...finding, ...formData });
        setIsOpen(false);
      }
    } catch {
      setError('An error occurred while updating the finding.');
    } finally {
      setIsPending(false);
    }
  };

  const editFormFields = (
    <>
      <input type="hidden" name="version" value={finding.version ?? 1} />
      <DetailEditFormFields
        recordId={finding.id}
        sort={sort}
        dir={dir}
        extraFields={
          engagementScoped && engagementId
            ? { finding: finding.id, engagementId }
            : undefined
        }
      />
      {engagementScoped ? <input type="hidden" name="engagementScoped" value="true" /> : null}
      <input type="hidden" name="title" value={formData.title} />
      <input type="hidden" name="category" value={formData.category} />
      <input type="hidden" name="severity" value={formData.severity} />
      <input type="hidden" name="background" value={formData.background} />
      <input type="hidden" name="remediation" value={formData.remediation} />
      <input type="hidden" name="supportingLinks" value={formData.supportingLinks} />
      {engagementScoped ? (
        <>
          <input type="hidden" name="observation" value={formData.observation} />
          <input type="hidden" name="affectedHosts" value={formData.affectedHosts} />
        </>
      ) : null}
    </>
  );

  return (
    <>
      {showLink ? (
        detailHref ? (
          <a
            href={detailHref}
            className="detail-icon-btn"
            title="View details"
          >
            <Eye size={16} />
          </a>
        ) : (
          <button
            type="button"
            className="detail-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            title="View details"
          >
            <Eye size={16} />
          </button>
        )
      ) : null}

      {showModal && modalOpen && (
        <Modal
          isOpen
          closeHref={closeHref}
          onClose={handleClose}
          title={showDeleteConfirm ? 'Delete Finding' : isEditing ? (engagementScoped ? 'Edit Engagement Finding' : 'Edit Finding') : (engagementScoped ? 'Engagement Finding Details' : 'Finding Details')}
        maxWidth={showDeleteConfirm ? DETAIL_DELETE_MODAL_WIDTH : engagementScoped ? '1500px' : '1000px'}
        zIndex={zIndex}
        headerActions={isEditing ? (
          <>
            <button
              key="save"
              type={useFormSave ? 'submit' : 'button'}
              form={useFormSave ? EDIT_FORM_ID : undefined}
              onClick={useFormSave ? undefined : handleUpdate}
              className="btn-save"
              style={{ boxShadow: 'none' }}
              disabled={!useFormSave && isPending}
            >
              {!useFormSave && isPending ? 'Saving...' : 'Save'}
            </button>
            {viewHref ? <DetailEditCancelLink viewHref={viewHref} /> : (
              <button key="cancel" onClick={() => { setIsOpen(false); setError(null); }} className="btn-cancel" style={{ boxShadow: 'none' }}>Cancel</button>
            )}
          </>
        ) : editHref && viewHref ? (
          <DetailViewModeActions
            editHref={editHref}
            deleteConfirmHref={showDelete ? deleteConfirmHref : undefined}
            showDeleteConfirm={showDeleteConfirm}
            deleteFormId="delete-finding-form"
            deleteFormAction={deleteFindingFromDetail}
            recordId={finding.id}
            viewHref={viewHref}
            sort={sort}
            dir={dir}
            childrenBeforeEdit={
              <><a href={`/dashboard/findings/${finding.id}/write`} className="modal-action-btn">Write &amp; review</a>
              <a
                href={`/dashboard/findings/${finding.id}`}
                className="modal-action-btn"
                style={{ textDecoration: 'none' }}
              >
                Screenshots
              </a>
              </>
            }
            extraFields={
              engagementScoped && engagementId
                ? { finding: finding.id, engagementId }
                : undefined
            }
          />
        ) : undefined}
      >
        {showDeleteConfirm ? (
          <DetailDeleteConfirmBody deleteError={deleteError}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Related screenshots will also be deleted.
            </p>
          </DetailDeleteConfirmBody>
        ) : !isEditing ? (
          // VIEW MODE (form field style)
          <>
            {engagementScoped ? (
              <div className="engagement-finding-detail-form">
                <div className="engagement-finding-detail-form__header">
                  <div className="engagement-finding-detail-form__left-header">
                    <div>
                      <div className="engagement-finding-detail-field__label">Title</div>
                      <input readOnly type="text" value={finding.title} className="form-input" style={{ width: '100%', pointerEvents: 'none' }} />
                    </div>
                    <div className="engagement-finding-detail-form__meta">
                      <div>
                        <div className="engagement-finding-detail-field__label">Category</div>
                        <select disabled value={finding.category || ''} className="form-input" style={{ pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
                          <option value=""></option>
                          <option value="AI">AI</option>
                          <option value="Firewall">Firewall</option>
                          <option value="Host">Host</option>
                          <option value="OSINT">OSINT</option>
                          <option value="Physical">Physical</option>
                          <option value="Social Eng">Social Eng</option>
                          <option value="Web App">Web App</option>
                          <option value="Wireless">Wireless</option>
                        </select>
                      </div>
                      <div>
                        <div className="engagement-finding-detail-field__label">Severity</div>
                        <select disabled value={finding.severity || ''} className="form-input" style={{ pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
                          <option value=""></option>
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Info">Info</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Remediation</div>
                    <textarea readOnly value={finding.remediation || ''} className="form-input" rows={5} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div className="engagement-finding-detail-form__pair">
                  <div>
                    <div className="engagement-finding-detail-field__label">Observation</div>
                    <textarea readOnly value={finding.observation || ''} className="form-input" rows={5} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">See Also</div>
                    <textarea readOnly value={finding.supportingLinks || ''} className="form-input" rows={5} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div className="engagement-finding-detail-form__pair">
                  <div>
                    <div className="engagement-finding-detail-field__label">Background</div>
                    <textarea readOnly value={finding.background || ''} className="form-input" rows={5} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Affected Hosts</div>
                    <textarea readOnly value={finding.affectedHosts || ''} className="form-input" rows={5} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 120px', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                    <input readOnly type="text" value={finding.title} className="form-input" style={{ pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
                    <select disabled value={finding.category || ''} className="form-input" style={{ pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
                      <option value=""></option>
                      <option value="AI">AI</option>
                      <option value="Firewall">Firewall</option>
                      <option value="Host">Host</option>
                      <option value="OSINT">OSINT</option>
                      <option value="Physical">Physical</option>
                      <option value="Social Eng">Social Eng</option>
                      <option value="Web App">Web App</option>
                      <option value="Wireless">Wireless</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</div>
                    <select disabled value={finding.severity || ''} className="form-input" style={{ pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
                      <option value=""></option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Info">Info</option>
                    </select>
                  </div>
                </div>

                {engagementScoped ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Observation</div>
                    <textarea readOnly value={finding.observation || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                ) : null}

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
                  <textarea readOnly value={finding.background || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remediation</div>
                  <textarea readOnly value={finding.remediation || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>See Also</div>
                  <textarea readOnly value={finding.supportingLinks || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                </div>

                {engagementScoped ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Affected Hosts</div>
                    <textarea readOnly value={finding.affectedHosts || ''} className="form-input" rows={2} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                ) : null}
              </div>
            )}

            <div style={{ marginTop: engagementScoped ? '1rem' : '0.5rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div><DisplayDate value={finding.createdAt} /></div>
                <div>Updated</div>
                <div><DisplayDate value={finding.updatedAt} /></div>
              </div>
            </div>
          </>
        ) : engagementScoped ? (
          useFormSave ? (
            <form id={EDIT_FORM_ID} action={updateFindingFromDetail}>
              {editFormFields}
            <div className="engagement-finding-detail-form">
                <div className="engagement-finding-detail-form__header">
                  <div className="engagement-finding-detail-form__left-header">
                    <div>
                      <div className="engagement-finding-detail-field__label">Title</div>
                      <input ref={titleInputRef} type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} style={{ width: '100%' }} />
                    </div>
                    <div className="engagement-finding-detail-form__meta">
                      <div>
                        <div className="engagement-finding-detail-field__label">Category</div>
                        <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input">
                          <option value=""></option>
                          <option value="AI">AI</option>
                          <option value="Firewall">Firewall</option>
                          <option value="Host">Host</option>
                          <option value="OSINT">OSINT</option>
                          <option value="Physical">Physical</option>
                          <option value="Social Eng">Social Eng</option>
                          <option value="Web App">Web App</option>
                          <option value="Wireless">Wireless</option>
                        </select>
                      </div>
                      <div>
                        <div className="engagement-finding-detail-field__label">Severity</div>
                        <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="form-input" onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}>
                          <option value=""></option>
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Info">Info</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Remediation</div>
                    <textarea value={formData.remediation} onChange={e => setFormData({...formData, remediation: e.target.value})} className="form-input" rows={5} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                </div>
                <div className="engagement-finding-detail-form__pair">
                  <div>
                    <div className="engagement-finding-detail-field__label">Observation</div>
                    <textarea value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="form-input" rows={5} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">See Also</div>
                    <textarea
                      value={formData.supportingLinks}
                      onChange={e => setFormData({...formData, supportingLinks: e.target.value})}
                      className="form-input"
                      rows={5}
                      style={{ width: '100%' }}
                      onFocus={handleEditFieldFocus}
                    ></textarea>
                  </div>
                </div>
                <div className="engagement-finding-detail-form__pair">
                  <div>
                    <div className="engagement-finding-detail-field__label">Background</div>
                    <textarea value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} className="form-input" rows={5} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Affected Hosts</div>
                    <textarea
                      value={formData.affectedHosts}
                      onChange={e => setFormData({...formData, affectedHosts: e.target.value})}
                      className="form-input"
                      rows={5}
                      style={{ width: '100%' }}
                      onFocus={handleEditFieldFocus}
                      onKeyDown={e => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                          if (modal) {
                            const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                            if (firstField) firstField.focus();
                          }
                        }
                      }}
                    ></textarea>
                  </div>
                </div>
              </div>
            <div style={{ marginTop: '1rem', height: '2.5rem' }}>
              {saveErrorMessage(saveError) ? (
                <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
              ) : error ? (
                <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.85rem' }}>{error}</div>
              ) : null}
            </div>
            </form>
          ) : (
          <>
            <div className="engagement-finding-detail-form">
                <div className="engagement-finding-detail-form__header">
                  <div className="engagement-finding-detail-form__left-header">
                    <div>
                      <div className="engagement-finding-detail-field__label">Title</div>
                      <input ref={titleInputRef} type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} style={{ width: '100%' }} />
                    </div>
                    <div className="engagement-finding-detail-form__meta">
                      <div>
                        <div className="engagement-finding-detail-field__label">Category</div>
                        <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input">
                          <option value=""></option>
                          <option value="AI">AI</option>
                          <option value="Firewall">Firewall</option>
                          <option value="Host">Host</option>
                          <option value="OSINT">OSINT</option>
                          <option value="Physical">Physical</option>
                          <option value="Social Eng">Social Eng</option>
                          <option value="Web App">Web App</option>
                          <option value="Wireless">Wireless</option>
                        </select>
                      </div>
                      <div>
                        <div className="engagement-finding-detail-field__label">Severity</div>
                        <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="form-input" onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}>
                          <option value=""></option>
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Info">Info</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Remediation</div>
                    <textarea value={formData.remediation} onChange={e => setFormData({...formData, remediation: e.target.value})} className="form-input" rows={5} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                </div>
                <div className="engagement-finding-detail-form__pair">
                  <div>
                    <div className="engagement-finding-detail-field__label">Observation</div>
                    <textarea value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="form-input" rows={5} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">See Also</div>
                    <textarea
                      value={formData.supportingLinks}
                      onChange={e => setFormData({...formData, supportingLinks: e.target.value})}
                      className="form-input"
                      rows={5}
                      style={{ width: '100%' }}
                      onFocus={handleEditFieldFocus}
                    ></textarea>
                  </div>
                </div>
                <div className="engagement-finding-detail-form__pair">
                  <div>
                    <div className="engagement-finding-detail-field__label">Background</div>
                    <textarea value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} className="form-input" rows={5} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                  <div>
                    <div className="engagement-finding-detail-field__label">Affected Hosts</div>
                    <textarea
                      value={formData.affectedHosts}
                      onChange={e => setFormData({...formData, affectedHosts: e.target.value})}
                      className="form-input"
                      rows={5}
                      style={{ width: '100%' }}
                      onFocus={handleEditFieldFocus}
                      onKeyDown={e => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                          if (modal) {
                            const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                            if (firstField) firstField.focus();
                          }
                        }
                      }}
                    ></textarea>
                  </div>
                </div>
              </div>
            <div style={{ marginTop: '1rem', height: '2.5rem' }}>
              {error ? <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.85rem' }}>{error}</div> : null}
            </div>
          </>
          )
        ) : useFormSave ? (
            <form id={EDIT_FORM_ID} action={updateFindingFromDetail}>
              {editFormFields}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 120px', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                  <input ref={titleInputRef} type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
                  <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input">
                    <option value=""></option>
                    <option value="AI">AI</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Host">Host</option>
                    <option value="OSINT">OSINT</option>
                    <option value="Physical">Physical</option>
                    <option value="Social Eng">Social Eng</option>
                    <option value="Web App">Web App</option>
                    <option value="Wireless">Wireless</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</div>
                  <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="form-input" onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}>
                    <option value=""></option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Info">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
                <textarea value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remediation</div>
                <textarea value={formData.remediation} onChange={e => setFormData({...formData, remediation: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>See Also</div>
                <textarea
                  value={formData.supportingLinks}
                  onChange={e => setFormData({...formData, supportingLinks: e.target.value})}
                  className="form-input"
                  rows={4}
                  style={{ width: '100%' }}
                  onFocus={handleEditFieldFocus}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                      if (modal) {
                        const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                        if (firstField) firstField.focus();
                      }
                    }
                  }}
                ></textarea>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              {saveErrorMessage(saveError) ? (
                <DetailSaveErrorBanner message={saveErrorMessage(saveError)!} />
              ) : error ? (
                <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.85rem' }}>{error}</div>
              ) : null}
            </div>
            </form>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 120px', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                  <input ref={titleInputRef} type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
                  <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input">
                    <option value=""></option>
                    <option value="AI">AI</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Host">Host</option>
                    <option value="OSINT">OSINT</option>
                    <option value="Physical">Physical</option>
                    <option value="Social Eng">Social Eng</option>
                    <option value="Web App">Web App</option>
                    <option value="Wireless">Wireless</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</div>
                  <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="form-input" onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}>
                    <option value=""></option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Info">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
                <textarea value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remediation</div>
                <textarea value={formData.remediation} onChange={e => setFormData({...formData, remediation: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>See Also</div>
                <textarea
                  value={formData.supportingLinks}
                  onChange={e => setFormData({...formData, supportingLinks: e.target.value})}
                  className="form-input"
                  rows={4}
                  style={{ width: '100%' }}
                  onFocus={handleEditFieldFocus}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      const modal = e.currentTarget.closest('.glass-panel') || e.currentTarget.closest('form');
                      if (modal) {
                        const firstField = modal.querySelector('input, select, textarea') as HTMLElement;
                        if (firstField) firstField.focus();
                      }
                    }
                  }}
                ></textarea>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              {error ? <div style={{ color: '#ff4444', textAlign: 'center', fontSize: '0.85rem' }}>{error}</div> : null}
            </div>
          </>
        )}
      </Modal>
      )}
    </>
  );
}
