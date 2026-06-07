import { Navigation } from '@/components/Navigation';
import { getSession } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navigation isAdmin={isAdmin} />
      <main style={{ flex: 1, marginLeft: '200px', padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
