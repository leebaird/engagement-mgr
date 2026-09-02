'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DATE_FORMAT_OPTIONS,
  DATE_FORMAT_STORAGE_KEY,
  TIME_ZONE_OPTIONS,
  TIME_ZONE_STORAGE_KEY,
  formatDate,
  formatDateTime,
  parseDateFormatId,
  parseTimeZoneId,
  type DateFormatId,
  type TimeZoneId,
} from '@/lib/date-format';

type DateTimePreferencesContextValue = {
  dateFormat: DateFormatId;
  timeZone: TimeZoneId;
  operatingSystemTimeZone: string;
  ready: boolean;
  setDateFormat: (dateFormat: DateFormatId) => void;
  setTimeZone: (timeZone: TimeZoneId) => void;
};

const DateTimePreferencesContext = createContext<DateTimePreferencesContextValue>({
  dateFormat: 'os',
  timeZone: 'os',
  operatingSystemTimeZone: '',
  ready: false,
  setDateFormat: () => {},
  setTimeZone: () => {},
});

export function DateTimePreferencesProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormatState] = useState<DateFormatId>('os');
  const [timeZone, setTimeZoneState] = useState<TimeZoneId>('os');
  const [operatingSystemTimeZone, setOperatingSystemTimeZone] = useState('');
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    try {
      setDateFormatState(parseDateFormatId(window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY)));
      setTimeZoneState(parseTimeZoneId(window.localStorage.getItem(TIME_ZONE_STORAGE_KEY)));
      setOperatingSystemTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setDateFormatState('os');
      setTimeZoneState('os');
    }
    setReady(true);
  }, []);

  const setDateFormat = useCallback((next: DateFormatId) => {
    setDateFormatState(next);
    try {
      window.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies this session.
    }
  }, []);

  const setTimeZone = useCallback((next: TimeZoneId) => {
    setTimeZoneState(next);
    try {
      window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies this session.
    }
  }, []);

  const value = useMemo(
    () => ({
      dateFormat,
      timeZone,
      operatingSystemTimeZone,
      ready,
      setDateFormat,
      setTimeZone,
    }),
    [dateFormat, timeZone, operatingSystemTimeZone, ready, setDateFormat, setTimeZone],
  );

  return (
    <DateTimePreferencesContext.Provider value={value}>
      {children}
    </DateTimePreferencesContext.Provider>
  );
}

export function useDateTimePreferences() {
  return useContext(DateTimePreferencesContext);
}

export function DisplayDate({
  value,
  includeTime = false,
  dateOnly = false,
}: {
  value: string | Date | null | undefined;
  includeTime?: boolean;
  dateOnly?: boolean;
}) {
  const { dateFormat, timeZone, ready } = useDateTimePreferences();
  if (value == null || value === '') return null;
  const text = ready
    ? (includeTime
        ? formatDateTime(value, dateFormat, timeZone)
        : formatDate(value, dateFormat, dateOnly, timeZone))
    : formatDate(value, 'ymd', dateOnly);
  return <span className="display-date">{text}</span>;
}

export function DateTimePreferencesControls() {
  const {
    dateFormat,
    timeZone,
    operatingSystemTimeZone,
    setDateFormat,
    setTimeZone,
  } = useDateTimePreferences();

  return (
    <div className="date-time-preferences">
      <label className="date-time-preference">
        <span className="date-time-preference__label">Date format</span>
        <select
          className="form-input date-time-preference__control"
          value={dateFormat}
          onChange={(event) => setDateFormat(parseDateFormatId(event.target.value))}
          aria-label="Date format"
        >
          {DATE_FORMAT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="date-time-preference">
        <span className="date-time-preference__label">Time zone</span>
        <select
          className="form-input date-time-preference__control"
          value={timeZone}
          onChange={(event) => setTimeZone(parseTimeZoneId(event.target.value))}
          aria-label="Time zone"
        >
          {TIME_ZONE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id === 'os' && operatingSystemTimeZone
                ? `${option.label} (${operatingSystemTimeZone})`
                : option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
