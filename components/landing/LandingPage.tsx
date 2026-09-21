import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Image
                src={appLogo}
                alt="Portfolio Dashboard Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/75">
              Portfolio Dashboard
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">API Reference</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/developers"
              className="text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:bg-white/[0.04] transition-all"
            >
              Developer Portal
            </Link>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-4 py-2 rounded-xl shadow-md shadow-indigo-500/25 hover:scale-[1.02] active:scale-100 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
              Institutional-Grade Wealth Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/70">
              Portfolio Dashboard — Real-time Investment & Asset Tracking
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Unified tracking and automated analytics across Indian equities, corporate and sovereign bonds, daily transaction cash flows, and AI-driven market intelligence. Engineered for precision, privacy, and seamless agentic automation.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/login"
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-100 transition-all"
              >
                Access Your Portfolio
              </Link>
              <Link
                href="/developers"
                className="h-12 px-6 rounded-xl bg-card/60 hover:bg-card border border-border/60 text-foreground font-semibold flex items-center justify-center hover:scale-[1.02] active:scale-100 transition-all"
              >
                Developer API & MCP
              </Link>
              <Link
                href="/docs"
                className="h-12 px-6 rounded-xl bg-card/30 hover:bg-card/50 border border-border/40 text-muted-foreground hover:text-foreground font-semibold flex items-center justify-center transition-all"
              >
                Documentation
              </Link>
            </div>
          </div>
        </section>

        {/* Live Market Overview */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-card/20 border-b border-border/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Live Market Benchmark Indices
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Real-time tracking of leading Indian financial benchmarks and equity indicators.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                { name: 'NIFTY 50', type: 'Benchmark', value: '+0.54%' },
                { name: 'NIFTY BANK', type: 'Banking', value: '+0.42%' },
                { name: 'NIFTY IT', type: 'Technology', value: '+0.88%' },
                { name: 'NIFTY PHARMA', type: 'Healthcare', value: '+0.31%' },
                { name: 'NIFTY AUTO', type: 'Automotive', value: '+0.65%' },
                { name: 'INDIA VIX', type: 'Volatility', value: '-1.85%' },
              ].map((idx) => (
                <div key={idx.name} className="p-4 rounded-xl border border-border/50 bg-card/50 flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">{idx.type}</span>
                  <span className="text-sm font-bold text-foreground mt-1">{idx.name}</span>
                  <span className={`text-sm font-semibold mt-2 ${idx.value.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {idx.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-border/30">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Core Capabilities & Asset Classes
              </h2>
              <p className="text-base text-muted-foreground">
                A unified architecture designed to monitor multi-asset wealth, calculate cash flows, and surface automated investment insights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg">
                  EQ
                </div>
                <h3 className="text-xl font-semibold text-foreground">Equities & Stock Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Real-time valuations for NSE and BSE equities. Monitor live price swings, absolute profit & loss, sector distributions, and historical price movements.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg">
                  FI
                </div>
                <h3 className="text-xl font-semibold text-foreground">Fixed Income & Bond Ladder</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Comprehensive tracking of corporate bonds, sovereign gold bonds, and treasury instruments. Track maturity schedules, coupon yields, and credit ratings.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg">
                  CF
                </div>
                <h3 className="text-xl font-semibold text-foreground">Cash Flow & Transactions</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Granular daily transaction ledgers. Automatically measure monthly burn rate, categorized expenses, and investment progress toward target goals.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card/40 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
                  AI
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI Market & Risk Insights</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automated portfolio synthesis powered by Google Gemini. Surface sector concentration risks, macroeconomic news sentiment, and portfolio health indicators.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Developer & Agent Ecosystem */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-card/20 border-b border-border/30">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Agentic & Developer Ecosystem
              </h2>
              <p className="text-base text-muted-foreground">
                Portfolio Dashboard is built from the ground up for both human investors and autonomous AI agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border/50 bg-card/50 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Model Context Protocol (MCP)</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect Claude, ChatGPT, Cursor, and Antigravity agents directly through our live Model Context Protocol server using Streamable HTTP transport and JSON-RPC 2.0.
                </p>
                <Link
                  href="/.well-known/mcp"
                  className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  View MCP Manifest →
                </Link>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card/50 space-y-4">
                <h3 className="text-lg font-bold text-foreground">OpenAPI 3.1.0 Specification</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fully typed OpenAPI 3.1.0 specifications with unique operation IDs, parameter typing, and JSON Schema definitions compatible with LLM function calling.
                </p>
                <div className="flex gap-4">
                  <Link href="/openapi.json" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    openapi.json →
                  </Link>
                  <Link href="/api/openapi.yaml" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    openapi.yaml →
                  </Link>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card/50 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Developer Portal & Sandbox</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Interactive quickstart guides for Python, TypeScript, and cURL, along with an integrated sandbox to test public market data endpoints immediately.
                </p>
                <Link
                  href="/developers"
                  className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Open Developer Portal →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Architecture */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Security, Privacy & Data Protection
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Your financial confidentiality is our foremost priority. Portfolio Dashboard operates entirely on read-only Google Sheets synchronization. We never ask for or store brokerage passwords or banking credentials. Built-in client-side privacy masking shields balances during presentation, and automated session monitors ensure inactive tabs disconnect securely.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm font-semibold">
              <Link href="/about" className="text-indigo-400 hover:text-indigo-300">About the Platform</Link>
              <span className="text-border">•</span>
              <Link href="/contact" className="text-indigo-400 hover:text-indigo-300">Contact & Support</Link>
              <span className="text-border">•</span>
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
              <span className="text-border">•</span>
              <Link href="/llms.txt" className="text-indigo-400 hover:text-indigo-300">Agent Instructions (llms.txt)</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-card/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/" className="hover:text-foreground">Home</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Developers</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/developers" className="hover:text-foreground">Developer Portal</Link></li>
                <li><Link href="/docs" className="hover:text-foreground">API Reference</Link></li>
                <li><Link href="/api/market-data" className="hover:text-foreground">Market Data API</Link></li>
                <li><Link href="/api/v1/summary" className="hover:text-foreground">Summary API</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Agent Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/openapi.json" className="hover:text-foreground">OpenAPI Spec (JSON)</Link></li>
                <li><Link href="/api/openapi.yaml" className="hover:text-foreground">OpenAPI Spec (YAML)</Link></li>
                <li><Link href="/.well-known/mcp" className="hover:text-foreground">Model Context Protocol</Link></li>
                <li><Link href="/llms.txt" className="hover:text-foreground">LLMs Instructions</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Legal & Discovery</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/sitemap.xml" className="hover:text-foreground">Sitemap</Link></li>
                <li><Link href="/robots.txt" className="hover:text-foreground">Robots.txt</Link></li>
                <li><span className="text-muted-foreground/60">Bengaluru, Karnataka</span></li>
                <li><span className="text-muted-foreground/60">support@portfolio-tracker.example.com</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
            <p>© 2026 Portfolio Dashboard. All rights reserved.</p>
            <p>Institutional personal investment tracking powered by Google Sheets & Next.js.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
