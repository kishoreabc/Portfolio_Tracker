import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, CheckCircle2 } from 'lucide-react';

export function RecommendationsCard({ data }: { data?: string[] }) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-4 flex flex-row items-center gap-2">
        <Target className="w-5 h-5 text-indigo-400" />
        <CardTitle className="text-h4">Actionable Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {data.map((rec, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90 leading-relaxed">{rec}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
