import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNews } from '@/lib/news/search';
import type { NewsFilters } from '@/types/news';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  const filters: NewsFilters = {
    page: parseInt(searchParams.get('page') ?? '1', 10),
    limit: parseInt(searchParams.get('limit') ?? '20', 10),
    category: searchParams.get('category') ?? undefined,
    language: searchParams.get('language') ?? undefined,
    sentiment: searchParams.get('sentiment') as NewsFilters['sentiment'] ?? undefined,
    impact: searchParams.get('impact') as NewsFilters['impact'] ?? undefined,
    portfolioRelevant: searchParams.has('portfolioRelevant') 
      ? searchParams.get('portfolioRelevant') === 'true' 
      : undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  };

  try {
    const data = await getNews(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/news] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
