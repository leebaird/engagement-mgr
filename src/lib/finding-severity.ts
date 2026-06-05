export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info' | '';

export function getSeverityStyle(severity: string): {
  color: string;
  background: string;
} {
  switch (severity) {
    case 'Critical':
      return { color: '#b366ff', background: 'rgba(179,102,255,0.1)' };
    case 'High':
      return { color: '#ff4d4d', background: 'rgba(255,77,77,0.1)' };
    case 'Medium':
      return { color: '#ffa64d', background: 'rgba(255,166,77,0.1)' };
    case 'Low':
      return { color: '#4ade80', background: 'rgba(74,222,128,0.1)' };
    case 'Info':
      return { color: '#66b3ff', background: 'rgba(102,179,255,0.1)' };
    default:
      return { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' };
  }
}

export function countFindingsBySeverity(findings: { severity: string }[]) {
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, unset: 0 };
  for (const f of findings) {
    const key = f.severity as keyof typeof counts;
    if (key in counts && key !== 'unset') {
      counts[key]++;
    } else {
      counts.unset++;
    }
  }
  return { total: findings.length, ...counts };
}