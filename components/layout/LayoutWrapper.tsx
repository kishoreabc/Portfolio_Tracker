'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300"
        style={{ paddingLeft: 'var(--sidebar-width, 240px)', paddingTop: '60px' }}
      >
        {children}
      </main>
    </div>
  );
}
