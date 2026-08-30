import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { OperatorsClient } from './OperatorsClient';
import { OperatorDetailButton } from './OperatorDetailButton';
import { formatPhone } from '@/lib/format';
import { sortOperatorsByTitle } from '@/lib/operator-title-sort';

export default async function OperatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const listParams = { sort, dir };
  const currentParams = { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError };
  const addHref = isAdmin
    ? buildPathQuery('/dashboard/operators', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/dashboard/operators', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/operators', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

  const validSortColumns = ['name', 'title', 'email', 'phoneNumber'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  // Single query (title sort finishes in memory)
  const operatorsRaw = await prisma.operator.findMany(
    sortCol === 'title' ? undefined : { orderBy: { [sortCol]: sortDir } }
  );
  const operators =
    sortCol === 'title' ? sortOperatorsByTitle(operatorsRaw, sortDir) : operatorsRaw;

  const sortHrefs = buildSortHrefs('/dashboard/operators', currentParams, sortCol, sortDir);

  const detailOperator = detail ? operators.find((operator) => operator.id === detail) : undefined;
  const detailHrefs = detailOperator ? buildDetailHrefs('/dashboard/operators', listParams, detailOperator.id) : null;

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
      <div className="glass-panel glass-panel--padded">
        {operators.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            {isAdmin ? (
              <>No operators yet. Click <strong style={{ color: 'var(--text-main)' }}>New Operator</strong> to add one.</>
            ) : (
              'No operators yet.'
            )}
          </p>
        ) : (
        <table className="data-table">
          <colgroup>
            <col style={{ width: '170px' }} />
            <col style={{ width: '170px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <Link href={sortHrefs.href('name')} className="sort-link">Name{sortHrefs.icon('name')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('title')} className="sort-link">Title{sortHrefs.icon('title')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('email')} className="sort-link">Email{sortHrefs.icon('email')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('phoneNumber')} className="sort-link">Phone{sortHrefs.icon('phoneNumber')}</Link>
              </th>

              <th></th>
            </tr>
          </thead>
          <tbody>
            {operators.map(op => (
              <tr key={op.id}>
                <td style={{ fontWeight: 500 }}>{op.name}</td>
                <td>{op.title || ''}</td>
                <td>{op.email || ''}</td>
                <td className="cell-numeric">{formatPhone(op.phoneNumber)}</td>

                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/dashboard/operators', listParams, { detail: op.id, create: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      </OperatorsClient>
    </>
  );
}
