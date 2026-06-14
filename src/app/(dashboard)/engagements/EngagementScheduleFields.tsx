'use client';

import {
  engagementToScheduleValues,
  type EngagementScheduleValues,
} from '@/lib/date-input-value';

export type { EngagementScheduleValues };
export { engagementToScheduleValues };

const SCHEDULE_ROWS: {
  label: string;
  start: keyof EngagementScheduleValues;
  end?: keyof EngagementScheduleValues;
}[] = [
  { label: 'Prep', start: 'startPrep', end: 'endPrep' },
  { label: 'Recon', start: 'startRecon', end: 'endRecon' },
  { label: 'Testing', start: 'startTesting', end: 'endTesting' },
  { label: 'Reporting', start: 'startReporting', end: 'endReporting' },
  { label: 'Outbrief', start: 'outbrief' },
];

function formatScheduleDate(iso: string) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString();
}

type EngagementScheduleFieldsProps = {
  values: EngagementScheduleValues;
};

export function EngagementScheduleFields({ values }: EngagementScheduleFieldsProps) {
  return (
    <div className="engagement-schedule-grid">
      <div />
      <div className="engagement-schedule-grid__header">Start</div>
      <div className="engagement-schedule-grid__header">End</div>

      {SCHEDULE_ROWS.map((row) => (
        <div key={row.label} className="engagement-schedule-grid__row">
          <div className="engagement-schedule-grid__label">{row.label}</div>
          <input
            className="form-input"
            type="text"
            readOnly
            value={formatScheduleDate(values[row.start] ?? '')}
            style={{ pointerEvents: 'none' }}
          />
          {row.end ? (
            <input
              className="form-input"
              type="text"
              readOnly
              value={formatScheduleDate(values[row.end] ?? '')}
              style={{ pointerEvents: 'none' }}
            />
          ) : (
            <div />
          )}
        </div>
      ))}
    </div>
  );
}