import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import { saveReport, issueReport } from '@/app/actions/reports';
import { findingContent, readinessIssues } from '@/lib/reporting';
import { revisionInclude } from '@/lib/finding-workflow';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    engagement?: string;
    message?: string;
    saved?: string;
    issued?: string;
  }>;
}) {
  const actor = await requireDashboardSession();
  const params = await searchParams;
  const engagements = await prisma.engagement.findMany({
    select: { id: true, codeName: true },
    orderBy: { codeName: 'asc' },
  });
  const engagement =
    params.engagement && z.uuid().safeParse(params.engagement).success
      ? await prisma.engagement.findUnique({
          where: { id: params.engagement },
          include: {
            report: true,
            findings: { include: revisionInclude, orderBy: { title: 'asc' } },
            issuedReports: {
              select: {
                id: true,
                title: true,
                version: true,
                createdAt: true,
                sha256: true,
              },
              orderBy: { version: 'desc' },
            },
          },
        })
      : null;
  const selected =
    engagement?.report?.findingIds ??
    engagement?.findings.map((f) => f.id) ??
    [];
  return (
    <div className="page-container">
      <h1>Engagement reports</h1>
      <form method="get" className="writing-toolbar">
        <select
          name="engagement"
          className="form-input"
          required
          defaultValue={params.engagement ?? ''}
        >
          <option value="">Choose engagement</option>
          {engagements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codeName}
            </option>
          ))}
        </select>
        <button className="btn-secondary">Open report</button>
      </form>
      {params.message && <p role="alert">{params.message.slice(0, 300)}</p>}
      {params.saved && <p role="status">Report settings saved.</p>}
      {params.issued && (
        <p role="status">
          The approved PDF has been issued and stored as an immutable version.
        </p>
      )}
      {engagement && (
        <>
          <section className="glass-panel glass-panel--padded">
            <h2>{engagement.codeName}</h2>
            <form action={saveReport} className="writing-form">
              <input type="hidden" name="engagementId" value={engagement.id} />
              <input
                type="hidden"
                name="version"
                value={engagement.report?.version ?? 0}
              />
              <label className="form-label">
                Report title
                <input
                  className="form-input"
                  name="title"
                  required
                  maxLength={200}
                  defaultValue={
                    engagement.report?.title ??
                    `${engagement.codeName} — Security Assessment`
                  }
                />
              </label>
              <label className="form-label">
                Executive summary (Markdown)
                <textarea
                  className="form-input"
                  name="executiveSummary"
                  rows={8}
                  maxLength={10000}
                  defaultValue={engagement.report?.executiveSummary ?? ''}
                />
              </label>
              <p>
                Select up to 100 findings and set their order. Draft previews
                may include unapproved findings; issuing requires approval and
                complete fields.
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Include</th>
                    <th>Order</th>
                    <th>Finding</th>
                    <th>Review</th>
                    <th>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.findings.map((f, i) => (
                    <tr key={f.id}>
                      <td>
                        <input
                          aria-label={`Include ${f.title}`}
                          type="checkbox"
                          name="findingId"
                          value={f.id}
                          defaultChecked={selected.includes(f.id)}
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Order for ${f.title}`}
                          className="form-input"
                          type="number"
                          name={`order-${f.id}`}
                          min={0}
                          max={10000}
                          defaultValue={
                            selected.includes(f.id)
                              ? selected.indexOf(f.id) + 1
                              : selected.length + i + 1
                          }
                        />
                      </td>
                      <td>
                        <a href={`/dashboard/findings/${f.id}/write`}>
                          {f.title}
                        </a>
                      </td>
                      <td>{f.reviewStatus}</td>
                      <td>
                        {readinessIssues(
                          findingContent(f),
                          f.screenshots.map((s) => s.description)
                        ).join(' ') || 'Ready'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn-primary">Save report settings</button>
            </form>
            {engagement.report && (
              <div className="writing-toolbar">
                <a
                  className="btn-secondary"
                  href={`/api/reports/${engagement.id}?preview=1`}
                >
                  Download draft PDF
                </a>
                {actor.role === 'Admin' && (
                  <form action={issueReport}>
                    <input
                      type="hidden"
                      name="engagementId"
                      value={engagement.id}
                    />
                    <input
                      type="hidden"
                      name="version"
                      value={engagement.report.version}
                    />
                    <label>
                      <input name="confirm" type="checkbox" required /> I have
                      reviewed this report for delivery
                    </label>
                    <button className="btn-primary">Issue approved PDF</button>
                  </form>
                )}
              </div>
            )}
          </section>
          <section className="glass-panel glass-panel--padded">
            <h2>Issued versions</h2>
            <p>
              Later changes to findings, evidence or report settings do not
              modify these PDFs.
            </p>
            {engagement.issuedReports.map((r) => (
              <div key={r.id}>
                <p>
                  <a href={`/api/reports/${r.id}`}>
                    Version {r.version} — {r.title}
                  </a>{' '}
                  · {r.createdAt.toISOString()}
                </p>
                <details>
                  <summary>SHA-256 integrity digest</summary>
                  <code>{r.sha256}</code>
                </details>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
