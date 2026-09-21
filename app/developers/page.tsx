'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';
import { Terminal, Copy, Check, Play, Shield, Code, Cpu, ArrowRight } from 'lucide-react';

export default function DevelopersPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/market-data');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleTestEndpoint = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(selectedEndpoint);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setApiResponse(JSON.stringify({ error: 'Request failed', details: String(err) }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const curlExample = `curl -s https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/market-data`;

  const pythonExample = `import requests

url = "https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/market-data"
response = requests.get(url)
quotes = response.json()

for item in quotes[:5]:
    print(f"{item['symbol']}: {item['value']}")`;

  const tsExample = `async function getMarketQuotes() {
  const res = await fetch("https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/market-data");
  const data = await res.json();
  console.log("Market Quotes:", data);
}

getMarketQuotes();`;

  const mcpConfigExample = `{
  "mcpServers": {
    "portfolio-dashboard": {
      "url": "https://portfolio-tracker-kishoreabcs-projects.vercel.app/.well-known/mcp",
      "transport": "http"
    }
  }
}`;

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
            <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground">API Reference</Link>
            <Link href="/openapi.json" className="text-muted-foreground hover:text-foreground">OpenAPI</Link>
            <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Hero */}
        <div className="space-y-4 border-b border-border/40 pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            Developer Platform & Agent Hub
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Portfolio Dashboard Developer Portal
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Build integrations, automate portfolio reporting, and connect autonomous AI agents via our public REST APIs, OpenAPI 3.1.0 specifications, and Model Context Protocol (MCP) server.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/docs" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
              API Documentation <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/openapi.json" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/60 text-sm font-semibold hover:bg-card/80 transition-all">
              <Code className="w-4 h-4 text-indigo-400" /> OpenAPI 3.1.0 JSON
            </Link>
            <Link href="/.well-known/mcp" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/60 text-sm font-semibold hover:bg-card/80 transition-all">
              <Cpu className="w-4 h-4 text-purple-400" /> MCP Manifest
            </Link>
            <Link href="/llms.txt" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/60 text-sm font-semibold hover:bg-card/80 transition-all">
              <Terminal className="w-4 h-4 text-emerald-400" /> Agent Instructions (llms.txt)
            </Link>
          </div>
        </div>

        {/* Interactive API Sandbox */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-400" /> Interactive API Sandbox
            </h2>
            <p className="text-sm text-muted-foreground">
              Test public endpoints directly from your browser with zero configuration.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Select API endpoint to test"
                value={selectedEndpoint}
                onChange={(e) => {
                  setSelectedEndpoint(e.target.value);
                  setApiResponse(null);
                }}
                className="h-11 px-4 rounded-xl bg-background/80 border border-border/60 text-sm font-mono text-foreground focus:outline-none focus:border-indigo-500"
              >
                <option value="/api/market-data">GET /api/market-data (Live Indian Market Quotes)</option>
                <option value="/api/v1/summary">GET /api/v1/summary (Platform Capabilities & Status)</option>
                <option value="/api/v1/health">GET /api/v1/health (Health Check)</option>
                <option value="/.well-known/mcp">GET /.well-known/mcp (Model Context Protocol Manifest)</option>
              </select>

              <button
                onClick={handleTestEndpoint}
                disabled={isLoading}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                {isLoading ? 'Executing...' : 'Run Request'}
              </button>
            </div>

            {apiResponse && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Response (200 OK)</span>
                  <button
                    onClick={() => copyToClipboard(apiResponse, 'sandbox')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {copiedSection === 'sandbox' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSection === 'sandbox' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black/60 border border-border/40 text-xs font-mono text-emerald-400 overflow-x-auto max-h-72">
                  {apiResponse}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Quickstart Code Snippets */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" /> Quickstart Code Snippets
            </h2>
            <p className="text-sm text-muted-foreground">
              Integrate live market indicators into your Python scripts, Node.js services, or shell pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* cURL */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>cURL</span>
                <button onClick={() => copyToClipboard(curlExample, 'curl')} className="hover:text-foreground flex items-center gap-1">
                  {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'curl' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-black/60 border border-border/30 text-xs font-mono text-indigo-300 overflow-x-auto">
                {curlExample}
              </pre>
            </div>

            {/* Python */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Python</span>
                <button onClick={() => copyToClipboard(pythonExample, 'python')} className="hover:text-foreground flex items-center gap-1">
                  {copiedSection === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'python' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-black/60 border border-border/30 text-xs font-mono text-indigo-300 overflow-x-auto">
                {pythonExample}
              </pre>
            </div>

            {/* TypeScript */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>TypeScript</span>
                <button onClick={() => copyToClipboard(tsExample, 'ts')} className="hover:text-foreground flex items-center gap-1">
                  {copiedSection === 'ts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'ts' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-black/60 border border-border/30 text-xs font-mono text-indigo-300 overflow-x-auto">
                {tsExample}
              </pre>
            </div>

            {/* MCP Client Config */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>MCP Client Configuration</span>
                <button onClick={() => copyToClipboard(mcpConfigExample, 'mcp')} className="hover:text-foreground flex items-center gap-1">
                  {copiedSection === 'mcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSection === 'mcp' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-black/60 border border-border/30 text-xs font-mono text-indigo-300 overflow-x-auto">
                {mcpConfigExample}
              </pre>
            </div>
          </div>
        </section>

        {/* Authentication & API Keys */}
        <section className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Authentication & Key Management
              </h2>
              <p className="text-xs text-muted-foreground">
                Standardized security models for public vs private portfolio endpoints.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pt-2">
            <p>
              <strong>Public Endpoints:</strong> Endpoints including <code>/api/market-data</code>, <code>/api/v1/summary</code>, <code>/api/v1/health</code>, and <code>/.well-known/mcp</code> do not require authentication keys and are free for AI agents, crawlers, and developer applications (rate limited to 60 requests per minute per IP).
            </p>
            <p>
              <strong>Private Portfolio Endpoints:</strong> Access to personal holdings (<code>/api/portfolio</code>, <code>/api/news</code>, <code>/api/bonds/cashflow</code>) requires a valid session token obtained by signing in through <code>/login</code>. For server-to-server or agent access to private sheets, session cookies or OAuth bearer tokens must be included in the request headers.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/10 text-center text-xs text-muted-foreground">
        <p>© 2026 Portfolio Dashboard. All rights reserved. • <Link href="/docs" className="hover:underline">Docs</Link> • <Link href="/openapi.json" className="hover:underline">OpenAPI</Link> • <Link href="/privacy" className="hover:underline">Privacy</Link> • <Link href="/about" className="hover:underline">About</Link></p>
      </footer>
    </div>
  );
}
