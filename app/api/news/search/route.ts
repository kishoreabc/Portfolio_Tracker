import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { keywordSearch, semanticSearch } from '@/lib/news/search';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const isSemantic = searchParams.get('semantic') === 'true';
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  if (!query) {
    return NextResponse.json({ articles: [] });
  }

  try {
    const results = isSemantic
      ? await semanticSearch(query, 0.65, limit)
      : await keywordSearch(query, limit);

    return NextResponse.json({ articles: results });
  } catch (error) {
    console.error('[api/news/search] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
