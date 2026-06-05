import { prisma } from '@/lib/db';
import { FindingsClient } from './FindingsClient';

export default async function FindingsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['title', 'category', 'severity', 'createdAt', 'updatedAt'];
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

  return (
    <FindingsClient initialFindings={findings} sortCol={sortCol} sortDir={sortDir} />
  );
}