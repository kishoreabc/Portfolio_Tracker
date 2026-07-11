import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function AISummaryCard({ data }: { data?: string }) {
  if (!data) return null;

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-purple-950/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-indigo-400" />
      </div>
      <CardContent className="p-6 relative z-10 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0 mt-1">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h4 className="text-body font-bold text-indigo-300 mb-1.5 uppercase tracking-wider text-xs">Executive Summary</h4>
          <p className="text-[15px] leading-relaxed text-foreground/90 font-medium">{data}</p>
        </div>
      </CardContent>
    </Card>
  );
}
