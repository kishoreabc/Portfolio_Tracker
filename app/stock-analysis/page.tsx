import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { StockAnalysisLandingClient } from './StockAnalysisLandingClient';

export const metadata: Metadata = {
  title: 'Stock Research & Fundamental Analysis | Portfolio Tracker',
  description:
    'Screener-style stock research, financial statements, ratios, shareholding patterns, and peer comparisons for Indian listed companies (NSE/BSE).',
};

export default async function StockAnalysisPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <StockAnalysisLandingClient />;
}
