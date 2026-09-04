import { notFound } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import {
  findingContent,
  findingContentSchema,
  mayReview,
  readinessIssues,
  contentFields,
} from '@/lib/reporting';
import { revisionInclude } from '@/lib/finding-workflow';
import {
  addFindingComment,
  assignReviewer,
  discardDraft,
  restoreFindingRevision,
  reviewFinding,
} from '@/app/actions/writing';
import { updateEvidence } from '@/app/actions/evidence';
import { WritingForm } from './WritingForm';
import { UploadScreenshotForm } from '../UploadScreenshotForm';
import { FindingMarkdown } from '@/components/FindingMarkdown';

export default async function WritingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
    revision?: string;
    recover?: string;
    saved?: string;
  }>;
}) {
  const actor = await requireDashboardSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const finding = await prisma.finding.findUnique({
    where: { id },
    include: {
      ...revisionInclude,
      author: { select: { username: true } },
      reviewer: { select: { username: true } },
      comments: { orderBy: { createdAt: 'desc' }, take: 100 },
      revisions: {
        select: { id: true, version: true, reason: true, createdAt: true },
        orderBy: { version: 'desc' },
        take: 100,
      },
    },
  });
  if (!finding) notFound();
  const draft = await prisma.findingDraft.findUnique({
    where: { findingId_userId: { findingId: id, userId: actor.userId } },
  });
  const reviewers =
    actor.role === 'Admin'
      ? await prisma.user.findMany({
          select: { id: true, username: true },
          orderBy: { username: 'asc' },
        })
      : [];
  const revision =
    query.revision && z.uuid().safeParse(query.revision).success
      ? await prisma.findingRevision.findFirst({
          where: { id: query.revision, findingId: id },
        })
      : null;
  const recovery =
    query.recover === '1' && draft
      ? findingContentSchema.safeParse(draft.content)
      : null;
  const content = findingContent(finding);
  const issues = readinessIssues(
    content,
    finding.screenshots.map((s) => s.description)
  );
  const hidden = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={finding.version} />
    </>
  );
  return (
    <div className="page-container">
      <div className="writing-toolbar">
        <a href={`/dashboard/findings?detail=${id}`}>Back to finding</a>
        <a href="/dashboard/templates">Finding templates</a>
        <a href="/dashboard/reviews">Review queue</a>
        {finding.engagementId && (
          <a href={`/dashboard/reports?engagement=${finding.engagementId}`}>
            Engagement report
          </a>
        )}
      </div>
      <h1>{finding.title}</h1>
      <p>
        Revision {finding.version} · {finding.reviewStatus} · Author:{' '}
        {finding.author?.username ?? 'Unassigned'} · Reviewer:{' '}
        {finding.reviewer?.username ?? 'Unassigned'}
      </p>
      {(query.error || query.message) && (
        <p role="alert" className="text-error">
          {query.message?.slice(0, 300) ||
            (query.error === 'conflict'
              ? 'This finding changed. Recover your private draft and compare it before saving.'
              : 'The operation failed. Reload and check your input before retrying.')}
        </p>
      )}
      {query.saved && (
        <p role="status">
          Finding saved. Any previous approval has been cleared.
        </p>
      )}
      {draft && (
        <div className="glass-panel glass-panel--padded">
          <p>
            A private draft is available from {draft.updatedAt.toISOString()}.
            {draft.baseVersion !== finding.version &&
              ' The finding has changed since this draft; compare before saving.'}
          </p>
          <a href={`/dashboard/findings/${id}/write?recover=1`}>
            Recover draft into editor
          </a>
          <form action={discardDraft}>
            {hidden}
            <input type="hidden" name="draftVersion" value={draft.version} />
            <button className="btn-secondary">Discard private draft</button>
          </form>
        </div>
      )}
      {revision && (
        <section className="glass-panel glass-panel--padded">
          <h2>Revision {revision.version}</h2>
          <p>
            Restoring text creates a new draft revision and clears approval.
            Evidence files are not restored.
          </p>
          {contentFields.map((key) => (
            <details key={key}>
              <summary>{key}</summary>
              <FindingMarkdown
                text={findingContentSchema.parse(revision.content)[key]}
              />
            </details>
          ))}
          <form action={restoreFindingRevision}>
            {hidden}
            <input type="hidden" name="revisionId" value={revision.id} />
            <button className="btn-secondary">
              Restore this text revision
            </button>
          </form>
        </section>
      )}
      <div className="writing-layout">
        <section className="glass-panel glass-panel--padded">
          <WritingForm
            key={`${id}-${query.recover ?? ''}-${query.saved ?? ''}`}
            id={id}
            version={finding.version}
            initialContent={recovery?.success ? recovery.data : content}
            publishedContent={content}
            initialDraftVersion={draft?.version ?? 0}
            engagementScoped={Boolean(finding.engagementId)}
          />
        </section>
        <aside className="writing-sidebar">
          <section className="glass-panel glass-panel--padded">
            <h2>Evidence</h2>
            <UploadScreenshotForm findingId={id} version={finding.version} />
            {finding.screenshots.map((s) => (
              <div key={s.id} className="evidence-card">
                <img
                  src={`/api/uploads/${s.filePath}`}
                  alt={s.description || 'Finding evidence'}
                />
                <form action={updateEvidence}>
                  {hidden}
                  <input type="hidden" name="screenshotId" value={s.id} />
                  <label className="form-label">
                    Caption
                    <input
                      name="description"
                      className="form-input"
                      defaultValue={s.description ?? ''}
                      maxLength={500}
                    />
                  </label>
                  <label className="form-label">
                    Order
                    <input
                      name="sortOrder"
                      className="form-input"
                      type="number"
                      min={0}
                      max={10000}
                      defaultValue={s.sortOrder}
                    />
                  </label>
                  <button className="btn-secondary">
                    Save evidence details
                  </button>
                </form>
              </div>
            ))}
            <a href={`/dashboard/findings/${id}`}>
              Manage or delete screenshots
            </a>
          </section>
          <section className="glass-panel glass-panel--padded">
            <h2>Review</h2>
            {issues.length ? (
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p>Readiness checks passed.</p>
            )}
            {finding.engagementId &&
              ['Draft', 'ChangesRequested'].includes(finding.reviewStatus) && (
                <form action={reviewFinding}>
                  {hidden}
                  <input name="status" type="hidden" value="Ready" />
                  <button className="btn-primary" disabled={issues.length > 0}>
                    Send for review
                  </button>
                </form>
              )}
            {finding.reviewStatus === 'Ready' && mayReview(actor, finding) && (
              <form action={reviewFinding}>
                {hidden}
                <button name="status" value="Approved" className="btn-primary">
                  Approve revision
                </button>
                <button
                  name="status"
                  value="ChangesRequested"
                  className="btn-secondary"
                >
                  Request changes
                </button>
              </form>
            )}
            {actor.role === 'Admin' && (
              <form action={assignReviewer}>
                {hidden}
                <label className="form-label">
                  Reviewer
                  <select
                    name="reviewerId"
                    className="form-input"
                    defaultValue={finding.reviewerId ?? ''}
                    required
                  >
                    <option value="">Choose reviewer</option>
                    {reviewers
                      .filter((u) => u.id !== finding.authorId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                  </select>
                </label>
                <button className="btn-secondary">Assign reviewer</button>
              </form>
            )}
            <form action={addFindingComment}>
              {hidden}
              <label className="form-label">
                Review comment
                <textarea
                  name="body"
                  className="form-input"
                  rows={3}
                  required
                  maxLength={4000}
                />
              </label>
              <button className="btn-secondary">Add comment</button>
            </form>
            {finding.comments.map((c) => (
              <div key={c.id}>
                <p>
                  <strong>{c.username}</strong> · {c.createdAt.toISOString()}
                </p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            ))}
          </section>
          <section className="glass-panel glass-panel--padded">
            <h2>Revision history</h2>
            {finding.revisions.map((r) => (
              <p key={r.id}>
                <a href={`/dashboard/findings/${id}/write?revision=${r.id}`}>
                  Revision {r.version}
                </a>{' '}
                · {r.reason} · {r.createdAt.toISOString()}
              </p>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
