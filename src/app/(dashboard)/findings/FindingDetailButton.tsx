"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { updateFinding, deleteFinding } from '@/app/actions/finding';
import { focusEditFieldAtStart, handleEditFieldFocus } from '@/lib/edit-field-focus';

export function FindingDetailButton({ 
  finding: initialFinding, 
  onOptimisticDelete,
  engagementScoped = false,
}: { 
  finding: any; 
  onOptimisticDelete?: (id: string) => void;
  engagementScoped?: boolean;
}) {
  const [finding, setFinding] = useState(initialFinding);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsEditing(false);
    setError(null);
  }, []);

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
      if (isEditing) focusEditFieldAtStart(titleInputRef.current);
    }, [isEditing]);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical': return { color: '#b366ff', background: 'rgba(179,102,255,0.1)', border: '1px solid rgba(179,102,255,0.3)' };
      case 'High': return { color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)' };
      case 'Medium': return { color: '#ffa64d', background: 'rgba(255,166,77,0.1)', border: '1px solid rgba(255,166,77,0.3)' };
      case 'Low': return { color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' };
      case 'Info': return { color: '#66b3ff', background: 'rgba(102,179,255,0.1)', border: '1px solid rgba(102,179,255,0.3)' };
      default: return { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' };
    }
  };

  const handleUpdate = async () => {
    if (!formData.title) {
      setError('Title is required');
      return;
    }
    
    setIsPending(true);
    setError(null);
    try {
      const data = new FormData();
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
        setIsEditing(false);
      }
    } catch (e) {
      setError('An error occurred while updating the finding.');
    } finally {
      setIsPending(false);
    }
  };

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
          onClose={handleClose} 
          title={isEditing ? (engagementScoped ? "Edit Engagement Finding" : "Edit Finding") : (engagementScoped ? "Engagement Finding Details" : "Finding Details")} 
        maxWidth={engagementScoped ? "1500px" : "1000px"}
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
                  title: finding.title,
                  observation: engagementScoped ? (finding.observation || '') : '',
                  category: finding.category || '',
                  severity: finding.severity || '',
                  background: finding.background || '',
                  remediation: finding.remediation || '',
                  supportingLinks: finding.supportingLinks || '',
                  affectedHosts: engagementScoped ? (finding.affectedHosts || '') : '',
                });
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
                if (!confirm('Are you sure you want to delete this finding? This will also delete any related screenshots.')) return;
                const result = await deleteFinding(finding.id);
                if (result.success) {
                  onOptimisticDelete?.(finding.id);
                  setIsOpen(false);
                  router.refresh();
                } else {
                  alert(result.error || 'Failed to delete finding');
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
          // VIEW MODE (form field style)
          <>
            {engagementScoped ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                    <input readOnly type="text" value={finding.title} className="form-input" style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 120px', gap: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
                      <input readOnly type="text" value={finding.category || ''} className="form-input" style={{ pointerEvents: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</div>
                      <select disabled value={finding.severity || ''} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Observation</div>
                    <textarea readOnly value={finding.observation || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
                    <textarea readOnly value={finding.background || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remediation</div>
                    <textarea readOnly value={finding.remediation || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>See Also</div>
                    <textarea readOnly value={finding.supportingLinks || ''} className="form-input" rows={4} style={{ width: '100%', pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Affected Hosts</div>
                    <textarea readOnly value={finding.affectedHosts || ''} className="form-input" rows={2} style={{ width: '100%', pointerEvents: 'none' }} />
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
                    <input readOnly type="text" value={finding.category || ''} className="form-input" style={{ pointerEvents: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</div>
                    <select disabled value={finding.severity || ''} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', pointerEvents: 'none', opacity: 1, color: 'var(--text-main)' }}>
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

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', fontSize: '0.8rem', color: 'var(--text-muted)', gap: '0 0.25rem' }}>
                <div>Created</div>
                <div>{new Date(finding.createdAt).toLocaleDateString()}</div>
                <div>Updated</div>
                <div>{new Date(finding.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </>
        ) : (
          // EDIT MODE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
            {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}

            {engagementScoped ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                    <input ref={titleInputRef} type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 120px', gap: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
                      <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}>
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
                      <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Observation</div>
                    <textarea value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Background</div>
                    <textarea value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                      onKeyDown={engagementScoped ? undefined : (e) => {
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
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Affected Hosts</div>
                    <textarea
                      value={formData.affectedHosts}
                      onChange={e => setFormData({...formData, affectedHosts: e.target.value})}
                      className="form-input"
                      rows={2}
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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 120px', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
                    <input ref={titleInputRef} type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required onFocus={handleEditFieldFocus} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</div>
                    <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-main)' }}>
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
                    <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="form-input" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onFocus={(e) => { try { if (typeof (e.target as any).showPicker === 'function') { (e.target as any).showPicker(); } } catch(err) {} }}>
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
                    <textarea value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})} className="form-input" rows={4} style={{ width: '100%' }} onFocus={handleEditFieldFocus}></textarea>
                  </div>
                ) : null}

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
                    onKeyDown={engagementScoped ? undefined : (e) => {
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

                {engagementScoped ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Affected Hosts</div>
                    <textarea
                      value={formData.affectedHosts}
                      onChange={e => setFormData({...formData, affectedHosts: e.target.value})}
                      className="form-input"
                      rows={2}
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
                ) : null}
              </div>
            )}

            <div style={{ marginTop: '0.5rem', height: '2.5rem' }} />
          </div>
        )}
      </Modal>
      )}
    </>
  );
}