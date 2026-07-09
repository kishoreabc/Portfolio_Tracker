import { NextRequest, NextResponse } from 'next/server';
import { fetchAllSheetData } from '@/lib/sheets/fetcher';

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';

  try {
    const data = await fetchAllSheetData(force);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Last-Fetched': data.meta.lastFetched,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/sheets] Error:', message);
    return NextResponse.json(
      { error: message, meta: { lastFetched: null, tabs: [], errors: [message] } },
      { status: 500 }
    );
  }
}
