import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import { scannerFormats } from '@/lib/scanner-import';
import { PageHeader } from '@/components/PageHeader';
import { ImportForm } from './ImportForm';

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    engagement?: string;
    imported?: string;
    error?: string;
  }>;
}) {
  await requireDashboardSession();
  const params = await searchParams;
  const engagements = await prisma.engagement.findMany({
    select: { id: true, codeName: true },
    orderBy: { codeName: 'asc' },
  });
  return (
    <div className="page-container">
      <PageHeader title="Import Scanner Findings" showAddButton={false} />
      {params.imported && (
        <p role="status">
          Imported {Number(params.imported) || 0} new findings. Existing
          duplicates were skipped.
        </p>
      )}
      {params.error && (
        <p role="alert" className="text-error">
          Import failed. Check the selected records and try again. No partial
          batch was saved.
        </p>
      )}
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)' }}>
        XML: Burp Suite issues, Nessus, Nmap, Greenbone/OpenVAS reports,
        Qualys scan reports. JSON: ZAP traditional JSON and SARIF 2.1. JSON
        Lines: Nuclei. Nmap open ports are imported as informational
        observations.
      </p>
      <ImportForm
        engagements={engagements}
        formats={scannerFormats}
        selectedEngagement={params.engagement ?? ''}
      />
    </div>
  );
}
