'use client';

import { ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type EngagementFormValues = {
  codeName: string;
  clientName: string;
  chargeCode: string;
  status: string;
  focus: string;
  type: string;
  location: string;
  objectives: string;
  targets: string;
  exclusions: string;
  notes: string;
};

export function engagementToFormValues(engagement: {
  codeName?: string | null;
  client?: { company: string } | null;
  chargeCode?: string | null;
  status?: string | null;
  focus?: string | null;
  type?: string | null;
  location?: string | null;
  objectives?: string | null;
  targets?: string | null;
  exclusions?: string | null;
  notes?: string | null;
}): EngagementFormValues {
  return {
    codeName: engagement.codeName || '',
    clientName: engagement.client?.company || '',
    chargeCode: engagement.chargeCode || '',
    status: engagement.status || '',
    focus: engagement.focus || '',
    type: engagement.type || '',
    location: engagement.location || '',
    objectives: engagement.objectives || '',
    targets: engagement.targets || '',
    exclusions: engagement.exclusions || '',
    notes: engagement.notes || '',
  };
}

type EngagementFormFieldsProps = {
  clients: { id: string; company: string }[];
  contacts: { id: string; name: string; clientId: string }[];
  operators: { id: string; name: string; title: string | null }[];
  selectedOps: string[];
  setSelectedOps: React.Dispatch<React.SetStateAction<string[]>>;
  opsOpen: boolean;
  setOpsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedContacts: string[];
  setSelectedContacts: React.Dispatch<React.SetStateAction<string[]>>;
  contactsOpen: boolean;
  setContactsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTAs: string[];
  setSelectedTAs: React.Dispatch<React.SetStateAction<string[]>>;
  tasOpen: boolean;
  setTasOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dropdownRef: RefObject<HTMLDivElement | null>;
  contactDropdownRef: RefObject<HTMLDivElement | null>;
  taDropdownRef: RefObject<HTMLDivElement | null>;
  codeNameRef: RefObject<HTMLInputElement | null>;
  notesRef: RefObject<HTMLTextAreaElement | null>;
  contactsTriggerRef: RefObject<HTMLDivElement | null>;
  taTriggerRef: RefObject<HTMLDivElement | null>;
  operatorsTriggerRef: RefObject<HTMLDivElement | null>;
  values?: EngagementFormValues;
  defaultValues?: EngagementFormValues;
  onFieldChange?: (field: keyof EngagementFormValues, value: string) => void;
  autoFocusCodeName?: boolean;
  readOnly?: boolean;
  footer?: ReactNode;
};

type SelectOption = {
  value: string;
  label: string;
};

const statusOptions: SelectOption[] = [
  { value: '', label: '' },
  { value: 'Prep', label: 'Prep' },
  { value: 'Recon', label: 'Recon' },
  { value: 'Testing', label: 'Testing' },
  { value: 'Reporting', label: 'Reporting' },
  { value: 'Complete', label: 'Complete' },
];

const typeOptions: SelectOption[] = [
  { value: '', label: '' },
  { value: 'AI', label: 'AI' },
  { value: 'Code_Review', label: 'Code Review' },
  { value: 'Firewall', label: 'Firewall' },
  { value: 'Multi', label: 'Multi' },
  { value: 'Pentest', label: 'Pentest' },
  { value: 'Phishing', label: 'Phishing' },
  { value: 'Physical', label: 'Physical' },
  { value: 'Purple_Team', label: 'Purple Team' },
  { value: 'Red_Team', label: 'Red Team' },
  { value: 'USB_Drop', label: 'USB Drop' },
  { value: 'Vishing', label: 'Vishing' },
  { value: 'Web_App', label: 'Web App' },
  { value: 'Wireless', label: 'Wireless' },
];

const locationOptions: SelectOption[] = [
  { value: '', label: '' },
  { value: 'Internal', label: 'Internal' },
  { value: 'External', label: 'External' },
];

function EngagementSelect({
  field,
  name,
  options,
  values,
  defaultValues,
  onFieldChange,
  readOnly,
}: {
  field: keyof EngagementFormValues;
  name: string;
  options: SelectOption[];
  values?: EngagementFormValues;
  defaultValues?: EngagementFormValues;
  onFieldChange?: (field: keyof EngagementFormValues, value: string) => void;
  readOnly: boolean;
}) {
  const controlled = values !== undefined && onFieldChange !== undefined;
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(defaultValues?.[field] ?? '');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const value = values ? values[field] : localValue;
  const selectedLabel = options.find((option) => option.value === value)?.label ?? '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const chooseOption = (nextValue: string) => {
    if (controlled) {
      onFieldChange(field, nextValue);
    } else {
      setLocalValue(nextValue);
    }
    setOpen(false);
  };

  return (
    <div className="engagement-select" ref={wrapperRef}>
      {!readOnly ? <input type="hidden" name={name} value={value} /> : null}
      <div
        tabIndex={readOnly ? -1 : 0}
        className="form-input engagement-select__trigger"
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={readOnly ? undefined : () => setOpen(!open)}
        onKeyDown={readOnly ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={16} color="var(--text-muted)" />
      </div>
      {!readOnly && open ? (
        <div className="engagement-select__menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value || 'empty'}
              type="button"
              className={`engagement-select__option${option.value === value ? ' engagement-select__option--selected' : ''}`}
              onClick={() => chooseOption(option.value)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label || <span>&nbsp;</span>}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EngagementFormFields({
  clients,
  contacts,
  operators,
  selectedOps,
  setSelectedOps,
  opsOpen,
  setOpsOpen,
  selectedContacts,
  setSelectedContacts,
  contactsOpen,
  setContactsOpen,
  selectedTAs,
  setSelectedTAs,
  tasOpen,
  setTasOpen,
  dropdownRef,
  contactDropdownRef,
  taDropdownRef,
  codeNameRef,
  notesRef,
  contactsTriggerRef,
  taTriggerRef,
  operatorsTriggerRef,
  values,
  defaultValues,
  onFieldChange,
  autoFocusCodeName = false,
  readOnly = false,
  footer,
}: EngagementFormFieldsProps) {
  const controlled = values !== undefined && onFieldChange !== undefined;

  const textProps = (field: keyof EngagementFormValues, name: string, extra?: { required?: boolean; autoFocus?: boolean }) => {
    if (readOnly && values) {
      return { value: values[field], readOnly: true as const };
    }
    if (controlled && values) {
      return {
        value: values[field],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onFieldChange!(field, e.target.value),
      };
    }
    if (defaultValues) {
      return { name, defaultValue: defaultValues[field], ...extra };
    }
    return { name, ...extra };
  };

  return (
    <>
      <div className="engagement-form-grid">
      <div className="engagement-col-left engagement-form-col">
        <div className="form-group">
          <label className="form-label">Code Name</label>
          <input
            ref={codeNameRef}
            type="text"
            className="form-input"
            required={!readOnly}
            autoFocus={autoFocusCodeName && !readOnly}
            {...textProps('codeName', 'codeName')}
            onKeyDown={readOnly ? undefined : (e) => {
              if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                setOpsOpen(false);
                setContactsOpen(false);
                setTasOpen(false);
                operatorsTriggerRef.current?.focus();
              }
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Client</label>
          <input
            type="text"
            className="form-input"
            required={!readOnly}
            list={readOnly ? undefined : 'engagement-client-list'}
            {...textProps('clientName', 'clientName')}
          />
          {!readOnly && (
            <datalist id="engagement-client-list">
              {clients.map((c) => (
                <option key={c.id} value={c.company} />
              ))}
            </datalist>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Charge Code</label>
          <input type="text" className="form-input" {...textProps('chargeCode', 'chargeCode')} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <EngagementSelect
            field="status"
            name="status"
            options={statusOptions}
            values={values}
            defaultValues={defaultValues}
            onFieldChange={onFieldChange}
            readOnly={readOnly}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Focus</label>
          <input type="text" className="form-input" {...textProps('focus', 'focus')} />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <EngagementSelect
            field="type"
            name="type"
            options={typeOptions}
            values={values}
            defaultValues={defaultValues}
            onFieldChange={onFieldChange}
            readOnly={readOnly}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <EngagementSelect
            field="location"
            name="location"
            options={locationOptions}
            values={values}
            defaultValues={defaultValues}
            onFieldChange={onFieldChange}
            readOnly={readOnly}
          />
        </div>
        {footer}
      </div>

      <div className="engagement-form-col engagement-form-col--scope">
        <div className="form-group">
          <label className="form-label">Objectives</label>
          <textarea
            className="form-input"
            rows={8}
            {...textProps('objectives', 'objectives')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Targets</label>
          <textarea
            className="form-input"
            rows={4}
            {...textProps('targets', 'targets')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Exclusions</label>
          <textarea
            className="form-input"
            rows={4}
            {...textProps('exclusions', 'exclusions')}
          />
        </div>
      </div>

      <div className="engagement-form-col-right engagement-form-col--relations">
        <div className="engagement-form-relations-fields">
        <div className="form-group" style={{ position: 'relative' }} ref={contactDropdownRef}>
          <label className="form-label">Contacts</label>
          <div
            ref={contactsTriggerRef}
            tabIndex={readOnly ? -1 : 0}
            className="form-input"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              cursor: readOnly ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.5rem',
              userSelect: 'none',
              minHeight: 'calc(0.75rem * 2 + 2 * 1rem * 1.5)',
              boxSizing: 'border-box',
              pointerEvents: readOnly ? 'none' : undefined,
            }}
            onClick={readOnly ? undefined : () => setContactsOpen(!contactsOpen)}
            onKeyDown={readOnly ? undefined : (e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                setContactsOpen(false);
                setOpsOpen(false);
                setTasOpen(false);
                taTriggerRef.current?.focus();
              } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                setContactsOpen(false);
                notesRef.current?.focus();
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setContactsOpen(!contactsOpen);
              }
            }}
          >
            <span
              style={{
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                flex: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {selectedContacts.map((id) => contacts.find((c) => c.id === id)?.name).join(', ')}
            </span>
            <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
          </div>
          {!readOnly && contactsOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#11141b',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                marginTop: '0.25rem',
                zIndex: 10,
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {contacts.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    background: selectedContacts.includes(c.id) ? 'rgba(0,102,255,0.16)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContacts([...selectedContacts, c.id]);
                      } else {
                        setSelectedContacts(selectedContacts.filter((id) => id !== c.id));
                      }
                    }}
                    style={{ accentColor: 'var(--primary-color)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{c.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {clients.find((client) => client.id === c.clientId)?.company}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-group" style={{ position: 'relative' }} ref={taDropdownRef}>
          <label className="form-label">Trusted Agents</label>
          <div
            ref={taTriggerRef}
            tabIndex={readOnly ? -1 : 0}
            className="form-input"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              cursor: readOnly ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
              pointerEvents: readOnly ? 'none' : undefined,
            }}
            onClick={readOnly ? undefined : () => setTasOpen(!tasOpen)}
            onKeyDown={readOnly ? undefined : (e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                setTasOpen(false);
                setContactsOpen(false);
                operatorsTriggerRef.current?.focus();
              } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                setTasOpen(false);
                contactsTriggerRef.current?.focus();
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTasOpen(!tasOpen);
              }
            }}
          >
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedTAs.map((id) => contacts.find((c) => c.id === id)?.name).join(', ')}
            </span>
            <ChevronDown size={16} color="var(--text-muted)" />
          </div>
          {!readOnly && tasOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#11141b',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                marginTop: '0.25rem',
                zIndex: 10,
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {contacts.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    background: selectedTAs.includes(c.id) ? 'rgba(0,102,255,0.16)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTAs.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedTAs.length < 2) setSelectedTAs([...selectedTAs, c.id]);
                      } else {
                        setSelectedTAs(selectedTAs.filter((id) => id !== c.id));
                      }
                    }}
                    style={{ accentColor: 'var(--primary-color)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{c.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {clients.find((client) => client.id === c.clientId)?.company}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
          <label className="form-label">Operators</label>
          <div
            ref={operatorsTriggerRef}
            tabIndex={readOnly ? -1 : 0}
            className="form-input engagement-operator-picker__trigger"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              cursor: readOnly ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.5rem',
              userSelect: 'none',
              minHeight: 'calc(0.75rem * 2 + 2 * 1rem * 1.5)',
              boxSizing: 'border-box',
              pointerEvents: readOnly ? 'none' : undefined,
            }}
            onClick={readOnly ? undefined : () => setOpsOpen(!opsOpen)}
            onKeyDown={readOnly ? undefined : (e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                setOpsOpen(false);
                setTasOpen(false);
                setContactsOpen(false);
                notesRef.current?.focus();
              } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                setOpsOpen(false);
                taTriggerRef.current?.focus();
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpsOpen(!opsOpen);
              }
            }}
          >
            <div
              className="engagement-operator-picker__selected"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.125rem',
                color: 'var(--text-muted)',
                overflowY: 'auto',
              }}
            >
              {selectedOps.length === 0 ? (
                <span style={{ lineHeight: 1.5 }} />
              ) : (
                selectedOps.map((id) => {
                  const op = operators.find((o) => o.id === id);
                  if (!op) return null;
                  return (
                    <div key={id} style={{ minHeight: 0, flexShrink: 0 }}>
                      <div style={{ lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.name}</div>
                      {op.title ? (
                        <div style={{ fontSize: '0.7rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.title}</div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
          </div>
          {!readOnly && opsOpen && (
            <div
              className="engagement-operator-picker__list"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#11141b',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                marginTop: '0.25rem',
                zIndex: 10,
                overflowY: 'auto',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {operators.map((o) => (
                <label
                  key={o.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    background: selectedOps.includes(o.id) ? 'rgba(0,102,255,0.16)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedOps.includes(o.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOps([...selectedOps, o.id]);
                      } else {
                        setSelectedOps(selectedOps.filter((id) => id !== o.id));
                      }
                    }}
                    style={{ accentColor: 'var(--primary-color)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{o.name}</span>
                    {o.title ? <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{o.title}</span> : null}
                  </div>
                </label>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="engagement-form-notes-section">
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            ref={notesRef}
            className="form-input"
            rows={5}
            {...textProps('notes', 'notes')}
            onKeyDown={readOnly ? undefined : (e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                setOpsOpen(false);
                setTasOpen(false);
                setContactsOpen(false);
                codeNameRef.current?.focus();
              }
            }}
          />
        </div>
      </div>
    </div>

    </>
  );
}
