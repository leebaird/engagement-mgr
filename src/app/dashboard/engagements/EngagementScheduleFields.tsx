'use client';

import {
  engagementToScheduleValues,
  type EngagementScheduleValues,
} from '@/lib/date-input-value';
import { formatDate } from '@/lib/date-format';
import { useDateFormat } from '@/components/DateFormatProvider';

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

type EngagementScheduleFieldsProps = {
  values: EngagementScheduleValues;
};

export function EngagementScheduleFields({ values }: EngagementScheduleFieldsProps) {
  const { format, ready } = useDateFormat();
  const formatValue = (iso: string) => {
    if (!iso) return '';
    return formatDate(iso, ready ? format : 'ymd');
  };

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
            value={formatValue(values[row.start] ?? '')}
            style={{ pointerEvents: 'none' }}
          />
          {row.end ? (
            <input
              className="form-input"
              type="text"
              readOnly
              value={formatValue(values[row.end] ?? '')}
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