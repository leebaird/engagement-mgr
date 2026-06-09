export type SchedulePhase = 'Prep' | 'Recon' | 'Testing' | 'Reporting' | 'Outbrief';
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

export const SCHEDULE_PHASE_COLORS: Record<SchedulePhase, string> = {
  Prep: '#f97316',
  Recon: '#eab308',
  Testing: '#ef4444',
  Reporting: '#0066ff',
  Outbrief: '#00cc66',
};

const SCHEDULE_FIELD_MAP: {
  phase: SchedulePhase;
  kind: ScheduleEventKind;
  field: keyof EngagementScheduleSource;
}[] = [
  { phase: 'Prep', kind: 'start', field: 'startPrep' },
  { phase: 'Prep', kind: 'end', field: 'endPrep' },
  { phase: 'Recon', kind: 'start', field: 'startRecon' },
  { phase: 'Recon', kind: 'end', field: 'endRecon' },
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
      phase: 'Prep' as const,
      start: toDateKey(engagement.startPrep),
      end: toDateKey(engagement.endPrep),
    },
    {
      phase: 'Recon' as const,
      start: toDateKey(engagement.startRecon),
      end: toDateKey(engagement.endRecon),
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