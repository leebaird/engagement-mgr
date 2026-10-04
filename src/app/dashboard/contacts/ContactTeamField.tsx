'use client';

import { useEffect, useRef } from 'react';
import { CONTACT_TEAMS, isCustomContactTeam } from '@/lib/contact-team';

export function ContactTeamField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editOther = useRef(false);
  const custom = isCustomContactTeam(value);

  useEffect(() => {
    if (!custom || !editOther.current) return;
    editOther.current = false;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [custom]);

  if (custom) {
    return (
      <input
        ref={inputRef}
        name="team"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      />
    );
  }

  return (
    <select
      name="team"
      value={value}
      className="form-input"
      onFocus={(event) => { try { event.currentTarget.showPicker?.(); } catch {} }}
      onChange={(event) => {
        if (event.target.value === 'Other') editOther.current = true;
        onChange(event.target.value);
      }}
    >
      <option value=""></option>
      {CONTACT_TEAMS.map((team) => <option key={team} value={team}>{team}</option>)}
    </select>
  );
}
