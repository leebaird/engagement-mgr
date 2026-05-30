import { prisma } from '@/lib/db';
import Link from 'next/link';
import { FindingsClient } from './FindingsClient';
import { FindingDetailButton } from './FindingDetailButton';

export default async function FindingsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['title', 'severity', 'createdAt', 'updatedAt'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'title';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const severityOrder: Record<string, number> = {
    'Critical': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
    'Info': 5
  };

  let findings = await prisma.finding.findMany({ 
    orderBy: sortCol === 'severity' ? undefined : { [sortCol]: sortDir } 
  });

  if (sortCol === 'severity') {
    findings.sort((a, b) => {
      const valA = severityOrder[a.severity] || 99;
      const valB = severityOrder[b.severity] || 99;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/findings?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/findings?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical': return { color: '#b366ff', background: 'rgba(179,102,255,0.1)' };
      case 'High': return { color: '#ff4d4d', background: 'rgba(255,77,77,0.1)' };
      case 'Medium': return { color: '#ffa64d', background: 'rgba(255,166,77,0.1)' };
      case 'Low': return { color: '#4ade80', background: 'rgba(74,222,128,0.1)' };
      case 'Info': return { color: '#66b3ff', background: 'rgba(102,179,255,0.1)' };
      default: return { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' };
    }
  };

  return (
    <FindingsClient>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                <Link href={getSortHref('title')} style={{ color: 'inherit', textDecoration: 'none' }}>Title{getSortIcon('title')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '120px' }}>
                <Link href={getSortHref('severity')} style={{ color: 'inherit', textDecoration: 'none' }}>Severity{getSortIcon('severity')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '150px' }}>
                <Link href={getSortHref('createdAt')} style={{ color: 'inherit', textDecoration: 'none' }}>Created{getSortIcon('createdAt')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '150px' }}>
                <Link href={getSortHref('updatedAt')} style={{ color: 'inherit', textDecoration: 'none' }}>Updated{getSortIcon('updatedAt')}</Link>
              </th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {findings.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{f.title}</td>
                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.severity}>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    ...getSeverityStyle(f.severity)
                  }}>
                    {f.severity}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{f.createdAt.toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{f.updatedAt.toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <FindingDetailButton finding={f} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FindingsClient>
  );
}
