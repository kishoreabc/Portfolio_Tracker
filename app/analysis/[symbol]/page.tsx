import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ResearchPageClient } from './ResearchPageClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  return {
    title: `${upper} Stock Research | Portfolio Tracker`,
    description: `Fundamental analysis, financial statements, ratios, shareholding, and peer comparison for ${upper} (NSE/BSE).`,
  };
}

export default async function AnalysisPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return <ResearchPageClient symbol={upperSymbol} />;
}
