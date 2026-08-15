import { NextRequest, NextResponse } from 'next/server';
import { syncNews } from '@/lib/news/sync';

// Set max duration to 60 seconds (Maximum allowed on Vercel Hobby Tier)
export const maxDuration = 60;

// This endpoint is designed to be called by a Cron Job (e.g. Vercel Cron)
// It uses GET because Vercel Crons send GET requests by default.
export async function GET(request: NextRequest) {
  // Secure the endpoint so only authorized cron schedulers can trigger it
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    // Since this runs in the background automatically, we don't have a user session
    // to pass specific portfolio companies. It will fetch standard general news.
    const result = await syncNews([]);
    
    return NextResponse.json({
      success: true,
      message: `Cron sync completed. ${result.newArticles} new articles added.`,
      result
    });
  } catch (error) {
    console.error('[cron/news/sync] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during cron sync' },
      { status: 500 }
    );
  }
}
