import { redirect } from 'next/navigation';
import { DateFormatProvider } from '@/components/DateFormatProvider';
import { Navigation } from '@/components/Navigation';
import { ModalCleanup } from '@/components/ModalCleanup';
import { getSession, isPasswordRotationRequired } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // DB-backed password rotation (proxy only uses JWT claim for a fast redirect)
  if (isPasswordRotationRequired(session.lastPasswordChange)) {
    redirect('/change-password');
  }

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
