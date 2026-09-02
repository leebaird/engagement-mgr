export const APPLICATION_SETTING_ID = 1;

export const HIGHLIGHT_COLOR_OPTIONS = [
  { id: 'Pink', label: 'Pink', cssName: 'pink', color: '#ff3366' },
  { id: 'Blue', label: 'Blue', cssName: 'blue', color: '#3b82f6' },
  { id: 'Teal', label: 'Teal', cssName: 'teal', color: '#14b8a6' },
  { id: 'Green', label: 'Green', cssName: 'green', color: '#22c55e' },
  { id: 'Purple', label: 'Purple', cssName: 'purple', color: '#a855f7' },
  { id: 'Amber', label: 'Amber', cssName: 'amber', color: '#f59e0b' },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLOR_OPTIONS)[number]['id'];
export type HighlightColorCssName = (typeof HIGHLIGHT_COLOR_OPTIONS)[number]['cssName'];

export function isHighlightColor(value: unknown): value is HighlightColor {
  return HIGHLIGHT_COLOR_OPTIONS.some((option) => option.id === value);
}

export function highlightColorCssName(value: unknown): HighlightColorCssName {
  return HIGHLIGHT_COLOR_OPTIONS.find((option) => option.id === value)?.cssName ?? 'pink';
}
