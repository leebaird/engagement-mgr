export const CONTACT_TEAMS = [
  'Management',
  'Red Team',
  'Blue Team',
  'Infrastructure',
  'Trusted Agent',
  'Client',
  'Other',
] as const;

const PRESET_CONTACT_TEAMS = new Set<string>(
  CONTACT_TEAMS.filter((team) => team !== 'Other')
);

/** True when the team is a typed value, including the Other choice before it is edited. */
export function isCustomContactTeam(value: string): boolean {
  return value !== '' && !PRESET_CONTACT_TEAMS.has(value);
}
