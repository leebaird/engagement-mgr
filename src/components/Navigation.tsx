'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, ShieldAlert, Crosshair, LogOut, Contact, Zap } from 'lucide-react';
import { logout } from '@/app/actions/auth';

const navItems: { name: string; href: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Engagements', href: '/engagements', icon: Crosshair },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: Contact },
  { name: 'Findings', href: '/findings', icon: ShieldAlert },
  { name: 'Operators', href: '/operators', icon: Zap },
  { name: 'Admin', href: '/users', icon: Users, adminOnly: true },
];

export function Navigation({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '200px',
      background: 'rgba(255,255,255,0.02)',
      borderRight: '1px solid var(--surface-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed'
    }}>
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1 }}>Engagement</span>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1 }}>Manager</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0 1rem' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.href} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? '3px solid var(--sidebar-active)' : '3px solid transparent'
                }}>
                  <Icon size={20} color={isActive ? 'var(--sidebar-active)' : 'currentColor'} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid var(--surface-border)' }}>
        <form action={logout}>
          <button type="submit" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '8px',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <LogOut size={20} />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
