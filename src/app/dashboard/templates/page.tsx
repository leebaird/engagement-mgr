import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import { saveTemplate, useTemplate } from '@/app/actions/templates';
import { findingContentSchema, contentFields } from '@/lib/reporting';
import { FindingMarkdown } from '@/components/FindingMarkdown';

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
  const templates = await prisma.findingTemplate.findMany({
    where: {
      approved: actor.role === 'Admin' && params.pending === '1' ? false : true,
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
            ...(actor.role !== 'Admin' ? { approved: true } : {}),
          },
        })
      : null;
  const content = detail ? findingContentSchema.parse(detail.content) : null;
  const engagements = detail?.approved
    ? await prisma.engagement.findMany({
        select: { id: true, codeName: true },
        orderBy: { codeName: 'asc' },
      })
    : [];
  const editable = params.create === '1' || (detail && actor.role === 'Admin');
  return (
    <div className="page-container">
      <h1>Finding templates</h1>
      <p>
        Approved reusable wording. Each use creates an independent finding with
        empty observations, hosts and evidence.
      </p>
      <div className="writing-toolbar">
        <a href="/dashboard/templates?create=1">Propose a template</a>
        <a href="/dashboard/templates">Approved templates</a>
        {actor.role === 'Admin' && (
          <a href="/dashboard/templates?pending=1">Pending approval</a>
        )}
      </div>
      {params.error && (
        <p role="alert">
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
      <div className="writing-layout">
        <section className="glass-panel glass-panel--padded">
          <p>Showing up to 100 matches.</p>
          {templates.map((t) => (
            <p key={t.id}>
              <a href={`/dashboard/templates?detail=${t.id}`}>{t.title}</a> ·{' '}
              {t.severity} · {t.category}
            </p>
          ))}
        </section>
        <section className="glass-panel glass-panel--padded">
          {detail && (
            <>
              <h2>{detail.title}</h2>
              <p>
                Version {detail.version} ·{' '}
                {detail.approved ? 'Approved' : 'Pending approval'}
              </p>
              {content && <FindingMarkdown text={content.background} />}
              {detail.approved && (
                <form action={useTemplate}>
                  <input name="templateId" type="hidden" value={detail.id} />
                  <label className="form-label">
                    Add to engagement
                    <select name="engagementId" className="form-input" required>
                      <option value="">Choose engagement</option>
                      {engagements.map((e) => (
                        <option value={e.id} key={e.id}>
                          {e.codeName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn-primary">
                    Create finding from template
                  </button>
                </form>
              )}
            </>
          )}
          {editable && (
            <form action={saveTemplate} className="writing-form">
              {detail && (
                <>
                  <input name="id" type="hidden" value={detail.id} />
                  <input name="version" type="hidden" value={detail.version} />
                </>
              )}
              {contentFields
                .filter((k) => !['observation', 'affectedHosts'].includes(k))
                .map((k) => (
                  <label className="form-label" key={k}>
                    {k}
                    {k === 'severity' ? (
                      <select
                        name={k}
                        className="form-input"
                        defaultValue={content?.severity ?? ''}
                      >
                        <option value="">Unrated</option>
                        {['Critical', 'High', 'Medium', 'Low', 'Info'].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          )
                        )}
                      </select>
                    ) : (
                      <textarea
                        name={k}
                        className="form-input"
                        rows={['title', 'category'].includes(k) ? 1 : 5}
                        required={k === 'title'}
                        maxLength={
                          k === 'title' ? 500 : k === 'category' ? 200 : 10000
                        }
                        defaultValue={content?.[k] ?? ''}
                      />
                    )}
                  </label>
                ))}
              {actor.role === 'Admin' && (
                <label>
                  <input type="checkbox" name="approved" /> I have reviewed this
                  wording and approve this version
                </label>
              )}
              <button className="btn-primary">Save template</button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
