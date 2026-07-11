import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: {
    default: 'Portfolio Dashboard',
    template: '%s | Portfolio Dashboard',
  },
  description: 'Personal investment portfolio dashboard — real-time equity and bond tracking powered by Google Sheets',
  keywords: ['portfolio', 'investments', 'stocks', 'bonds', 'dashboard', 'tracker'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main
              className="flex-1 transition-all duration-300"
              style={{ paddingLeft: 'var(--sidebar-width, 240px)', paddingTop: '60px' }}
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
