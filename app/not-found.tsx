import Link from 'next/link';
import LoginBackground from '@/components/auth/LoginBackground';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <LoginBackground />

      <div className="max-w-md w-full space-y-6 bg-card/40 border border-border/50 p-8 rounded-3xl backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 text-2xl font-bold shadow-lg shadow-indigo-500/10">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Resource Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The requested page or resource does not exist on Portfolio Dashboard.
          </p>
        </div>

        <div className="text-left border-t border-border/40 pt-4 space-y-2 text-xs">
          <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Available Discovery Resources:
          </p>
          <ul className="space-y-1.5 text-indigo-400 font-medium">
            <li><Link href="/" className="hover:underline">Home (/) →</Link></li>
            <li><Link href="/developers" className="hover:underline">Developer Portal (/developers) →</Link></li>
            <li><Link href="/docs" className="hover:underline">API Reference (/docs) →</Link></li>
            <li><Link href="/openapi.json" className="hover:underline">OpenAPI 3.1.0 Spec (/openapi.json) →</Link></li>
            <li><Link href="/llms.txt" className="hover:underline">Agent Instructions (/llms.txt) →</Link></li>
            <li><Link href="/sitemap.xml" className="hover:underline">Sitemap (/sitemap.xml) →</Link></li>
          </ul>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/25 cursor-pointer hover:scale-[1.02] active:scale-100"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
