import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { OperatorsClient } from './OperatorsClient';
import { OperatorDetailButton } from './OperatorDetailButton';
import { formatPhone } from '@/lib/format';

export default async function OperatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const listParams = { sort, dir };
  const addHref = isAdmin
    ? buildPathQuery('/operators', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/operators', listParams, { create: null });
  const listCloseHref = buildPathQuery('/operators', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

  const validSortColumns = ['name', 'title', 'email', 'phoneNumber'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const operatorsRaw = await prisma.operator.findMany();

  let operators: typeof operatorsRaw;

  if (sortCol === 'title') {
    const titleOrder = [
      'Director',
      'Red Team Lead',
      'Senior Red Team Operator',
      'Red Team Operator',
      'Junior Red Team Operator',
      'Intern',
    ];

    const titleRank = new Map(
      titleOrder.map((title, index) => [title.toLowerCase(), index])
    );

    operators = [...operatorsRaw].sort((a, b) => {
      const rankA = titleRank.get((a.title || '').toLowerCase()) ?? 999;
      const rankB = titleRank.get((b.title || '').toLowerCase()) ?? 999;
      return sortDir === 'asc' ? rankA - rankB : rankB - rankA;
    });
  } else {
    operators = await prisma.operator.findMany({
      orderBy: { [sortCol]: sortDir },
    });
  }

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

  const detailOperator = detail ? operators.find((operator) => operator.id === detail) : undefined;
  const detailHrefs = detailOperator ? buildDetailHrefs('/operators', listParams, detailOperator.id) : null;

  return (
    <>
      {detailOperator ? (
        <OperatorDetailButton
          operator={detailOperator}
          isAdmin={isAdmin}
          isDetailOpen
          isEditing={edit === '1'}
          showDeleteConfirm={deleteConfirm === '1'}
          showLink={false}
          detailHref={detailHrefs!.view}
          editHref={detailHrefs!.edit}
          deleteConfirmHref={detailHrefs!.deleteConfirm}
          viewHref={detailHrefs!.view}
          closeHref={listCloseHref}
          deleteError={deleteError}
          saveError={saveError}
          sort={sort}
          dir={dir}
        />
      ) : null}
      <OperatorsClient
        isAdmin={isAdmin}
        addHref={addHref}
        showCreateModal={isAdmin && create === '1'}
        createCloseHref={createCloseHref}
      >
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '170px' }}>
                <Link href={getSortHref('name')} style={{ color: 'inherit', textDecoration: 'none' }}>Name{getSortIcon('name')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '170px' }}>
                <Link href={getSortHref('title')} style={{ color: 'inherit', textDecoration: 'none' }}>Title{getSortIcon('title')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '180px' }}>
                <Link href={getSortHref('email')} style={{ color: 'inherit', textDecoration: 'none' }}>Email{getSortIcon('email')}</Link>
              </th>
              <th style={{ padding: '0.75rem 0.75rem 0.75rem 3rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('phoneNumber')} style={{ color: 'inherit', textDecoration: 'none' }}>Phone{getSortIcon('phoneNumber')}</Link>
              </th>

              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {operators.map(op => (
              <tr key={op.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500, width: '170px' }}>{op.name}</td>
                <td style={{ padding: '0.75rem', width: '170px' }}>{op.title || ''}</td>
                <td style={{ padding: '0.75rem' }}>{op.email || ''}</td>
                <td style={{ padding: '0.75rem 0.75rem 0.75rem 3rem' }}>{formatPhone(op.phoneNumber)}</td>

                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/operators', listParams, { detail: op.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </OperatorsClient>
    </>
  );
}
