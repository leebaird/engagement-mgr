'use client';

import Link from 'next/link';
import { buildPathQuery, type SearchParamRecord } from '@/lib/list-view-params';
import { DisplayDate } from '@/components/DateFormatProvider';
import { formatEngagementType } from '@/lib/format';
import { SCHEDULE_PHASE_COLORS, type SchedulePhase } from '@/lib/engagement-schedule-events';
import { sortContactIds } from '@/lib/contact-title-sort';
import { sortOperatorIds } from '@/lib/operator-title-sort';

export type EngagementDetailTab = 'overview' | 'scope' | 'people' | 'schedule';

const TABS: { id: EngagementDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'scope', label: 'Scope' },
  { id: 'people', label: 'People' },
  { id: 'schedule', label: 'Schedule' },
];

type Relation = { id: string };

export type EngagementDetailViewData = {
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
  operators?: Relation[];
  contacts?: Relation[];
  trustedAgents?: Relation[];
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

const SCHEDULE_ROWS: {
  label: SchedulePhase;
  start: keyof EngagementDetailViewData;
  end?: keyof EngagementDetailViewData;
}[] = [
  { label: 'Prep', start: 'startPrep', end: 'endPrep' },
  { label: 'Recon', start: 'startRecon', end: 'endRecon' },
  { label: 'Testing', start: 'startTesting', end: 'endTesting' },
  { label: 'Reporting', start: 'startReporting', end: 'endReporting' },
  { label: 'Outbrief', start: 'outbrief' },
];

function scheduleValue(engagement: EngagementDetailViewData, key: keyof EngagementDetailViewData) {
  const value = engagement[key];
  return typeof value === 'string' || value instanceof Date ? value : null;
}

function hasSchedule(engagement: EngagementDetailViewData): boolean {
  return SCHEDULE_ROWS.some((row) => scheduleValue(engagement, row.start) || (row.end && scheduleValue(engagement, row.end)));
}

function ProseSection({ label, value }: { label: string; value?: string | null }) {
  return (
    <section className="detail-section">
      <h3 className="detail-section__label">{label}</h3>
      {value ? (
        <div className="prose-block">{value}</div>
      ) : (
        <div className="prose-block prose-block--empty">None.</div>
      )}
    </section>
  );
}

function PersonChip({ name, title }: { name: string; title?: string | null }) {
  return (
    <div className="person-chip">
      <span className="person-chip__name">{name}</span>
      {title ? <span className="person-chip__title">{title}</span> : null}
    </div>
  );
}

function PeopleGroup({
  label,
  ids,
  resolve,
}: {
  label: string;
  ids: string[];
  resolve: (id: string) => { name: string; title?: string | null } | null;
}) {
  const entries = ids.map((id) => resolve(id)).filter((e): e is { name: string; title?: string | null } => e !== null);
  return (
    <section className="detail-section">
      <h3 className="detail-section__label">{label} ({entries.length})</h3>
      {entries.length === 0 ? (
        <p className="people-empty">None assigned.</p>
      ) : (
        <div className="people-list">
          {entries.map((entry) => (
            <PersonChip key={entry.name} name={entry.name} title={entry.title} />
          ))}
        </div>
      )}
    </section>
  );
}

export function EngagementDetailView({
  engagement,
  contacts,
  operators,
  activeTab,
  listParams,
  scheduleEditHref,
  isAdmin = false,
}: {
  engagement: EngagementDetailViewData;
  contacts: { id: string; name: string; title: string | null }[];
  operators: { id: string; name: string; title: string | null }[];
  activeTab: EngagementDetailTab;
  listParams: SearchParamRecord;
  scheduleEditHref?: string;
  isAdmin?: boolean;
}) {
  const tabHref = (tab: EngagementDetailTab) =>
    buildPathQuery('/dashboard/engagements', listParams, {
      detail: engagement.id,
      tab: tab === 'overview' ? null : tab,
      edit: null,
      delete: null,
      deleteError: null,
      saveError: null,
    });

  const chips: { label: string; accent?: boolean }[] = [];
  if (engagement.status) chips.push({ label: engagement.status, accent: true });
  if (engagement.type) chips.push({ label: formatEngagementType(engagement.type) });
  if (engagement.location) chips.push({ label: engagement.location });
  if (engagement.focus) chips.push({ label: engagement.focus });
  if (engagement.chargeCode) chips.push({ label: `Charge ${engagement.chargeCode}` });

  const selectedTAs = sortContactIds(engagement.trustedAgents?.map((t) => t.id) ?? [], contacts);
  const selectedContacts = sortContactIds(engagement.contacts?.map((c) => c.id) ?? [], contacts);
  const selectedOps = sortOperatorIds(engagement.operators?.map((o) => o.id) ?? [], operators);

  const resolveContact = (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    return contact ? { name: contact.name, title: contact.title } : null;
  };
  const resolveOperator = (id: string) => {
    const operator = operators.find((o) => o.id === id);
    return operator ? { name: operator.name, title: operator.title } : null;
  };

  return (
    <div className="engagement-detail-view">
      <nav className="detail-tabs" aria-label="Engagement detail sections">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id)}
            scroll={false}
            className={tab.id === activeTab ? 'detail-tab detail-tab--active' : 'detail-tab'}
            aria-current={tab.id === activeTab ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === 'overview' ? (
        <div className="detail-tabpanel">
          {chips.length > 0 ? (
            <div className="detail-meta">
              {chips.map((chip) => (
                <span key={chip.label} className={chip.accent ? 'chip chip--accent' : 'chip'}>
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="detail-field">
            <span className="detail-field__label">Client</span>
            {engagement.client ? (
              <a href={`/dashboard/clients?detail=${engagement.client.id}`} className="detail-field__link">
                {engagement.client.company}
              </a>
            ) : (
              <span className="detail-field__value detail-field__value--empty">Unassigned</span>
            )}
          </div>

          <section className="detail-section">
            <h3 className="detail-section__label">Timeline</h3>
            {hasSchedule(engagement) ? (
              <div className="timeline-strip">
                {SCHEDULE_ROWS.map((row) => {
                  const start = scheduleValue(engagement, row.start);
                  const end = row.end ? scheduleValue(engagement, row.end) : null;
                  return (
                    <div key={row.label} className="timeline-phase">
                      <div className="timeline-phase__label">
                        <span className="timeline-phase__dot" style={{ background: SCHEDULE_PHASE_COLORS[row.label] }} />
                        {row.label}
                      </div>
                      <div className="timeline-phase__dates">
                        {start ? <DisplayDate value={start} dateOnly /> : '—'}
                        {row.end ? (
                          <>
                            {' → '}
                            {end ? <DisplayDate value={end} dateOnly /> : '—'}
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="people-empty">No schedule set.</p>
            )}
          </section>

          <ProseSection label="Notes" value={engagement.notes} />
        </div>
      ) : null}

      {activeTab === 'scope' ? (
        <div className="detail-tabpanel">
          <ProseSection label="Objectives" value={engagement.objectives} />
          <ProseSection label="Targets" value={engagement.targets} />
          <ProseSection label="Exclusions" value={engagement.exclusions} />
        </div>
      ) : null}

      {activeTab === 'people' ? (
        <div className="detail-tabpanel people-grid">
          <PeopleGroup label="Trusted Agents" ids={selectedTAs} resolve={resolveContact} />
          <PeopleGroup label="Contacts" ids={selectedContacts} resolve={resolveContact} />
          <PeopleGroup label="Operators" ids={selectedOps} resolve={resolveOperator} />
        </div>
      ) : null}

      {activeTab === 'schedule' ? (
        <div className="detail-tabpanel">
          <div className="schedule-table">
            <div className="schedule-table__header" />
            <div className="schedule-table__header">Start</div>
            <div className="schedule-table__header">End</div>
            {SCHEDULE_ROWS.map((row) => {
              const start = scheduleValue(engagement, row.start);
              const end = row.end ? scheduleValue(engagement, row.end) : null;
              return (
                <div key={row.label} className="schedule-table__row">
                  <div className="timeline-phase__label">
                    <span className="timeline-phase__dot" style={{ background: SCHEDULE_PHASE_COLORS[row.label] }} />
                    {row.label}
                  </div>
                  <div className="schedule-table__date">{start ? <DisplayDate value={start} /> : '—'}</div>
                  <div className="schedule-table__date">
                    {row.end ? (end ? <DisplayDate value={end} /> : '—') : ''}
                  </div>
                </div>
              );
            })}
          </div>
          {isAdmin && scheduleEditHref ? (
            <div className="schedule-table__actions">
              <Link href={scheduleEditHref} scroll={false} className="modal-action-btn" style={{ textDecoration: 'none' }}>
                Edit Schedule
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
