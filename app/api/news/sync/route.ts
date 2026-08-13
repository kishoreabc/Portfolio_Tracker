import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncNews } from '@/lib/news/sync';

export async function POST(request: NextRequest) {
  // Only allow execution via authenticated user session
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const portfolioCompanies = body.portfolioCompanies || [];
    
    // In a real scenario, you might fetch portfolio symbols from Google Sheets 
    // here if triggered by cron and not passing them in the body.
    // For now, we take them from the body if triggered from the UI.
    
    const result = await syncNews(portfolioCompanies);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/news/sync] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
