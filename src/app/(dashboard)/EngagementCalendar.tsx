'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  extractScheduleEvents,
  formatScheduleEventLabel,
  getPhaseRangesForEngagement,
  isDateInPhaseRange,
  SCHEDULE_PHASE_COLORS,
  type EngagementScheduleSource,
  type ScheduleEvent,
  type SchedulePhase,
} from '@/lib/engagement-schedule-events';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const PHASES: SchedulePhase[] = ['Planning', 'Prep', 'Testing', 'Reporting', 'Outbrief'];
type EngagementCalendarProps = {
  engagements: EngagementScheduleSource[];
};

function toDateKeyFromParts(year: number, month: number, day: number): string {
  const monthPart = String(month + 1).padStart(2, '0');
  const dayPart = String(day).padStart(2, '0');
  return `${year}-${monthPart}-${dayPart}`;
}

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toDateKeyFromParts(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function EngagementCalendar({ engagements }: EngagementCalendarProps) {
  const today = new Date();
  const todayKey = toDateKeyFromParts(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

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

  const monthCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const getRangeStyles = (dateKey: string) => {
    const backgrounds: string[] = [];

    for (const engagement of engagements) {
      for (const range of getPhaseRangesForEngagement(engagement)) {
        if (!isDateInPhaseRange(dateKey, range.start, range.end)) continue;
        const color = SCHEDULE_PHASE_COLORS[range.phase];
        backgrounds.push(`linear-gradient(${color}22, ${color}22)`);
      }
    }

    if (backgrounds.length === 0) return undefined;
    return { background: backgrounds[backgrounds.length - 1] };
  };

  return (
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
          <button
            type="button"
            className="engagement-calendar__nav-btn"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="engagement-calendar__month">{formatMonthYear(viewYear, viewMonth)}</span>
          <button
            type="button"
            className="engagement-calendar__nav-btn"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
          <button type="button" className="btn-secondary engagement-calendar__today-btn" onClick={goToToday}>
            Today
          </button>
        </div>
      </div>

      <div className="engagement-calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="engagement-calendar__weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="engagement-calendar__grid">
        {monthCells.map((dateKey, index) => {
          if (!dateKey) {
            return <div key={`empty-${index}`} className="engagement-calendar__day engagement-calendar__day--empty" />;
          }

          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;
          const dayNumber = Number(dateKey.split('-')[2]);

          return (
            <div
              key={dateKey}
              className={[
                'engagement-calendar__day',
                isToday ? 'engagement-calendar__day--today' : '',
                dayEvents.length > 0 ? 'engagement-calendar__day--has-events' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={getRangeStyles(dateKey)}
              aria-label={`${dateKey}, ${dayEvents.length} schedule events`}
            >
              <span className="engagement-calendar__day-number">{dayNumber}</span>
              {dayEvents.length > 0 ? (
                <span className="engagement-calendar__markers">
                  {dayEvents.slice(0, 4).map((event) => (
                    <span
                      key={`${event.engagementId}-${event.phase}-${event.kind}`}
                      className="engagement-calendar__marker"
                      style={{ backgroundColor: SCHEDULE_PHASE_COLORS[event.phase] }}
                      title={formatScheduleEventLabel(event)}
                    />
                  ))}
                  {dayEvents.length > 4 ? (
                    <span className="engagement-calendar__marker-more">+{dayEvents.length - 4}</span>
                  ) : null}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}