'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
          isCollapsed ? 'md:pl-16' : 'md:pl-60' // desktop
        ].join(' ')}
        style={{ paddingTop: '60px' }}
      >
        {children}
      </main>
    </div>
  );
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
}
