export type SchedulePhase = 'Planning' | 'Prep' | 'Testing' | 'Reporting' | 'Outbrief';
export type ScheduleEventKind = 'start' | 'end';

export type ScheduleEvent = {
  engagementId: string;
  codeName: string;
  phase: SchedulePhase;
  kind: ScheduleEventKind;
  date: string;
};

export type EngagementScheduleSource = {
  id: string;
  codeName: string;
  startPlanning?: string | Date | null;
  endPlanning?: string | Date | null;
  startPrep?: string | Date | null;
  endPrep?: string | Date | null;
  startTesting?: string | Date | null;
  endTesting?: string | Date | null;
  startReporting?: string | Date | null;
  endReporting?: string | Date | null;
  outbrief?: string | Date | null;
};

export const SCHEDULE_PHASE_COLORS: Record<SchedulePhase, string> = {
  Planning: '#eab308',
  Prep: '#f97316',
  Testing: '#ef4444',
  Reporting: '#0066ff',
  Outbrief: '#00cc66',
};

const SCHEDULE_FIELD_MAP: {
  phase: SchedulePhase;
  kind: ScheduleEventKind;
  field: keyof EngagementScheduleSource;
}[] = [
  { phase: 'Planning', kind: 'start', field: 'startPlanning' },
  { phase: 'Planning', kind: 'end', field: 'endPlanning' },
  { phase: 'Prep', kind: 'start', field: 'startPrep' },
  { phase: 'Prep', kind: 'end', field: 'endPrep' },
  { phase: 'Testing', kind: 'start', field: 'startTesting' },
  { phase: 'Testing', kind: 'end', field: 'endTesting' },
  { phase: 'Reporting', kind: 'start', field: 'startReporting' },
  { phase: 'Reporting', kind: 'end', field: 'endReporting' },
  { phase: 'Outbrief', kind: 'start', field: 'outbrief' },
];

export function toDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

export function extractScheduleEvents(engagements: EngagementScheduleSource[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];

  for (const engagement of engagements) {
    for (const { phase, kind, field } of SCHEDULE_FIELD_MAP) {
      const date = toDateKey(engagement[field] as string | Date | null | undefined);
      if (!date) continue;
      events.push({
        engagementId: engagement.id,
        codeName: engagement.codeName,
        phase,
        kind,
        date,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.codeName.localeCompare(b.codeName));
}

export function isDateInPhaseRange(
  dateKey: string,
  start: string | null,
  end: string | null,
): boolean {
  if (!start) return false;
  const rangeEnd = end && end >= start ? end : start;
  return dateKey >= start && dateKey <= rangeEnd;
}

export function getPhaseRangesForEngagement(engagement: EngagementScheduleSource) {
  return [
    {
      phase: 'Planning' as const,
      start: toDateKey(engagement.startPlanning),
      end: toDateKey(engagement.endPlanning),
    },
    {
      phase: 'Prep' as const,
      start: toDateKey(engagement.startPrep),
      end: toDateKey(engagement.endPrep),
    },
    {
      phase: 'Testing' as const,
      start: toDateKey(engagement.startTesting),
      end: toDateKey(engagement.endTesting),
    },
    {
      phase: 'Reporting' as const,
      start: toDateKey(engagement.startReporting),
      end: toDateKey(engagement.endReporting),
    },
  ];
}

export function formatScheduleEventLabel(event: ScheduleEvent): string {
  if (event.phase === 'Outbrief') return `${event.codeName} — Outbrief`;
  const kindLabel = event.kind === 'start' ? 'Start' : 'End';
  return `${event.codeName} — ${event.phase} ${kindLabel}`;
}