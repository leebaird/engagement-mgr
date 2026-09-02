import { DateTimePreferencesProvider } from '@/components/DateTimePreferencesProvider';
import { Navigation } from '@/components/Navigation';
import { ModalCleanup } from '@/components/ModalCleanup';
import { requireDashboardSession } from '@/lib/require-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardSession();
  const isAdmin = session.role === 'Admin';

  return (
    <DateTimePreferencesProvider>
      <ModalCleanup />
      <Navigation isAdmin={isAdmin} />
      <main className="dashboard-main">
        {children}
      </main>
    </DateTimePreferencesProvider>
  );
}
