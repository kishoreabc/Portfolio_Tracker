'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, ShieldCheck, HelpCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { PortfolioHealthBreakdown, AIConfidence, ScoringWeights } from '@/types/insights';

interface HealthScoreBannerProps {
  breakdown?: PortfolioHealthBreakdown;
  confidence?: AIConfidence;
  weights?: ScoringWeights;
}

export function HealthScoreBanner({
  breakdown,
  confidence,
  weights,
}: HealthScoreBannerProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  if (!breakdown) return null;

  const score = Math.min(100, Math.max(0, breakdown.overall || 72));

  const getStatusColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400';
    if (val >= 65) return 'text-indigo-400';
    if (val >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getProgressColor = (val: number) => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 65) return 'bg-indigo-500';
    if (val >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStrokeColor = (val: number) => {
    if (val >= 80) return 'stroke-emerald-400';
    if (val >= 65) return 'stroke-indigo-400';
    if (val >= 50) return 'stroke-amber-400';
    return 'stroke-red-400';
  };

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const subScores = [
    { label: 'Fundamental', value: breakdown.fundamental, weight: weights?.fundamental ?? 0.25 },
    { label: 'Technical', value: breakdown.technical, weight: weights?.technical ?? 0.20 },
    { label: 'Risk Control', value: breakdown.risk, weight: weights?.risk ?? 0.20 },
    { label: 'Diversification', value: breakdown.diversification, weight: weights?.diversification ?? 0.15 },
    { label: 'Valuation', value: breakdown.valuation, weight: weights?.valuation ?? 0.10 },
  ];

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card via-card/80 to-indigo-950/20 backdrop-blur-md overflow-hidden relative shadow-lg">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <CardContent className="p-5 sm:p-7 space-y-6">
        {/* Top Header Row: Title & Subtitle + Confidence Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                AI Portfolio Intelligence V2
              </span>
              {confidence && (
                <div
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10"
                  title={confidence.reason}
                >
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  <span>Confidence: <strong className="text-foreground font-semibold">{confidence.level}</strong></span>
                </div>
              )}
            </div>
            <h1 className="text-h3 font-bold text-foreground tracking-tight mt-1.5">
              Overall Portfolio Health
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Data-driven multi-factor analysis of fundamentals, technicals, valuation, risk and macro conditions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowMethodology((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Scoring Methodology</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMethodology ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scoring Engine Details Dropdown */}
        {showMethodology && (
          <div className="p-4 rounded-xl bg-white/5 border border-border/50 text-xs text-muted-foreground space-y-2 animate-fade-in-up">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Application-Computed Scoring Engine (Non-LLM)</span>
            </div>
            <p className="leading-relaxed">
              {breakdown.methodology ||
                'Scores are computed in application backend code using actual portfolio telemetry. Weights: 25% Fundamental, 20% Technical, 20% Risk Control, 15% Diversification, 10% Valuation, 10% Performance.'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              {subScores.map((s, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-black/20 border border-white/5 text-center">
                  <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">{s.label}</span>
                  <span className="text-sm font-bold text-foreground">{s.value}</span>
                  <span className="text-[10px] text-indigo-400/80 block mt-0.5">({(s.weight * 100).toFixed(0)}% weight)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Central Score Section: Ring + Breakdown Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Ring & Status */}
          <div className="lg:col-span-4 flex items-center gap-5 sm:border-r sm:border-border/40 sm:pr-6">
            <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} className="stroke-white/10" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className={`${getStrokeColor(score)} transition-all duration-1000 ease-out`}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  style={{ strokeDasharray: circumference, strokeDashoffset: isNaN(offset) ? 0 : offset }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">{score}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">/ 100</span>
              </div>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 ${getStatusColor(score)}`}>
                  {breakdown.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {breakdown.summary || 'Strong portfolio fundamentals balancing equity growth with risk containment.'}
              </p>
            </div>
          </div>

          {/* Mini Progress Bars for 5 Sub-Pillars */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subScores.map((item, idx) => {
              const val = Math.min(100, Math.max(0, item.value || 0));
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-card/60 border border-border/40 hover:border-border transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className={`font-bold tabular-nums ${getStatusColor(val)}`}>
                      {val} <span className="text-[10px] text-muted-foreground font-normal">/ 100</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(val)} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                    <span>Impact: {(item.weight * 100).toFixed(0)}%</span>
                    <span>{val >= 75 ? 'Healthy' : val >= 50 ? 'Moderate' : 'Watch'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
