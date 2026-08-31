import { DateFormatProvider } from '@/components/DateFormatProvider';
import { Navigation } from '@/components/Navigation';
import { ModalCleanup } from '@/components/ModalCleanup';
import { requireDashboardSession } from '@/lib/require-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardSession();
  const isAdmin = session.role === 'Admin';

  return (
    <DateFormatProvider>
      <ModalCleanup />
      <Navigation isAdmin={isAdmin} />
      <main className="dashboard-main">
        {children}
      </main>
    </DateFormatProvider>
  );
}
