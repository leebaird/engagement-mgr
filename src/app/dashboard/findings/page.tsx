import { prisma } from '@/lib/db';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { DisplayDate } from '@/components/DateFormatProvider';
import { getSeverityStyle } from '@/lib/finding-severity';
import { FindingsClient } from './FindingsClient';
import { FindingDetailButton } from './FindingDetailButton';
import { requireDashboardSession } from '@/lib/require-auth';

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
}) {
  await requireDashboardSession();
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const listParams = { sort, dir };
  const currentParams = { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError };
  const addHref = buildPathQuery('/dashboard/findings', listParams, { create: '1', detail: null });
  const createCloseHref = buildPathQuery('/dashboard/findings', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/findings', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

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

  // Lean list columns — omit large text blobs (background, remediation, etc.)
  const findings = await prisma.finding.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      severity: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: sortCol === 'severity' ? undefined : { [sortCol]: sortDir },
  });

  if (sortCol === 'severity') {
    findings.sort((a, b) => {
      const valA = severityOrder[a.severity] || 99;
      const valB = severityOrder[b.severity] || 99;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }

  const sortHrefs = buildSortHrefs('/dashboard/findings', currentParams, sortCol, sortDir);

  const rawDetail = detail
    ? await prisma.finding.findUnique({
        where: { id: detail },
        include: {
          engagementContext: true,
        },
      })
    : null;

  const detailFinding = rawDetail
    ? {
        id: rawDetail.id,
        title: rawDetail.title,
        category: rawDetail.category,
        severity: rawDetail.severity,
        background: rawDetail.background,
        remediation: rawDetail.remediation,
        supportingLinks: rawDetail.supportingData,
        observation: rawDetail.engagementContext?.observation ?? null,
        affectedHosts: rawDetail.engagementContext?.affectedHosts ?? null,
        createdAt: rawDetail.createdAt,
        updatedAt: rawDetail.updatedAt,
      }
    : undefined;

  const detailHrefs = detailFinding
    ? buildDetailHrefs('/dashboard/findings', listParams, detailFinding.id)
    : null;

  return (
    <>
      {detailFinding && detailHrefs ? (
        <FindingDetailButton
          finding={detailFinding}
          isDetailOpen
          isEditing={edit === '1'}
          showDeleteConfirm={deleteConfirm === '1'}
          showLink={false}
          detailHref={detailHrefs.view}
          editHref={detailHrefs.edit}
          deleteConfirmHref={detailHrefs.deleteConfirm}
          viewHref={detailHrefs.view}
          closeHref={listCloseHref}
          deleteError={deleteError}
          saveError={saveError}
          sort={sort}
          dir={dir}
        />
      ) : null}
      <FindingsClient
        addHref={addHref}
        showCreateModal={create === '1'}
        createCloseHref={createCloseHref}
        sort={sort}
        dir={dir}
      >
        <div className="glass-panel glass-panel--padded">
          {findings.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              No findings yet. Click <strong style={{ color: 'var(--text-main)' }}>New Finding</strong> to add one.
            </p>
          ) : (
          <table className="data-table">
            <colgroup>
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '52px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <Link href={sortHrefs.href('title')} className="sort-link">
                    Title{sortHrefs.icon('title')}
                  </Link>
                </th>
                <th>
                  <Link href={sortHrefs.href('category')} className="sort-link">
                    Category{sortHrefs.icon('category')}
                  </Link>
                </th>
                <th>
                  <Link href={sortHrefs.href('severity')} className="sort-link">
                    Severity{sortHrefs.icon('severity')}
                  </Link>
                </th>
                <th>
                  <Link href={sortHrefs.href('createdAt')} className="sort-link">
                    Created{sortHrefs.icon('createdAt')}
                  </Link>
                </th>
                <th>
                  <Link href={sortHrefs.href('updatedAt')} className="sort-link">
                    Updated{sortHrefs.icon('updatedAt')}
                  </Link>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr key={finding.id}>
                  <td style={{ fontWeight: 500 }}>{finding.title}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={finding.category || ''}>
                    {finding.category || ''}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={finding.severity || undefined}>
                    {finding.severity ? (
                      <span className="badge" style={getSeverityStyle(finding.severity)}>
                        {finding.severity}
                      </span>
                    ) : null}
                  </td>
                  <td className="cell-numeric" style={{ color: 'var(--text-muted)' }}><DisplayDate value={finding.createdAt} /></td>
                  <td className="cell-numeric" style={{ color: 'var(--text-muted)' }}><DisplayDate value={finding.updatedAt} /></td>
                  <td className="table-action-cell">
                    <DetailEyeLink href={buildPathQuery('/dashboard/findings', listParams, { detail: finding.id, create: null })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </FindingsClient>
    </>
  );
}
