import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';

export const metadata = {
  title: 'About Portfolio Dashboard — Mission, Philosophy & Architecture',
  description: 'Learn about Portfolio Dashboard, an institutional-grade personal wealth tracking platform built on transparency, data privacy, and agentic automation.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Image src={appLogo} alt="Portfolio Dashboard Logo" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight">Portfolio Dashboard</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/developers" className="text-muted-foreground hover:text-foreground">Developers</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
            <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <div className="space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            About Us
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            About Portfolio Dashboard
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Portfolio Dashboard is a modern wealth intelligence and portfolio management platform engineered to bring institutional-grade tracking, automated multi-asset analytics, and AI synthesis to individual investors.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Our Mission & Investment Philosophy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We believe that individual investors deserve the same analytical precision, real-time valuation tools, and risk forecasting capabilities historically reserved for institutional family offices and wealth managers. Managing wealth across disparate asset classes—equities, fixed-income corporate bonds, sovereign debt securities, and everyday cash flow—should not require wrestling with fractured spreadsheets and delayed reporting.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Portfolio Dashboard solves this fragmentation by consolidating diverse holdings into a single real-time operational dashboard. Our philosophy emphasizes absolute data sovereignty: you retain complete control of your financial records while our analytical layer delivers live valuations, cash flow forecasting, and automated risk synthesis.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Core Technical Capabilities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2">
              <h3 className="font-semibold text-base text-foreground">Real-time Equity Tracking</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Live price feeds and percentage calculations across the National Stock Exchange of India (NSE) and Bombay Stock Exchange (BSE), including sector concentration breakdowns and unrealized P&L.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2">
              <h3 className="font-semibold text-base text-foreground">Fixed-Income Analytics</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bond maturity schedules, coupon payment dates, yield to maturity (YTM), and duration analysis for corporate debentures and sovereign gold bonds.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2">
              <h3 className="font-semibold text-base text-foreground">Cash Flow Forecasting</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Continuous daily transaction ledgers measuring monthly burn rates, categorized living expenses, and automated investment pacing against target objectives.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2">
              <h3 className="font-semibold text-base text-foreground">Agentic & MCP Ready</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Native Model Context Protocol (MCP) server integration, comprehensive OpenAPI 3.1.0 specifications, and programmatic REST endpoints allowing autonomous AI agents to query live market indicators.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Security & Data Protection Principles
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Privacy is foundational to Portfolio Dashboard. We adhere strictly to the following guarantees:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed pl-2">
            <li><strong>Zero Storage of Brokerage Credentials:</strong> We never request, store, or transmit brokerage passwords, PINs, or direct trading credentials.</li>
            <li><strong>Read-Only Sheet Integration:</strong> Data synchronization occurs exclusively via read-only Google Sheets connectors chosen and maintained by the user.</li>
            <li><strong>Client-Side Balance Masking:</strong> A dedicated privacy mode masks sensitive monetary amounts with asterisks for secure browsing in public or shared screen settings.</li>
            <li><strong>Automated Inactivity Protection:</strong> Session watchers detect background tab idle time and automatically terminate active sessions to protect unattended screens.</li>
          </ul>
        </section>

        <section className="space-y-4 border-t border-border/40 pt-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Organization & Contact
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Portfolio Dashboard is maintained by an engineering team based in Bengaluru, Karnataka, India. We actively support open developer standards and machine-readable data protocols.
          </p>
          <div className="p-5 rounded-2xl border border-border/50 bg-card/30 space-y-2 text-sm">
            <p><strong>Entity:</strong> Portfolio Dashboard</p>
            <p><strong>Address:</strong> 100 Financial Way, Bengaluru, Karnataka 560001, India</p>
            <p><strong>Support Email:</strong> <a href="mailto:support@portfolio-tracker.example.com" className="text-indigo-400 hover:underline">support@portfolio-tracker.example.com</a></p>
            <p><strong>Phone:</strong> +1-800-555-0199</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/10 text-center text-xs text-muted-foreground">
        <p>© 2026 Portfolio Dashboard. All rights reserved. • <Link href="/privacy" className="hover:underline">Privacy Policy</Link> • <Link href="/contact" className="hover:underline">Contact</Link> • <Link href="/developers" className="hover:underline">Developers</Link></p>
      </footer>
    </div>
  );
}
