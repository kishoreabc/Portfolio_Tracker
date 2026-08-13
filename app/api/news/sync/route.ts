import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncNews } from '@/lib/news/sync';

export async function POST(request: NextRequest) {
  // Allow execution via Vercel cron OR authenticated user session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  let isAuthorized = false;
  
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  } else {
    const session = await auth();
    if (session) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const portfolioSymbols = body.portfolioSymbols || [];
    
    // In a real scenario, you might fetch portfolio symbols from Google Sheets 
    // here if triggered by cron and not passing them in the body.
    // For now, we take them from the body if triggered from the UI.
    
    const result = await syncNews(portfolioSymbols);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/news/sync] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
