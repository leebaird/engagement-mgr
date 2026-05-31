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
    <FindingsClient initialFindings={findings} />
  );
}
