import { DateTimePreferencesProvider } from '@/components/DateTimePreferencesProvider';
import { Navigation } from '@/components/Navigation';
import { ModalCleanup } from '@/components/ModalCleanup';
import { requireDashboardSession } from '@/lib/require-auth';
import { ensureReconciledScreenshotStorage } from '@/lib/screenshot-storage';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardSession();
  const isAdmin = session.role === 'Admin';
  const evidenceStorageReady = await ensureReconciledScreenshotStorage()
    .then(() => true)
    .catch(() => {
      console.error('Evidence storage reconciliation requires operator attention.');
      return false;
    });

  return (
    <DateTimePreferencesProvider>
      <ModalCleanup />
      <Navigation isAdmin={isAdmin} />
      <main className="dashboard-main">
        {isAdmin && !evidenceStorageReady ? (
          <p role="alert" className="text-error">
            Evidence storage cleanup requires operator attention. Check the application logs before creating a backup.
          </p>
        ) : null}
        {children}
      </main>
    </DateTimePreferencesProvider>
  );
}
