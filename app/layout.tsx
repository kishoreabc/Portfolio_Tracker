import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { SessionWatcher } from '@/components/auth/SessionWatcher';
import { StockDetailsModal } from '@/components/stocks/StockDetailsModal';

const BASE_URL = 'https://portfolio-tracker-kishoreabcs-projects.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Portfolio Dashboard — Real-time Investment & Asset Tracking',
    template: '%s | Portfolio Dashboard',
  },
  description: 'Personal investment portfolio dashboard — real-time equity and bond tracking, multi-asset allocation, cash flow analysis, and AI market insights.',
  keywords: ['portfolio dashboard', 'portfolio tracker', 'investments', 'stocks', 'bonds', 'nifty', 'wealth tracking', 'asset allocation'],
  applicationName: 'Portfolio Dashboard',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'Portfolio Dashboard',
    title: 'Portfolio Dashboard — Real-time Investment & Asset Tracking',
    description: 'Personal investment portfolio dashboard — real-time equity and bond tracking, multi-asset allocation, cash flow analysis, and AI market insights.',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Portfolio Dashboard Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portfolio Dashboard — Real-time Investment & Asset Tracking',
    description: 'Personal investment portfolio dashboard — real-time equity and bond tracking, multi-asset allocation, cash flow analysis, and AI market insights.',
    images: ['/icon.png'],
  },
};

const jsonLdData = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Portfolio Dashboard',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    url: BASE_URL,
    description: 'Personal investment portfolio dashboard with real-time equity and bond tracking, multi-asset allocation, cash flow analysis, and AI insights.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Portfolio Dashboard',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    sameAs: [
      'https://github.com/portfolio-tracker',
      'https://twitter.com/portfoliotracker',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-800-555-0199',
      contactType: 'Customer Support',
      email: 'support@portfolio-tracker.example.com',
      availableLanguage: ['English'],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '100 Financial Way',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      postalCode: '560001',
      addressCountry: 'IN',
    },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className="min-h-screen antialiased bg-background text-foreground">
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
