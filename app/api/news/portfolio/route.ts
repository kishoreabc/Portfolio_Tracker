import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPortfolioNews } from '@/lib/news/search';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '30', 10);

  try {
    const articles = await getPortfolioNews(limit);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error('[api/news/portfolio] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
