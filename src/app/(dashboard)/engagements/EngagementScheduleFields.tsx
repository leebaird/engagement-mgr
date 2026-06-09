'use client';

export type EngagementScheduleValues = {
  startPrep: string;
  endPrep: string;
  startRecon: string;
  endRecon: string;
  startTesting: string;
  endTesting: string;
  startReporting: string;
  endReporting: string;
  outbrief: string;
};

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

export function engagementToScheduleValues(engagement: {
  startPrep?: string | Date | null;
  endPrep?: string | Date | null;
  startRecon?: string | Date | null;
  endRecon?: string | Date | null;
  startTesting?: string | Date | null;
  endTesting?: string | Date | null;
  startReporting?: string | Date | null;
  endReporting?: string | Date | null;
  outbrief?: string | Date | null;
}): EngagementScheduleValues {
  const toDate = (d: string | Date | null | undefined) =>
    d ? new Date(d).toISOString().split('T')[0] : '';

  return {
    startPrep: toDate(engagement.startPrep),
    endPrep: toDate(engagement.endPrep),
    startRecon: toDate(engagement.startRecon),
    endRecon: toDate(engagement.endRecon),
    startTesting: toDate(engagement.startTesting),
    endTesting: toDate(engagement.endTesting),
    startReporting: toDate(engagement.startReporting),
    endReporting: toDate(engagement.endReporting),
    outbrief: toDate(engagement.outbrief),
  };
}

function formatScheduleDate(iso: string) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString();
}

type EngagementScheduleFieldsProps = {
  values: EngagementScheduleValues;
  readOnly?: boolean;
  onFieldChange?: (field: keyof EngagementScheduleValues, value: string) => void;
};

export function EngagementScheduleFields({
  values,
  readOnly = false,
  onFieldChange,
}: EngagementScheduleFieldsProps) {
  const dateStyle = {
    colorScheme: 'dark' as const,
    paddingTop: '0.25rem',
    paddingBottom: '0.25rem',
  };

  const dateInputProps = (field: keyof EngagementScheduleValues) => {
    if (readOnly) {
      return {
        type: 'text' as const,
        readOnly: true as const,
        value: formatScheduleDate(values[field]),
        style: { pointerEvents: 'none' as const },
      };
    }
    return {
      type: 'date' as const,
      name: field,
      value: values[field],
      style: dateStyle,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        onFieldChange?.(field, e.target.value),
    };
  };

  return (
    <div className="engagement-schedule-grid">
      <div />
      <div className="engagement-schedule-grid__header">Start</div>
      <div className="engagement-schedule-grid__header">End</div>

      {SCHEDULE_ROWS.map((row) => (
        <div key={row.label} className="engagement-schedule-grid__row">
          <div className="engagement-schedule-grid__label">{row.label}</div>
          <input className="form-input" {...dateInputProps(row.start)} />
          {row.end ? (
            <input className="form-input" {...dateInputProps(row.end)} />
          ) : (
            <div />
          )}
        </div>
      ))}
    </div>
  );
}