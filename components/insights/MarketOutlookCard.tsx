import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Compass } from 'lucide-react';
import type { MarketOutlook, MarketScenario } from '@/types/insights';

function parseNumericProbability(prob: number | string | undefined, defaultVal = 33): number {
  if (typeof prob === 'number' && !isNaN(prob)) return prob;
  if (typeof prob === 'string') {
    const num = parseFloat(prob.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) return num;
  }
  return defaultVal;
}

function ScenarioCard({
  scenario,
  accent,
  icon,
  defaultTitle,
}: {
  scenario: MarketScenario;
  accent: { text: string; bg: string; border: string; prob: string };
  icon: string;
  defaultTitle: string;
}) {
  const title = scenario.label || scenario.name || defaultTitle;
  const probNum = parseNumericProbability(scenario.probability);
  const returns = scenario.expectedReturn || scenario.impact || '';
  const trigger = scenario.trigger || scenario.description || '';
  const impactText = scenario.portfolioImpact || '';

  return (
    <div className={`p-4 rounded-xl border ${accent.border} ${accent.bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <span>{icon}</span>
          {title}
        </span>
        <div className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${accent.prob}`}>
          {probNum}%
        </div>
      </div>
      {returns && (
        <p className="text-base font-bold tabular-nums text-foreground">{returns}</p>
      )}
      {trigger && (
        <p className="text-xs text-muted-foreground leading-relaxed">{trigger}</p>
      )}
      {impactText && impactText !== returns && (
        <p className="text-xs text-foreground/75 italic">{impactText}</p>
      )}
    </div>
  );
}

export function MarketOutlookCard({ data }: { data?: MarketOutlook }) {
  if (!data) return null;

  const bullAccent = { text: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', prob: 'bg-emerald-500/20 text-emerald-400' };
  const baseAccent = { text: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20', prob: 'bg-blue-500/20 text-blue-400' };
  const bearAccent = { text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20', prob: 'bg-red-500/20 text-red-400' };

  // Normalize scenarios: extract bull, base, bear from either object keys or scenarios array
  let bullScenario: MarketScenario | undefined = data.bull;
  let baseScenario: MarketScenario | undefined = data.base;
  let bearScenario: MarketScenario | undefined = data.bear;

  if (Array.isArray(data.scenarios) && data.scenarios.length > 0) {
    for (const sc of data.scenarios) {
      const name = (sc.name || sc.label || '').toLowerCase();
      if (!bullScenario && (name.includes('bull') || name.includes('optimistic') || name.includes('rally'))) {
        bullScenario = sc;
      } else if (!bearScenario && (name.includes('bear') || name.includes('pessimistic') || name.includes('correction') || name.includes('crash'))) {
        bearScenario = sc;
      } else if (!baseScenario) {
        baseScenario = sc;
      }
    }

    // Fallback if specific matching didn't fill all slots
    if (!bullScenario && data.scenarios[0]) bullScenario = data.scenarios[0];
    if (!baseScenario && data.scenarios[1]) baseScenario = data.scenarios[1];
    if (!bearScenario && data.scenarios[2]) bearScenario = data.scenarios[2];
  }

  const bullProb = parseNumericProbability(bullScenario?.probability, 25);
  const baseProb = parseNumericProbability(baseScenario?.probability, 55);
  const bearProb = parseNumericProbability(bearScenario?.probability, 20);

  const sentimentColorMap: Record<string, string> = {
    Bullish: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Cautious: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Neutral: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Bearish: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const sentimentStyle = data.sentiment ? sentimentColorMap[data.sentiment] ?? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <CardTitle className="text-h4">Market Outlook & Scenarios</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {data.sentiment && (
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${sentimentStyle}`}>
              {data.sentiment}
            </span>
          )}
          {data.horizon && (
            <span className="text-[10px] text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              {data.horizon}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Short-term and Medium-term commentaries */}
        {(data.shortTerm || data.mediumTerm) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.shortTerm && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                <p className="text-[11px] font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Short-Term Horizon (1–3 Months)
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{data.shortTerm}</p>
              </div>
            )}
            {data.mediumTerm && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                <p className="text-[11px] font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  Medium-Term Horizon (6–12 Months)
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{data.mediumTerm}</p>
              </div>
            )}
          </div>
        )}

        {/* 3 Scenario Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {bullScenario && <ScenarioCard scenario={bullScenario} accent={bullAccent} icon="🐂" defaultTitle="Bull Case" />}
          {baseScenario && <ScenarioCard scenario={baseScenario} accent={baseAccent} icon="📊" defaultTitle="Base Case" />}
          {bearScenario && <ScenarioCard scenario={bearScenario} accent={bearAccent} icon="🐻" defaultTitle="Bear Case" />}
        </div>

        {/* Probability bar */}
        {(bullScenario || baseScenario || bearScenario) && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Scenario probability distribution</p>
            <div className="flex h-2 rounded-full overflow-hidden w-full bg-white/5">
              <div className="bg-emerald-500" style={{ width: `${bullProb}%` }} />
              <div className="bg-blue-500" style={{ width: `${baseProb}%` }} />
              <div className="bg-red-500" style={{ width: `${bearProb}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="text-emerald-400">Bull {bullProb}%</span>
              <span className="text-blue-400">Base {baseProb}%</span>
              <span className="text-red-400">Bear {bearProb}%</span>
            </div>
          </div>
        )}

        {data.recommendation && (
          <div className="px-3 py-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <p className="text-xs text-indigo-300 leading-relaxed">📋 <strong>Stance:</strong> {data.recommendation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
