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
  formatDate,
  formatDateTime,
  parseDateTimeFormatId,
  type DateTimeFormatId,
} from '@/lib/date-format';

type DateFormatContextValue = {
  format: DateTimeFormatId;
  ready: boolean;
  setFormat: (format: DateTimeFormatId) => void;
};

const DateFormatContext = createContext<DateFormatContextValue>({
  format: 'os',
  ready: false,
  setFormat: () => {},
});

export function DateFormatProvider({ children }: { children: ReactNode }) {
  const [format, setFormatState] = useState<DateTimeFormatId>('os');
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    try {
      setFormatState(parseDateTimeFormatId(window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY)));
    } catch {
      setFormatState('os');
    }
    setReady(true);
  }, []);

  const setFormat = useCallback((next: DateTimeFormatId) => {
    setFormatState(next);
    try {
      window.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, next);
    } catch {
      // Ignore quota / private-mode failures; the choice still applies this session.
    }
  }, []);

  const value = useMemo(() => ({ format, ready, setFormat }), [format, ready, setFormat]);

  return <DateFormatContext.Provider value={value}>{children}</DateFormatContext.Provider>;
}

export function useDateFormat() {
  return useContext(DateFormatContext);
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
  const { format, ready } = useDateFormat();
  if (value == null || value === '') return null;
  const text = ready
    ? (includeTime ? formatDateTime(value, format) : formatDate(value, format, dateOnly))
    : formatDate(value, 'ymd', dateOnly);
  return <span className="display-date">{text}</span>;
}

export function DateFormatSelect() {
  const { format, setFormat } = useDateFormat();

  return (
    <label className="date-format-select">
      <span className="date-format-select__label">Date &amp; time</span>
      <select
        className="form-input date-format-select__control"
        value={format}
        onChange={(event) => setFormat(parseDateTimeFormatId(event.target.value))}
        aria-label="Date and time format"
      >
        {DATE_FORMAT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
