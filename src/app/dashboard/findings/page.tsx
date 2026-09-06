import { prisma } from '@/lib/db';
import Link from 'next/link';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { DisplayDate } from '@/components/DateTimePreferencesProvider';
import { getSeverityStyle } from '@/lib/finding-severity';
import { FindingsClient } from './FindingsClient';
import { FindingDetailButton } from './FindingDetailButton';
import { requireDashboardSession } from '@/lib/require-auth';
import { Prisma } from '@prisma/client';
import { parseListPage } from '@/lib/list-view-params';

const PAGE_SIZE = 100;

type FindingListItem = {
  id: string;
  title: string;
  category: string | null;
  severity: string;
  createdAt: Date;
  updatedAt: Date;
};

export default async function FindingsPage({
  searchParams,
}: {
    searchParams: Promise<{ sort?: string; dir?: string; page?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
  }) {
  await requireDashboardSession();
  const { sort, dir, page: pageParam, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const page = parseListPage(pageParam);
  const listParams = { sort, dir, page: page === 1 ? undefined : String(page) };
  const currentParams = { ...listParams, create, detail, edit, delete: deleteConfirm, deleteError, saveError };
  const addHref = buildPathQuery('/dashboard/findings', listParams, { create: '1', detail: null });
  const createCloseHref = buildPathQuery('/dashboard/findings', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/findings', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });

  const validSortColumns = ['title', 'category', 'severity', 'createdAt', 'updatedAt'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'title';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const offset = (page - 1) * PAGE_SIZE;
  const findingsWithSentinel: FindingListItem[] = sortCol === 'severity'
    ? await prisma.$queryRaw(Prisma.sql`
        SELECT "id", "title", "category", "severity", "createdAt", "updatedAt"
        FROM "Finding"
        ORDER BY CASE "severity"
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          WHEN 'Info' THEN 5
          ELSE 99
        END ${sortDir === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}, "id" ASC
        LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}
      `)
    : await prisma.finding.findMany({
        select: {
          id: true,
          title: true,
          category: true,
          severity: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ [sortCol]: sortDir }, { id: 'asc' }],
        skip: offset,
        take: PAGE_SIZE + 1,
      });
  const hasNextPage = findingsWithSentinel.length > PAGE_SIZE;
  const findings = findingsWithSentinel.slice(0, PAGE_SIZE);

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
        version: rawDetail.version,
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
          key={`${detailFinding.id}-${detailFinding.version}`}
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
          <nav className="writing-toolbar" aria-label="Findings pages">
            {page > 1 ? (
              <Link className="btn-secondary" href={buildPathQuery('/dashboard/findings', currentParams, { page: page === 2 ? null : String(page - 1) })}>
                Previous
              </Link>
            ) : null}
            <span>Page {page}</span>
            {hasNextPage ? (
              <Link className="btn-secondary" href={buildPathQuery('/dashboard/findings', currentParams, { page: String(page + 1) })}>
                Next
              </Link>
            ) : null}
          </nav>
        </div>
      </FindingsClient>
    </>
  );
}
