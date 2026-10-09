import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ResearchPageClient } from '@/app/analysis/[symbol]/ResearchPageClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  return {
    title: `${upper} Fundamental Stock Analysis & Financials | Portfolio Tracker`,
    description: `Detailed Screener-grade fundamental analysis, quarterly results, 10-year P&L, balance sheet, ratios, shareholding patterns, and peer comparisons for ${upper} (NSE/BSE).`,
  };
}

export default async function StockAnalysisSymbolPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return <ResearchPageClient symbol={upperSymbol} />;
}
