import { toDateInputValue } from '@/lib/date-input-value';

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
  status?: string | null;
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

export type EngagementCalendarItem = EngagementScheduleSource;

export type PhaseBanner = {
  engagementId: string;
  phase: SchedulePhase;
  label: string;
  start: string;
  end: string;
  color: string;
};

export type BannerRowSegment = {
  engagementId: string;
  phase: SchedulePhase;
  label: string;
  gridColumnStart: number;
  gridColumnEnd: number;
  color: string;
  lane: number;
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
  const dateKey = toDateInputValue(value);
  return dateKey || null;
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

export function getEngagementPhaseBanners(engagement: EngagementCalendarItem): PhaseBanner[] {
  const banners: PhaseBanner[] = [];

  for (const range of getPhaseRangesForEngagement(engagement)) {
    if (!range.start) continue;
    const end = range.end && range.end >= range.start ? range.end : range.start;
    banners.push({
      engagementId: engagement.id,
      phase: range.phase,
      label: `${engagement.codeName} - ${range.phase}`,
      start: range.start,
      end,
      color: SCHEDULE_PHASE_COLORS[range.phase],
    });
  }

  const outbrief = toDateKey(engagement.outbrief);
  if (outbrief) {
    banners.push({
      engagementId: engagement.id,
      phase: 'Outbrief',
      label: `${engagement.codeName} - Outbrief`,
      start: outbrief,
      end: outbrief,
      color: SCHEDULE_PHASE_COLORS.Outbrief,
    });
  }

  return banners;
}

export function isEngagementScheduledOnDate(
  engagement: EngagementCalendarItem,
  dateKey: string,
): boolean {
  for (const banner of getEngagementPhaseBanners(engagement)) {
    if (isDateInPhaseRange(dateKey, banner.start, banner.end)) return true;
  }
  return false;
}

function appendBannerSegmentsForRow(
  row: (string | null)[],
  banner: PhaseBanner,
  rawSegments: Omit<BannerRowSegment, 'lane'>[],
) {
  let segmentStart: number | null = null;

  for (let col = 0; col < row.length; col += 1) {
    const dateKey = row[col];
    const inRange = dateKey ? isDateInPhaseRange(dateKey, banner.start, banner.end) : false;

    if (inRange) {
      if (segmentStart === null) segmentStart = col;
    } else if (segmentStart !== null) {
      rawSegments.push({
        engagementId: banner.engagementId,
        phase: banner.phase,
        label: banner.label,
        gridColumnStart: segmentStart + 1,
        gridColumnEnd: col + 1,
        color: banner.color,
      });
      segmentStart = null;
    }
  }

  if (segmentStart !== null) {
    rawSegments.push({
      engagementId: banner.engagementId,
      phase: banner.phase,
      label: banner.label,
      gridColumnStart: segmentStart + 1,
      gridColumnEnd: row.length + 1,
      color: banner.color,
    });
  }
}

export function buildBannerSegmentsForRow(
  row: (string | null)[],
  engagements: EngagementCalendarItem[],
): BannerRowSegment[] {
  const rawSegments: Omit<BannerRowSegment, 'lane'>[] = [];

  for (const engagement of engagements) {
    for (const banner of getEngagementPhaseBanners(engagement)) {
      appendBannerSegmentsForRow(row, banner, rawSegments);
    }
  }

  rawSegments.sort((a, b) => a.gridColumnStart - b.gridColumnStart || a.label.localeCompare(b.label));

  const lanes: BannerRowSegment[][] = [];
  for (const segment of rawSegments) {
    let placed = false;
    for (let laneIdx = 0; laneIdx < lanes.length; laneIdx += 1) {
      const overlaps = lanes[laneIdx].some(
        (existing) =>
          segment.gridColumnStart < existing.gridColumnEnd &&
          segment.gridColumnEnd > existing.gridColumnStart,
      );
      if (!overlaps) {
        lanes[laneIdx].push({ ...segment, lane: laneIdx });
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([{ ...segment, lane: lanes.length }]);
    }
  }

  return lanes.flat();
}

export function getEngagementsOnDate(
  dateKey: string,
  engagements: EngagementCalendarItem[],
  eventsByDate: Map<string, ScheduleEvent[]>,
): EngagementCalendarItem[] {
  const seen = new Set<string>();
  const result: EngagementCalendarItem[] = [];

  for (const event of eventsByDate.get(dateKey) ?? []) {
    if (seen.has(event.engagementId)) continue;
    const engagement = engagements.find((item) => item.id === event.engagementId);
    if (!engagement) continue;
    seen.add(event.engagementId);
    result.push(engagement);
  }

  for (const engagement of engagements) {
    if (seen.has(engagement.id)) continue;
    if (!isEngagementScheduledOnDate(engagement, dateKey)) continue;
    seen.add(engagement.id);
    result.push(engagement);
  }

  return result;
}
