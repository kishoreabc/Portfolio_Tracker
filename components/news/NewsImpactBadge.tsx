import { cn } from '@/lib/utils';
import type { NewsImpact } from '@/types/news';

export function NewsImpactBadge({ impact, className }: { impact: NewsImpact | null; className?: string }) {
  if (!impact) return null;
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        impact === 'high' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
        impact === 'medium' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
        impact === 'low' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        className
      )}
    >
      {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
    </span>
  );
}
