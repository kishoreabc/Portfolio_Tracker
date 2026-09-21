import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';

export const metadata = {
  title: 'Contact Portfolio Dashboard — Support, Inquiries & Security',
  description: 'Get in touch with the Portfolio Dashboard team. Support channels, developer contacts, business hours, and office address in Bengaluru.',
};

export default function ContactPage() {
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
            Get in Touch
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Contact Portfolio Dashboard
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Have questions about portfolio configuration, API access, enterprise features, or security disclosures? Our engineering and support teams are here to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Direct Channels */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Direct Contact Information
            </h2>

            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Customer & Investor Support</p>
                <a href="mailto:support@portfolio-tracker.example.com" className="text-base font-medium text-indigo-400 hover:underline">
                  support@portfolio-tracker.example.com
                </a>
              </div>

              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Developer & API Integration</p>
                <a href="mailto:tech@portfolio-tracker.example.com" className="text-base font-medium text-indigo-400 hover:underline">
                  tech@portfolio-tracker.example.com
                </a>
              </div>

              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Phone Support</p>
                <p className="text-base font-medium text-foreground">+1-800-555-0199</p>
                <p className="text-xs text-muted-foreground">Toll-free, Mon–Fri 9:00 AM – 6:00 PM IST</p>
              </div>

              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Postal Address & Headquarters</p>
                <p className="text-foreground font-medium mt-1">Portfolio Dashboard</p>
                <p className="text-muted-foreground">100 Financial Way</p>
                <p className="text-muted-foreground">Bengaluru, Karnataka 560001, India</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border/50 bg-card/40 space-y-2 text-sm">
              <h3 className="font-bold text-foreground">Responsible Security Disclosure</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                If you believe you have discovered a vulnerability or security risk, please notify us confidentially at <a href="mailto:security@portfolio-tracker.example.com" className="text-indigo-400 hover:underline">security@portfolio-tracker.example.com</a>. We acknowledge and investigate all verified reports within 24 hours.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card/50 space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Send an Inquiry
            </h2>
            <form className="space-y-4" action="#" method="POST">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your Name"
                  className="w-full h-11 px-3.5 rounded-xl bg-background/60 border border-border/60 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-background/60 border border-border/60 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="subject" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                <input
                  id="subject"
                  type="text"
                  placeholder="Inquiry Topic"
                  className="w-full h-11 px-3.5 rounded-xl bg-background/60 border border-border/60 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Describe your question or integration requirement..."
                  className="w-full p-3.5 rounded-xl bg-background/60 border border-border/60 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/20"
              >
                Submit Inquiry
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/10 text-center text-xs text-muted-foreground">
        <p>© 2026 Portfolio Dashboard. All rights reserved. • <Link href="/privacy" className="hover:underline">Privacy Policy</Link> • <Link href="/about" className="hover:underline">About</Link> • <Link href="/developers" className="hover:underline">Developers</Link></p>
      </footer>
    </div>
  );
}
