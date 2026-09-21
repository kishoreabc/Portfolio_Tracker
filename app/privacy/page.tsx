import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';

export const metadata = {
  title: 'Privacy Policy — Portfolio Dashboard',
  description: 'Understand how Portfolio Dashboard protects your financial data through read-only access, zero credential storage, and client-side masking.',
};

export default function PrivacyPage() {
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
            <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/developers" className="text-muted-foreground hover:text-foreground">Developers</Link>
            <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <div className="space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            Legal & Data Protection
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: September 21, 2026 • Last Reviewed: September 2026
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            1. Overview & Commitment to Financial Privacy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Portfolio Dashboard (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) is engineered specifically for investors who prioritize data confidentiality. We recognize that investment records, net worth valuations, and transaction histories represent highly sensitive personal data. This Privacy Policy sets forth our strict parameters regarding data access, transient processing, client-side encryption, and user rights.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            2. Data Architecture & Read-Only Synchronization
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Unlike conventional fintech platforms that require full read/write brokerage account integrations, Portfolio Dashboard operates on a <strong>decoupled, read-only data model</strong>:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed pl-2">
            <li><strong>Zero Storage of Banking or Trading Credentials:</strong> We never request, process, or store passwords, PINs, OTPs, or API keys for your demat accounts, brokerage accounts, or bank logins.</li>
            <li><strong>User-Controlled Sheet Source:</strong> Portfolio holdings and daily transaction ledgers are sourced exclusively from Google Sheets managed by you. Access permissions are strictly read-only and may be revoked by you at any time directly through your Google account.</li>
            <li><strong>In-Memory Aggregation:</strong> Portfolio calculations (e.g. net worth, asset allocation weightings, bond yields) are performed ephemerally in memory to render your dashboard, without permanent mirroring of underlying sheet rows in third-party relational databases.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            3. Authentication & Session Security
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            To prevent unauthorized access to your dashboard:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed pl-2">
            <li><strong>Cryptographic Sessions:</strong> User authentication is validated via signed, encrypted JSON Web Tokens (JWT) stored in HTTP-only, secure cookies that cannot be accessed by client-side scripts.</li>
            <li><strong>Inactivity Timeouts:</strong> A continuous client session watcher detects idle interaction. After 10 minutes of inactivity, or upon reaching the maximum 30-minute session duration, the active session is securely terminated, requiring re-authentication.</li>
            <li><strong>Single Active Session Store:</strong> Concurrent active session timestamps are tracked to prevent credential sharing and stale token replay attacks.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            4. Client-Side Balance Masking (Privacy Mode)
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Portfolio Dashboard features an integrated privacy mode. When toggled on, financial values across KPI cards, asset tables, and sector allocations are replaced with masked asterisks (••••••). This allows users to inspect trends, review allocation ratios, and share screens in public or professional environments without exposing net worth or absolute balance amounts.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            5. Third-Party Data Providers & Processing
          </h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              <strong>Yahoo Finance API:</strong> We query public market pricing data to calculate live percentage changes for Indian benchmark indices (e.g. NIFTY 50, NIFTY BANK) and individual equities. No personal identifiers or portfolio quantities are ever transmitted to Yahoo Finance.
            </p>
            <p>
              <strong>Google Gemini AI:</strong> When you request AI-powered portfolio insights or risk analysis, aggregated statistics (e.g. sector allocation percentages, top positive/negative movers) are sent in an anonymized prompt structure. No personally identifiable information (PII), names, or external account IDs are transmitted.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            6. Cookies & Tracking
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not use advertising cookies, third-party tracking pixels, or cross-site tracking technologies. We use strictly essential cookies required for session authentication and CSRF protection, and local storage strictly for UI preferences (theme preference, font scale, and privacy toggle state).
          </p>
        </section>

        <section className="space-y-4 border-t border-border/40 pt-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            7. Data Protection Rights & Inquiries
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            You maintain full sovereignty over your personal data. For questions regarding our data practices or to submit a data deletion request, please reach out to our privacy officer:
          </p>
          <div className="p-5 rounded-2xl border border-border/50 bg-card/30 space-y-2 text-sm">
            <p><strong>Privacy Officer:</strong> Portfolio Dashboard Data Governance</p>
            <p><strong>Email:</strong> <a href="mailto:privacy@portfolio-tracker.example.com" className="text-indigo-400 hover:underline">privacy@portfolio-tracker.example.com</a></p>
            <p><strong>Address:</strong> 100 Financial Way, Bengaluru, Karnataka 560001, India</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/10 text-center text-xs text-muted-foreground">
        <p>© 2026 Portfolio Dashboard. All rights reserved. • <Link href="/about" className="hover:underline">About</Link> • <Link href="/contact" className="hover:underline">Contact</Link> • <Link href="/developers" className="hover:underline">Developers</Link></p>
      </footer>
    </div>
  );
}
