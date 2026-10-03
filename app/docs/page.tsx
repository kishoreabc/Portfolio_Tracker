import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Portfolio Dashboard API Reference & Endpoint Documentation',
  description: 'Complete API reference for Portfolio Dashboard: public market data, system status, OpenAPI 3.1.0 specifications, and MCP server endpoints.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
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
            <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Home</Link>
            <Link href="/developers" className="text-muted-foreground hover:text-foreground">Developer Portal</Link>
            <Link href="/openapi.json" className="text-muted-foreground hover:text-foreground">OpenAPI Spec</Link>
            <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <div className="space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            API Documentation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Portfolio Dashboard API Reference
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
            Complete technical specification of public and authenticated REST endpoints, Model Context Protocol (MCP) handlers, and content negotiation mechanisms.
          </p>
        </div>

        {/* Global Architecture */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Base URL & Protocol
          </h2>
          <div className="p-4 rounded-xl border border-border/50 bg-card/40 font-mono text-sm text-indigo-300">
            https://portfolio-tracker-kishoreabcs-projects.vercel.app
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All API requests must be transmitted over HTTPS. Endpoints return standard UTF-8 encoded JSON payloads unless requested otherwise via content negotiation.
          </p>
        </section>

        {/* Structured Errors */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Structured JSON Error Format
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every error returned by Portfolio Dashboard (including 400, 401, 403, 404, 405, 429, and 500) includes structured machine-readable fields: an error <code>code</code>, a descriptive <code>message</code>, and an actionable <code>resolution_hint</code> designed for autonomous AI agent recovery:
          </p>
          <pre className="p-4 rounded-xl bg-black/60 border border-border/40 text-xs font-mono text-amber-300 overflow-x-auto">
{`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required to access this resource.",
    "resolution_hint": "Provide a valid session cookie or API key. For public endpoints, visit /developers."
  },
  "code": "UNAUTHORIZED",
  "message": "Authentication required to access this resource.",
  "resolution_hint": "Provide a valid session cookie or API key. For public endpoints, visit /developers."
}`}
          </pre>
        </section>

        {/* Endpoints */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Public Endpoints (No Auth Required)
          </h2>

          {/* Market Data */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">GET</span>
              <code className="text-base font-semibold text-foreground">/api/market-data</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Returns real-time price change percentages for Indian equity benchmarks (NIFTY 50, NIFTY BANK, NIFTY IT, etc.) and selected equities.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sample Response (200 OK):</p>
              <pre className="p-3.5 rounded-xl bg-black/60 border border-border/30 text-xs font-mono text-indigo-300 overflow-x-auto">
{`[
  { "symbol": "NIFTY 50", "value": "+0.54%" },
  { "symbol": "NIFTY BANK", "value": "+0.42%" },
  { "symbol": "RELIANCE", "value": "+0.35%" }
]`}
              </pre>
            </div>
          </div>

          {/* System Summary */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">GET</span>
              <code className="text-base font-semibold text-foreground">/api/v1/summary</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Provides an overview of system capabilities, operational status, supported asset categories, and active index tickers.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sample Response (200 OK):</p>
              <pre className="p-3.5 rounded-xl bg-black/60 border border-border/30 text-xs font-mono text-indigo-300 overflow-x-auto">
{`{
  "platform": "Portfolio Dashboard",
  "version": "1.0.0",
  "status": "operational",
  "asset_classes": ["Equities (NSE & BSE)", "Corporate Bonds", "Government & Sovereign Bonds", "Daily Cash Flow & Transactions"],
  "indices_supported": ["NIFTY 50", "NIFTY NEXT 50", "NIFTY BANK", "NIFTY IT", "INDIA VIX"]
}`}
              </pre>
            </div>
          </div>

          {/* Health Check */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">GET</span>
              <code className="text-base font-semibold text-foreground">/api/v1/health</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Verifies API service health and current UTC timestamp.
            </p>
          </div>

          {/* MCP Endpoint */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-400 text-xs font-mono font-bold">GET / POST</span>
              <code className="text-base font-semibold text-foreground">/.well-known/mcp</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Model Context Protocol (MCP) server endpoint for AI agents. GET returns server manifest and supports Server-Sent Events (SSE) streamable HTTP transport. POST handles JSON-RPC 2.0 tool execution.
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li><code>get_market_quotes</code>: Live Indian index quotes</li>
              <li><code>get_portfolio_summary</code>: Platform capability metrics</li>
              <li><code>calculate_asset_allocation</code>: Multi-asset allocation percentage calculator</li>
            </ul>
          </div>
        </section>

        {/* Content Negotiation */}
        <section className="space-y-4 border-t border-border/40 pt-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Markdown Content Negotiation (acceptmarkdown.com)
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI crawlers and agents that require clean, token-efficient Markdown can supply the header:
          </p>
          <div className="p-3.5 rounded-xl bg-black/60 border border-border/40 font-mono text-xs text-emerald-400">
            Accept: text/markdown
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The server automatically serves the Markdown representation with a corresponding <code>Vary: Accept, Accept-Encoding</code> header for CDN cache compliance.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/10 text-center text-xs text-muted-foreground">
        <p>© 2026 Portfolio Dashboard. All rights reserved. • <Link href="/developers" className="hover:underline">Developers</Link> • <Link href="/openapi.json" className="hover:underline">OpenAPI</Link> • <Link href="/privacy" className="hover:underline">Privacy Policy</Link></p>
      </footer>
    </div>
  );
}
