'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  buildBannerSegmentsForRow,
  extractScheduleEvents,
  getEngagementsOnDate,
  SCHEDULE_PHASE_COLORS,
  type EngagementCalendarItem,
  type ScheduleEvent,
  type SchedulePhase,
} from '@/lib/engagement-schedule-events';
import {
  EngagementScheduleModal,
  type ScheduleEngagement,
} from './engagements/EngagementScheduleModal';
import { Modal } from '@/components/Modal';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const PHASES: SchedulePhase[] = ['Prep', 'Recon', 'Testing', 'Reporting', 'Outbrief'];

type EngagementCalendarProps = {
  engagements: EngagementCalendarItem[];
  isAdmin?: boolean;
  viewYear: number;
  viewMonth: number;
  prevHref: string;
  nextHref: string;
  todayHref: string;
};

function toDateKeyFromParts(year: number, month: number, day: number): string {
  const monthPart = String(month + 1).padStart(2, '0');
  const dayPart = String(day).padStart(2, '0');
  return `${year}-${monthPart}-${dayPart}`;
}

function getWorkWeekIndex(date: Date): number | null {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return null;
  return dayOfWeek - 1;
}

function buildWorkWeekMonthGrid(year: number, month: number): (string | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const workWeekIndex = getWorkWeekIndex(date);
    if (workWeekIndex === null) continue;

    if (cells.length % 5 === 0) {
      for (let i = 0; i < workWeekIndex; i += 1) {
        cells.push(null);
      }
    }

    cells.push(toDateKeyFromParts(year, month, day));
  }

  while (cells.length % 5 !== 0) {
    cells.push(null);
  }

  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 5) {
    rows.push(cells.slice(i, i + 5));
  }
  return rows;
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatPickerDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString();
}

export function EngagementCalendar({
  engagements: initialEngagements,
  isAdmin = false,
  viewYear,
  viewMonth,
  prevHref,
  nextHref,
  todayHref,
}: EngagementCalendarProps) {
  const router = useRouter();
  const today = new Date();
  const todayKey = toDateKeyFromParts(today.getFullYear(), today.getMonth(), today.getDate());

  const [engagements, setEngagements] = useState(initialEngagements);
  const [pickerDateKey, setPickerDateKey] = useState<string | null>(null);
  const [pickerEngagements, setPickerEngagements] = useState<ScheduleEngagement[]>([]);
  const [scheduleEngagement, setScheduleEngagement] = useState<ScheduleEngagement | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  useEffect(() => {
    setEngagements(initialEngagements);
  }, [initialEngagements]);

  const events = useMemo(() => extractScheduleEvents(engagements), [engagements]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of events) {
      const existing = map.get(event.date) ?? [];
      existing.push(event);
      map.set(event.date, existing);
    }
    return map;
  }, [events]);

  const engagementsById = useMemo(() => {
    const map = new Map<string, ScheduleEngagement>();
    for (const engagement of engagements) {
      map.set(engagement.id, engagement);
    }
    return map;
  }, [engagements]);

  const weekRows = useMemo(
    () => buildWorkWeekMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const openScheduleForEngagement = (engagement: ScheduleEngagement) => {
    setScheduleEngagement(engagement);
    setIsScheduleOpen(true);
    setPickerDateKey(null);
    setPickerEngagements([]);
  };

  const handleDayClick = (dateKey: string) => {
    const dayEngagements = getEngagementsOnDate(dateKey, engagements, eventsByDate);
    if (dayEngagements.length === 0) return;

    if (dayEngagements.length === 1) {
      openScheduleForEngagement(dayEngagements[0]);
      return;
    }

    setPickerDateKey(dateKey);
    setPickerEngagements(dayEngagements);
  };

  const handleScheduleUpdated = (updated: ScheduleEngagement) => {
    setEngagements((prev) =>
      prev.map((engagement) => (engagement.id === updated.id ? { ...engagement, ...updated } : engagement)),
    );
    setScheduleEngagement(updated);
    router.refresh();
  };

  return (
    <>
      <div className="engagement-calendar">
        <div className="engagement-calendar__header">
          <div className="engagement-calendar__legend">
            {PHASES.map((phase) => (
              <span key={phase} className="engagement-calendar__legend-item">
                <span
                  className="engagement-calendar__legend-swatch"
                  style={{ backgroundColor: SCHEDULE_PHASE_COLORS[phase] }}
                />
                {phase}
              </span>
            ))}
          </div>
          <div className="engagement-calendar__nav">
            <Link
              href={prevHref}
              className="engagement-calendar__nav-btn"
              aria-label="Previous month"
              scroll={false}
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="engagement-calendar__month">{formatMonthYear(viewYear, viewMonth)}</span>
            <Link
              href={nextHref}
              className="engagement-calendar__nav-btn"
              aria-label="Next month"
              scroll={false}
            >
              <ChevronRight size={16} />
            </Link>
            <Link href={todayHref} className="btn-secondary engagement-calendar__today-btn" scroll={false}>
              Today
            </Link>
          </div>
        </div>

        <div className="engagement-calendar__weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="engagement-calendar__weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="engagement-calendar__weeks">
          {weekRows.map((row, rowIndex) => {
            const banners = buildBannerSegmentsForRow(row, engagements);
            const laneCount = banners.reduce((max, banner) => Math.max(max, banner.lane + 1), 0);

            return (
              <div key={`week-${rowIndex}`} className="engagement-calendar__week">
                {row.map((dateKey, colIndex) => {
                    if (!dateKey) {
                      return (
                        <div
                          key={`empty-${rowIndex}-${colIndex}`}
                          className="engagement-calendar__day engagement-calendar__day--empty"
                        />
                      );
                    }

                    const dayEngagements = getEngagementsOnDate(dateKey, engagements, eventsByDate);
                    const isToday = dateKey === todayKey;
                    const dayNumber = Number(dateKey.split('-')[2]);
                    const isInteractive = dayEngagements.length > 0;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={[
                          'engagement-calendar__day',
                          isToday ? 'engagement-calendar__day--today' : '',
                          isInteractive ? 'engagement-calendar__day--interactive' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-label={`${dateKey}, ${dayEngagements.length} scheduled engagements`}
                        disabled={!isInteractive}
                        onClick={() => handleDayClick(dateKey)}
                      >
                        <span className="engagement-calendar__day-number">{dayNumber}</span>
                      </button>
                    );
                  })}

                {laneCount > 0 ? (
                  <div
                    className="engagement-calendar__banner-layer"
                    style={{ gridTemplateRows: `repeat(${laneCount}, 1.35rem)` }}
                  >
                    {banners.map((banner) => (
                      <button
                        key={`${banner.engagementId}-${banner.phase}-${rowIndex}-${banner.gridColumnStart}-${banner.lane}`}
                        type="button"
                        className="engagement-calendar__banner"
                        style={{
                          gridColumn: `${banner.gridColumnStart} / ${banner.gridColumnEnd}`,
                          gridRow: banner.lane + 1,
                          backgroundColor: banner.color,
                        }}
                        title={banner.label}
                        onClick={() => {
                          const engagement = engagementsById.get(banner.engagementId);
                          if (engagement) openScheduleForEngagement(engagement);
                        }}
                      >
                        {banner.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {pickerDateKey ? (
        <Modal
          isOpen
          onClose={() => {
            setPickerDateKey(null);
            setPickerEngagements([]);
          }}
          title="Select Engagement"
          maxWidth="420px"
          zIndex={1100}
        >
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {formatPickerDate(pickerDateKey)} has multiple scheduled engagements.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pickerEngagements.map((engagement) => (
              <button
                key={engagement.id}
                type="button"
                className="btn-secondary"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => openScheduleForEngagement(engagement)}
              >
                {engagement.codeName}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      <EngagementScheduleModal
        engagement={scheduleEngagement}
        isAdmin={isAdmin}
        isOpen={isScheduleOpen}
        onClose={() => {
          setIsScheduleOpen(false);
          setScheduleEngagement(null);
        }}
        onUpdated={handleScheduleUpdated}
      />
    </>
  );
}