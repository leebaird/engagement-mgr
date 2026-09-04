import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import { reviewStatuses } from '@/lib/reporting';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string }>;
}) {
  const actor = await requireDashboardSession();
  const params = await searchParams;
  const status = reviewStatuses.find((s) => s === params.status) ?? 'Ready';
  const findings = await prisma.finding.findMany({
    where: {
      reviewStatus: status,
      engagementId: { not: null },
      ...(params.mine === '1' ? { reviewerId: actor.userId } : {}),
    },
    select: {
      id: true,
      title: true,
      version: true,
      severity: true,
      engagement: { select: { codeName: true } },
      author: { select: { username: true } },
      reviewer: { select: { username: true } },
    },
    orderBy: { updatedAt: 'asc' },
    take: 100,
  });
  return (
    <div className="page-container">
      <h1>Finding reviews</h1>
      <form method="get" className="writing-toolbar">
        <select name="status" className="form-input" defaultValue={status}>
          {reviewStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={params.mine === '1'}
          />{' '}
          Assigned to me
        </label>
        <button className="btn-secondary">Filter</button>
      </form>
      <div className="glass-panel glass-panel--padded">
        <p>Showing up to 100 findings, oldest changes first.</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Finding</th>
              <th>Engagement</th>
              <th>Severity</th>
              <th>Author</th>
              <th>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td>
                  <a href={`/dashboard/findings/${f.id}/write`}>{f.title}</a> ·
                  v{f.version}
                </td>
                <td>{f.engagement?.codeName}</td>
                <td>{f.severity}</td>
                <td>{f.author?.username ?? 'Unassigned'}</td>
                <td>{f.reviewer?.username ?? 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
