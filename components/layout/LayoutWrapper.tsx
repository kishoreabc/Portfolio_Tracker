'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
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
  '/stock-analysis',
  '/analysis',
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
  const router = useRouter();
  const { data: session, status } = useSession();

  const isLoggedIn = !!session?.user && Object.keys(session.user).length > 0;

  const isProtectedAppRoute = AUTH_DASHBOARD_ROUTES.some(
    (route) => route !== '/' && (pathname === route || pathname.startsWith(route + '/'))
  );

  useEffect(() => {
    if (status === 'unauthenticated' && isProtectedAppRoute) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, isProtectedAppRoute, pathname, router]);

  // If unauthenticated on a protected dashboard route, render a clean loading spinner while redirecting
  if (status === 'unauthenticated' && isProtectedAppRoute) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#070b14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

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
