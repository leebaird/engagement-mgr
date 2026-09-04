import { prisma } from '@/lib/db';
import { requireDashboardSession } from '@/lib/require-auth';
import { scannerFormats } from '@/lib/scanner-import';
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
      <h1>Import scanner findings</h1>
      <p>
        XML: Burp Suite issues, Nessus, Nmap, Greenbone/OpenVAS reports, Qualys
        scan reports. JSON: ZAP traditional JSON and SARIF 2.1. JSON Lines:
        Nuclei. Nmap open ports are imported as informational observations.
      </p>
      {params.imported && (
        <p role="status">
          Imported {Number(params.imported) || 0} new findings. Existing
          duplicates were skipped.
        </p>
      )}
      {params.error && (
        <p role="alert">
          Import failed. Check the selected records and try again. No partial
          batch was saved.
        </p>
      )}
      <section className="glass-panel glass-panel--padded">
        <ImportForm
          engagements={engagements}
          formats={scannerFormats}
          selectedEngagement={params.engagement ?? ''}
        />
      </section>
    </div>
  );
}
