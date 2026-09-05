import { z } from 'zod';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import { findingContentSchema } from '@/lib/reporting';
import { buildPathQuery } from '@/lib/list-view-params';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { getSeverityStyle } from '@/lib/finding-severity';
import { TemplatesClient } from './TemplatesClient';

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    severity?: string;
    category?: string;
    detail?: string;
    create?: string;
    error?: string;
    pending?: string;
    proposed?: string;
  }>;
}) {
  const actor = await requireDashboardSession();
  const params = await searchParams;
  const isAdmin = actor.role === 'Admin';
  const showPending = isAdmin && params.pending === '1';
  const listParams = {
    q: params.q,
    severity: params.severity,
    category: params.category,
    pending: params.pending,
  };

  const templates = await prisma.findingTemplate.findMany({
    where: {
      approved: showPending ? false : true,
      title: { contains: (params.q ?? '').slice(0, 200), mode: 'insensitive' },
      ...(params.severity ? { severity: params.severity.slice(0, 20) } : {}),
      ...(params.category
        ? {
            category: {
              contains: params.category.slice(0, 200),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    },
    orderBy: { title: 'asc' },
    take: 100,
  });

  const detail =
    params.detail && z.uuid().safeParse(params.detail).success
      ? await prisma.findingTemplate.findFirst({
          where: {
            id: params.detail,
            ...(isAdmin ? {} : { approved: true }),
          },
        })
      : null;
  const detailContent = detail ? findingContentSchema.parse(detail.content) : null;
  const engagements = detail?.approved
    ? await prisma.engagement.findMany({
        select: { id: true, codeName: true },
        orderBy: { codeName: 'asc' },
      })
    : [];

  const addHref = buildPathQuery('/dashboard/templates', listParams, {
    create: '1',
    detail: null,
  });
  const createCloseHref = buildPathQuery('/dashboard/templates', listParams, {
    create: null,
  });
  const detailCloseHref = buildPathQuery('/dashboard/templates', listParams, {
    detail: null,
  });
  const approvedTabHref = buildPathQuery('/dashboard/templates', listParams, {
    pending: null,
    detail: null,
    create: null,
  });
  const pendingTabHref = buildPathQuery('/dashboard/templates', listParams, {
    pending: '1',
    detail: null,
    create: null,
  });

  return (
    <TemplatesClient
      isAdmin={isAdmin}
      addHref={addHref}
      showCreateModal={params.create === '1' && !detailContent}
      createCloseHref={createCloseHref}
      detail={
        detail && detailContent
          ? {
              id: detail.id,
              version: detail.version,
              approved: detail.approved,
              content: detailContent,
            }
          : null
      }
      detailCloseHref={detailCloseHref}
      engagements={engagements}
    >
      {isAdmin && (
        <nav className="detail-tabs" aria-label="Template sections">
          <Link
            href={approvedTabHref}
            className={showPending ? 'detail-tab' : 'detail-tab detail-tab--active'}
          >
            Approved
          </Link>
          <Link
            href={pendingTabHref}
            className={showPending ? 'detail-tab detail-tab--active' : 'detail-tab'}
          >
            Pending approval
          </Link>
        </nav>
      )}

      {params.error && (
        <p role="alert" className="text-error">
          The template could not be saved or used. Check your permissions and
          reload before retrying.
        </p>
      )}
      {params.proposed && (
        <p role="status">
          Template proposal saved. An administrator must approve it before it
          appears in the library.
        </p>
      )}

      <form method="get" className="writing-toolbar">
        <input
          className="form-input"
          name="q"
          placeholder="Search title"
          defaultValue={params.q}
          maxLength={200}
        />
        <input
          className="form-input"
          name="category"
          placeholder="Category"
          defaultValue={params.category}
          maxLength={200}
        />
        <select
          className="form-input"
          name="severity"
          defaultValue={params.severity ?? ''}
        >
          <option value="">All severities</option>
          {['Critical', 'High', 'Medium', 'Low', 'Info'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {params.pending === '1' && (
          <input type="hidden" name="pending" value="1" />
        )}
        <button className="btn-secondary">Search</button>
      </form>

      <div className="glass-panel glass-panel--padded">
        {templates.length === 0 ? (
          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '1rem 0',
            }}
          >
            {showPending ? (
              'No templates awaiting approval.'
            ) : (
              <>
                No templates yet. Click{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  Propose Template
                </strong>{' '}
                to add one.
              </>
            )}
          </p>
        ) : (
          <table className="data-table">
            <colgroup>
              <col />
              <col style={{ width: '200px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '52px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Severity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={t.category || ''}
                  >
                    {t.category || ''}
                  </td>
                  <td>
                    {t.severity ? (
                      <span className="badge" style={getSeverityStyle(t.severity)}>
                        {t.severity}
                      </span>
                    ) : null}
                  </td>
                  <td className="table-action-cell">
                    <DetailEyeLink
                      href={buildPathQuery('/dashboard/templates', listParams, {
                        detail: t.id,
                        create: null,
                      })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {templates.length === 100 && (
          <p style={{ margin: '0.75rem 0 0', color: 'var(--text-muted)' }}>
            Showing up to 100 matches. Refine your search to narrow results.
          </p>
        )}
      </div>
    </TemplatesClient>
  );
}
