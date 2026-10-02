'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import appLogo from '@/app/icon.png';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import LoginBackground from '@/components/auth/LoginBackground';

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const isExpired = searchParams ? searchParams.get('expired') === 'true' : false;
  const error = searchParams ? searchParams.get('error') : null;

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    } else if (status === 'unauthenticated') {
      localStorage.removeItem('portfolio-session-start');
    }
  }, [status, router]);

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    localStorage.removeItem('portfolio-session-start');
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-8 relative overflow-hidden">
      <LoginBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10 my-auto"
      >
        {/* Glassmorphism Card */}
        <div
          className={`bg-card/40 backdrop-blur-2xl border ${
            error
              ? 'border-rose-500/30 shadow-[0_8px_32px_0_rgba(244,63,94,0.12)]'
              : isExpired
                ? 'border-amber-500/30 shadow-[0_8px_32px_0_rgba(245,158,11,0.12)]'
                : 'border-border/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]'
          } rounded-3xl p-8 transition-all duration-300`}
        >
          <div className="flex flex-col space-y-2 text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/20 overflow-hidden">
              <Image
                src={appLogo}
                alt="Portfolio Dashboard Logo"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Portfolio Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your Google account to access your investment portfolio
            </p>
          </div>

          <div className="grid gap-6">
            {isExpired && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-lg shadow-amber-500/10 backdrop-blur-md"
                role="alert"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/25 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300 shadow-sm shadow-amber-500/20">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">
                    Session Expired
                  </span>
                  <span className="text-amber-200/90 text-xs font-medium leading-relaxed mt-0.5">
                    Your session has expired. Please sign in again to continue.
                  </span>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 shadow-lg shadow-rose-500/10 backdrop-blur-md"
                role="alert"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/25 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-300 shadow-sm shadow-rose-500/20">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-rose-300 text-xs font-semibold uppercase tracking-wider">
                    Authentication Notice
                  </span>
                  <span className="text-rose-200/90 text-xs font-medium leading-relaxed mt-0.5">
                    Authentication could not be completed. Please try again.
                  </span>
                </div>
              </motion.div>
            )}

            <Button
              type="button"
              disabled={isLoading}
              onClick={handleLogin}
              className="h-12 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-100 border-0 cursor-pointer flex items-center justify-center gap-3 text-sm"
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
              <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Visually hidden for screen readers and search crawlers */}
      <footer className="sr-only">
        <nav aria-label="Footer navigation">
          <Link href="/developers">Developer Portal</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/openapi.json">OpenAPI Spec</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/sitemap.xml">Sitemap</Link>
        </nav>

        <section aria-label="Platform Overview">
          <h2>Institutional Wealth & Multi-Asset Intelligence</h2>
          <p>
            Portfolio Dashboard provides unified portfolio tracking across Indian equities (NSE & BSE), corporate bonds, sovereign debt securities, daily cash flow ledgers, and AI market synthesis.
          </p>
          <p>
            Equipped with real-time benchmark index monitoring for NIFTY 50 and NIFTY BANK, Model Context Protocol (MCP) server integration, and read-only Google Sheets synchronization.
          </p>
        </section>
      </footer>
    </div>
  );
}

function SignInFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-sm rounded-3xl border border-border/50 bg-card/40 p-8 text-center space-y-4 my-auto">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-2 overflow-hidden">
          <Image
            src={appLogo}
            alt="Portfolio Dashboard Logo"
            width={64}
            height={64}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Portfolio Dashboard
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sign in to access your investment portfolio, real-time equities, corporate bonds, and AI insights.
        </p>
        <div className="h-12 rounded-xl bg-white/5" />
        <div className="h-12 rounded-xl bg-white/5" />
        <div className="h-12 rounded-xl bg-indigo-500/20" />
      </div>

      <footer className="sr-only">
        <nav aria-label="Footer navigation">
          <Link href="/developers">Developer Portal</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/openapi.json">OpenAPI Spec</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <section aria-label="Platform Overview">
          <h2>Institutional Wealth & Multi-Asset Intelligence</h2>
          <p>
            Portfolio Dashboard provides unified portfolio tracking across Indian equities (NSE & BSE), corporate bonds, sovereign debt securities, daily cash flow ledgers, and AI market synthesis.
          </p>
        </section>
      </footer>
    </div>
  );
}

export default function SignInView() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
