import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { reprocessArticle } from '@/lib/news/sync';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idString } = await params;
  const id = parseInt(idString, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await reprocessArticle(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[api/news/${id}/reprocess] POST Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
