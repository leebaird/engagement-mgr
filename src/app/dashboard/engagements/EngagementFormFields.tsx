'use client';

import { ReactNode, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { sortContactIds, sortContactsByTitle } from '@/lib/contact-title-sort';
import { sortOperatorIds, sortOperatorsByTitle } from '@/lib/operator-title-sort';

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

const MAX_TRUSTED_AGENTS = 2;
const MAX_CONTACTS = 6;
const MAX_OPERATORS = 6;

type FormTab = 'overview' | 'scope' | 'people';

const FORM_TABS: { id: FormTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'scope', label: 'Scope' },
  { id: 'people', label: 'People' },
];

function renderSelectedRelationEntries(
  ids: string[],
  resolve: (id: string) => { key: string; name: string; subtitle?: string | null } | null
) {
  if (ids.length === 0) {
    return <span className="engagement-relation-picker__placeholder">None assigned</span>;
  }

  return ids.map((id) => {
    const entry = resolve(id);
    if (!entry) return null;

    return (
      <div key={entry.key} style={{ minHeight: 0, flexShrink: 0 }}>
        <div className="engagement-relation-picker__entry-name">{entry.name}</div>
        {entry.subtitle ? (
          <div className="engagement-relation-picker__entry-subtitle">{entry.subtitle}</div>
        ) : null}
      </div>
    );
  });
}

type EngagementFormFieldsProps = {
  clients: { id: string; company: string }[];
  contacts: { id: string; name: string; title: string | null; clientId: string }[];
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
  values,
  defaultValues,
  onFieldChange,
  autoFocusCodeName = false,
  readOnly = false,
  footer,
}: EngagementFormFieldsProps) {
  const controlled = values !== undefined && onFieldChange !== undefined;
  const [activeTab, setActiveTab] = useState<FormTab>('overview');

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

  const sortedContacts = useMemo(
    () => sortContactsByTitle(contacts),
    [contacts]
  );

  const sortedOperators = useMemo(
    () => sortOperatorsByTitle(operators),
    [operators]
  );

  const sortedSelectedTAs = useMemo(
    () => sortContactIds(selectedTAs, contacts),
    [selectedTAs, contacts]
  );

  const sortedSelectedContacts = useMemo(
    () => sortContactIds(selectedContacts, contacts),
    [selectedContacts, contacts]
  );

  const sortedSelectedOps = useMemo(
    () => sortOperatorIds(selectedOps, operators),
    [selectedOps, operators]
  );

  // Required fields live on the Overview tab; if validation fails while another
  // tab is visible, switch tabs synchronously so the browser can focus the field.
  const handleInvalidCapture = (e: React.FormEvent<HTMLElement>) => {
    const tab = (e.target as HTMLElement)
      .closest('[data-form-tab]')
      ?.getAttribute('data-form-tab') as FormTab | null;
    if (tab && tab !== activeTab) {
      flushSync(() => setActiveTab(tab));
    }
  };

  const panelClass = (tab: FormTab) =>
    tab === activeTab ? 'detail-tabpanel' : 'detail-tabpanel detail-tabpanel--hidden';

  return (
    <>
      <nav className="detail-tabs" aria-label="Engagement form sections">
        {FORM_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'detail-tab detail-tab--btn detail-tab--active' : 'detail-tab detail-tab--btn'}
            aria-current={tab.id === activeTab ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div onInvalidCapture={handleInvalidCapture}>
        <div className={panelClass('overview')} data-form-tab="overview">
          <div className="form-group">
            <label className="form-label">Code Name</label>
            <input
              ref={codeNameRef}
              type="text"
              className="form-input"
              required={!readOnly}
              autoFocus={autoFocusCodeName && !readOnly}
              {...textProps('codeName', 'codeName')}
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
          <div className="engagement-form-pairs">
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
            <div className="form-group">
              <label className="form-label">Focus</label>
              <input type="text" className="form-input" {...textProps('focus', 'focus')} />
            </div>
            <div className="form-group">
              <label className="form-label">Charge Code</label>
              <input type="text" className="form-input" {...textProps('chargeCode', 'chargeCode')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows={6}
              {...textProps('notes', 'notes')}
            />
          </div>
        </div>

        <div className={panelClass('scope')} data-form-tab="scope">
          <div className="form-group">
            <label className="form-label">Objectives</label>
            <textarea
              className="form-input"
              rows={10}
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

        <div className={panelClass('people')} data-form-tab="people">
          <div className="form-group" style={{ position: 'relative' }} ref={taDropdownRef}>
            <label className="form-label">Trusted Agents</label>
            <div
              tabIndex={readOnly ? -1 : 0}
              className="form-input engagement-relation-picker__trigger"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                cursor: readOnly ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem',
                userSelect: 'none',
                boxSizing: 'border-box',
                pointerEvents: readOnly ? 'none' : undefined,
              }}
              onClick={readOnly ? undefined : () => setTasOpen(!tasOpen)}
              onKeyDown={readOnly ? undefined : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTasOpen(!tasOpen);
                }
              }}
            >
              <div
                className="engagement-relation-picker__selected"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.125rem',
                }}
              >
                {renderSelectedRelationEntries(sortedSelectedTAs, (id) => {
                  const contact = contacts.find((c) => c.id === id);
                  if (!contact) return null;
                  return {
                    key: contact.id,
                    name: contact.name,
                    subtitle: contact.title,
                  };
                })}
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            </div>
            {!readOnly && tasOpen && (
              <div
                className="engagement-relation-picker__list engagement-relation-picker__list--2"
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
                {sortedContacts.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      cursor: selectedTAs.includes(c.id) || selectedTAs.length < MAX_TRUSTED_AGENTS ? 'pointer' : 'not-allowed',
                      borderRadius: '4px',
                      background: selectedTAs.includes(c.id) ? 'rgb(var(--accent-rgb) / 0.16)' : 'transparent',
                      opacity: !selectedTAs.includes(c.id) && selectedTAs.length >= MAX_TRUSTED_AGENTS ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTAs.includes(c.id)}
                      disabled={!selectedTAs.includes(c.id) && selectedTAs.length >= MAX_TRUSTED_AGENTS}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedTAs.length < MAX_TRUSTED_AGENTS) setSelectedTAs([...selectedTAs, c.id]);
                        } else {
                          setSelectedTAs(selectedTAs.filter((id) => id !== c.id));
                        }
                      }}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{c.name}</span>
                      {c.title ? (
                        <span className="engagement-relation-picker__entry-subtitle">{c.title}</span>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ position: 'relative' }} ref={contactDropdownRef}>
            <label className="form-label">Contacts</label>
            <div
              tabIndex={readOnly ? -1 : 0}
              className="form-input engagement-relation-picker__trigger"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                cursor: readOnly ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem',
                userSelect: 'none',
                boxSizing: 'border-box',
                pointerEvents: readOnly ? 'none' : undefined,
              }}
              onClick={readOnly ? undefined : () => setContactsOpen(!contactsOpen)}
              onKeyDown={readOnly ? undefined : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setContactsOpen(!contactsOpen);
                }
              }}
            >
              <div
                className="engagement-relation-picker__selected"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.125rem',
                }}
              >
                {renderSelectedRelationEntries(sortedSelectedContacts, (id) => {
                  const contact = contacts.find((c) => c.id === id);
                  if (!contact) return null;
                  return {
                    key: contact.id,
                    name: contact.name,
                    subtitle: contact.title,
                  };
                })}
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            </div>
            {!readOnly && contactsOpen && (
              <div
                className="engagement-relation-picker__list engagement-relation-picker__list--6"
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
                {sortedContacts.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      cursor: selectedContacts.includes(c.id) || selectedContacts.length < MAX_CONTACTS ? 'pointer' : 'not-allowed',
                      borderRadius: '4px',
                      background: selectedContacts.includes(c.id) ? 'rgb(var(--accent-rgb) / 0.16)' : 'transparent',
                      opacity: !selectedContacts.includes(c.id) && selectedContacts.length >= MAX_CONTACTS ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      disabled={!selectedContacts.includes(c.id) && selectedContacts.length >= MAX_CONTACTS}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedContacts.length < MAX_CONTACTS) {
                            setSelectedContacts([...selectedContacts, c.id]);
                          }
                        } else {
                          setSelectedContacts(selectedContacts.filter((id) => id !== c.id));
                        }
                      }}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{c.name}</span>
                      {c.title ? (
                        <span className="engagement-relation-picker__entry-subtitle">{c.title}</span>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label className="form-label">Operators</label>
            <div
              tabIndex={readOnly ? -1 : 0}
              className="form-input engagement-relation-picker__trigger"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                cursor: readOnly ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem',
                userSelect: 'none',
                boxSizing: 'border-box',
                pointerEvents: readOnly ? 'none' : undefined,
              }}
              onClick={readOnly ? undefined : () => setOpsOpen(!opsOpen)}
              onKeyDown={readOnly ? undefined : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpsOpen(!opsOpen);
                }
              }}
            >
              <div
                className="engagement-relation-picker__selected"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.125rem',
                }}
              >
                {renderSelectedRelationEntries(sortedSelectedOps, (id) => {
                  const operator = operators.find((o) => o.id === id);
                  if (!operator) return null;
                  return {
                    key: operator.id,
                    name: operator.name,
                    subtitle: operator.title,
                  };
                })}
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            </div>
            {!readOnly && opsOpen && (
              <div
                className="engagement-relation-picker__list engagement-relation-picker__list--6"
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
                {sortedOperators.map((o) => (
                  <label
                    key={o.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      cursor: selectedOps.includes(o.id) || selectedOps.length < MAX_OPERATORS ? 'pointer' : 'not-allowed',
                      borderRadius: '4px',
                      background: selectedOps.includes(o.id) ? 'rgb(var(--accent-rgb) / 0.16)' : 'transparent',
                      opacity: !selectedOps.includes(o.id) && selectedOps.length >= MAX_OPERATORS ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOps.includes(o.id)}
                      disabled={!selectedOps.includes(o.id) && selectedOps.length >= MAX_OPERATORS}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedOps.length < MAX_OPERATORS) setSelectedOps([...selectedOps, o.id]);
                        } else {
                          setSelectedOps(selectedOps.filter((id) => id !== o.id));
                        }
                      }}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{o.name}</span>
                      {o.title ? <span className="engagement-relation-picker__entry-subtitle">{o.title}</span> : null}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {footer}
    </>
  );
}
