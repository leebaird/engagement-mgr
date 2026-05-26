import { prisma } from '@/lib/db';
import Link from 'next/link';
import { OperatorsClient } from './OperatorsClient';
import { OperatorDetailButton } from './OperatorDetailButton';

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['name', 'title', 'email', 'phoneNumber', 'github'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const operators = await prisma.operator.findMany({ 
    orderBy: { [sortCol]: sortDir } 
  });

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/operators?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/operators?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <OperatorsClient>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '120px' }}>
                <Link href={getSortHref('name')} style={{ color: 'inherit', textDecoration: 'none' }}>Name{getSortIcon('name')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '170px' }}>
                <Link href={getSortHref('title')} style={{ color: 'inherit', textDecoration: 'none' }}>Title{getSortIcon('title')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '180px' }}>
                <Link href={getSortHref('email')} style={{ color: 'inherit', textDecoration: 'none' }}>Email{getSortIcon('email')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('phoneNumber')} style={{ color: 'inherit', textDecoration: 'none' }}>Phone{getSortIcon('phoneNumber')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('github')} style={{ color: 'inherit', textDecoration: 'none' }}>GitHub{getSortIcon('github')}</Link>
              </th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {operators.map(op => (
              <tr key={op.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{op.name}</td>
                <td style={{ padding: '0.75rem' }}>{op.title || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{op.email || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{op.phoneNumber || '-'}</td>
                <td style={{ padding: '0.75rem' }}>{op.github || '-'}</td>
                <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <OperatorDetailButton operator={op} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OperatorsClient>
  );
}
