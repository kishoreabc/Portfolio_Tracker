'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarContext';

function AppShell({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className={[
          'flex-1 min-w-0 transition-[padding-left] duration-300 ease-in-out',
          'pl-0', // mobile
          isCollapsed ? 'md:pl-16' : 'md:pl-60', // desktop
        ].join(' ')}
        style={{ paddingTop: '60px' }}
      >
        {children}
      </main>
    </div>
  );
}

const AUTH_DASHBOARD_ROUTES = [
  '/',
  '/portfolio',
  '/stocks',
  '/bonds',
  '/cashflow',
  '/calendar',
  '/analytics',
  '/reports',
  '/insights',
  '/news',
];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isLoggedIn = !!session?.user && Object.keys(session.user).length > 0;

  // The sidebar shell should ONLY be rendered if the user is authenticated
  // AND the current route is one of the valid dashboard application routes.
  // Unknown routes (404), public pages, and unauthenticated sessions will not show the sidebar.
  const isDashboardRoute =
    isLoggedIn &&
    AUTH_DASHBOARD_ROUTES.some(
      (route) => pathname === route || (route !== '/' && pathname.startsWith(route + '/'))
    );

  if (!isDashboardRoute) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
}
