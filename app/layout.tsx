import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { SessionWatcher } from '@/components/auth/SessionWatcher';
import { StockDetailsModal } from '@/components/stocks/StockDetailsModal';

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
          <SessionWatcher>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            <StockDetailsModal />
          </SessionWatcher>
        </Providers>
      </body>
    </html>
  );
}
