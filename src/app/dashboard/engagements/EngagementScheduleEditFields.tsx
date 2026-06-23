import type { EngagementScheduleValues } from '@/lib/date-input-value';

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

const DATE_INPUT_STYLE = {
  colorScheme: 'dark' as const,
  paddingTop: '0.25rem',
  paddingBottom: '0.25rem',
};

function FilledScheduleDateInput({
  field,
  value,
}: {
  field: keyof EngagementScheduleValues;
  value: string;
}) {
  return (
    <input
      type="date"
      name={field}
      defaultValue={value}
      className="form-input"
      style={DATE_INPUT_STYLE}
    />
  );
}

function EmptyScheduleDateInput({
  field,
}: {
  field: keyof EngagementScheduleValues;
}) {
  return (
    <input
      type="date"
      name={field}
      className="form-input"
      style={DATE_INPUT_STYLE}
    />
  );
}

function ScheduleDateInput({
  field,
  value,
}: {
  field: keyof EngagementScheduleValues;
  value: string;
}) {
  if (value) {
    return <FilledScheduleDateInput field={field} value={value} />;
  }

  return <EmptyScheduleDateInput field={field} />;
}

export function EngagementScheduleEditFields({
  values,
}: {
  values: EngagementScheduleValues;
}) {
  return (
    <div className="engagement-schedule-grid">
      <div />
      <div className="engagement-schedule-grid__header">Start</div>
      <div className="engagement-schedule-grid__header">End</div>

      {SCHEDULE_ROWS.map((row) => (
        <div key={row.label} className="engagement-schedule-grid__row">
          <div className="engagement-schedule-grid__label">{row.label}</div>
          <ScheduleDateInput field={row.start} value={values[row.start] ?? ''} />
          {row.end ? (
            <ScheduleDateInput field={row.end} value={values[row.end] ?? ''} />
          ) : (
            <div />
          )}
        </div>
      ))}
    </div>
  );
}
