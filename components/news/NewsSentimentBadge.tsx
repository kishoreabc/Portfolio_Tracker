import { cn } from '@/lib/utils';
import type { NewsSentiment } from '@/types/news';

export function NewsSentimentBadge({ sentiment, className }: { sentiment: NewsSentiment | null; className?: string }) {
  if (!sentiment) return null;
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        sentiment === 'positive' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        sentiment === 'negative' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
        sentiment === 'mixed' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
        sentiment === 'neutral' && "bg-slate-500/10 text-slate-400 border-slate-500/20",
        className
      )}
    >
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}
