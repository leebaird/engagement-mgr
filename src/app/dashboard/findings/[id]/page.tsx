import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { UploadScreenshotForm } from './UploadScreenshotForm';
import { DeleteScreenshotButton } from './DeleteScreenshotButton';
import { requireDashboardSession } from '@/lib/require-auth';

export default async function FindingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delete?: string; deleteError?: string }>;
}) {
  await requireDashboardSession();
  const resolvedParams = await params;
  const { delete: deleteScreenshotId, deleteError } = await searchParams;
  const finding = await prisma.finding.findUnique({
    where: { id: resolvedParams.id },
    include: {
      engagement: { select: { codeName: true } },
      screenshots: true,
    },
  });

  if (!finding) return notFound();

  return (
    <div className="page-container">
      <a href={`/dashboard/findings?detail=${finding.id}`} className="btn-secondary" style={{ display: 'inline-flex', width: 'fit-content', marginBottom: '1rem', textDecoration: 'none' }}>
        ← Back to Finding
      </a>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{finding.title}</h1>
      <a href={`/dashboard/findings/${finding.id}/write`}>Write and review this finding</a>
      <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Engagement: {finding.engagement?.codeName || 'Unassigned'} &nbsp;|&nbsp; 
        Severity: <span style={{ color: 'var(--primary-color)' }}>{finding.severity}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {finding.background && (
            <div className="glass-panel glass-panel--padded">
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Background</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{finding.background}</p>
            </div>
          )}
          {finding.remediation && (
            <div className="glass-panel glass-panel--padded">
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Remediation</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{finding.remediation}</p>
            </div>
          )}

          {finding.supportingData && (
            <div className="glass-panel glass-panel--padded">
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>See Also</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{finding.supportingData}</p>
            </div>
          )}

        </div>

        <div>
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Upload Screenshot</h3>
            <UploadScreenshotForm findingId={finding.id} version={finding.version} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Screenshots</h3>
            {finding.screenshots.map(s => (
              <div key={s.id} className="glass-panel" style={{ padding: '1rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/uploads/${s.filePath}`} alt="Screenshot" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
                {s.description && <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{s.description}</p>}
                <DeleteScreenshotButton
                  screenshotId={s.id}
                  findingId={finding.id}
                  version={finding.version}
                  confirmHref={`/dashboard/findings/${finding.id}?delete=${s.id}`}
                  cancelHref={`/dashboard/findings/${finding.id}`}
                  showConfirm={deleteScreenshotId === s.id}
                  deleteError={deleteScreenshotId === s.id ? deleteError : undefined}
                />
              </div>
            ))}
            {finding.screenshots.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No screenshots uploaded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
