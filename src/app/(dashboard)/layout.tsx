import { Navigation } from '@/components/Navigation';
import { ModalCleanup } from '@/components/ModalCleanup';
import { getSession } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';

  return (
    <>
      <ModalCleanup />
      <Navigation isAdmin={isAdmin} />
      <main className="dashboard-main">
        {children}
      </main>
    </>
  );
}
