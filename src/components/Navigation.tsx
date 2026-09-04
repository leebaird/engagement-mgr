'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, ShieldAlert, Crosshair, LogOut, Contact, Zap, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { DateTimePreferencesControls } from '@/components/DateTimePreferencesProvider';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const navItems: { name: string; href: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Engagements', href: '/dashboard/engagements', icon: Crosshair },
  { name: 'Clients', href: '/dashboard/clients', icon: Building2 },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Contact },
  { name: 'Findings', href: '/dashboard/findings', icon: ShieldAlert },
  { name: 'Templates', href: '/dashboard/templates', icon: ShieldAlert },
  { name: 'Reviews', href: '/dashboard/reviews', icon: ShieldAlert },
  { name: 'Reports', href: '/dashboard/reports', icon: Crosshair },
  { name: 'Imports', href: '/dashboard/imports', icon: ShieldAlert },
  { name: 'Operators', href: '/dashboard/operators', icon: Zap },
  { name: 'Admin', href: '/dashboard/users', icon: Users, adminOnly: true },
];

export function Navigation({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      // Ignore storage failures; default to expanded.
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    return () => document.body.classList.remove('sidebar-collapsed');
  }, [collapsed]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // Ignore storage failures; the choice still applies this session.
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-title">Engagement</span>
        <span className="sidebar__brand-sub">Manager</span>
      </div>

      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.href} className={isActive ? 'nav-link nav-link--active' : 'nav-link'} title={item.name}>
                  <span className="nav-link__icon"><Icon size={20} /></span>
                  <span className="nav-link__label">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <DateTimePreferencesControls />
        <form action={logout}>
          <button type="submit" className="signout-btn" title="Sign Out">
            <LogOut size={20} />
            <span className="signout-btn__label">Sign Out</span>
          </button>
        </form>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          <span className="sidebar-toggle__label">{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </div>
    </aside>
  );
}
