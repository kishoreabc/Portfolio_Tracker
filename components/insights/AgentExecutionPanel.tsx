'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Globe,
  TrendingUp,
  Sparkles,
  RotateCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Activity,
  ChevronRight,
  FileCheck,
  Target,
  Compass,
} from 'lucide-react';
import {
  type PipelineState,
  type AgentId,
} from '@/types/agent-activity';
import { usePrivacy, maskSensitiveText, maskInsightsData } from '@/lib/privacy-context';

interface AgentExecutionPanelProps {
  pipelineState: PipelineState;
  isExecuting: boolean;
  hasCompleted: boolean;
}

const AGENT_META: Record<
  AgentId,
  { name: string; role: string; icon: React.ElementType; color: string; bg: string; defaultStage: string }
> = {
  portfolio_analyst: {
    name: 'Portfolio Analyst',
    role: 'Quantitative & Concentration Evaluator',
    icon: Brain,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    defaultStage: 'Calculating portfolio concentration & HHI risk metrics...',
  },
  macro_market_analyst: {
    name: 'Macro & Market Analyst',
    role: 'Live Grounding & Web Scraping Engine',
    icon: Globe,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    defaultStage: 'Grounding analysis with live market quotes & headlines...',
  },
  risk_strategy_engine: {
    name: 'Risk & Strategy Engine',
    role: 'Scenario Forecaster & Threat Modeler',
    icon: TrendingUp,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    defaultStage: 'Running downside & stress scenario simulations...',
  },
  synthesis_director: {
    name: 'Synthesis Director',
    role: 'Chief Intelligence & Report Assembly',
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    defaultStage: 'Synthesizing final SEBI-grade intelligence report...',
  },
};

const AGENT_ORDER: AgentId[] = [
  'portfolio_analyst',
  'macro_market_analyst',
  'risk_strategy_engine',
  'synthesis_director',
];

export function AgentExecutionPanel({
  pipelineState,
  isExecuting,
  hasCompleted,
}: AgentExecutionPanelProps) {
  const { isHidden } = usePrivacy();

  // If not executing (completed or idle), do not show the activity indicator
  if (!isExecuting || hasCompleted) {
    return null;
  }

  // Identify the SINGLE currently running agent
  const runningAgentId: AgentId =
    AGENT_ORDER.find((id) => pipelineState.agents[id]?.status === 'running') ||
    pipelineState.activeAgent ||
    AGENT_ORDER[0];

  const agentState = pipelineState.agents[runningAgentId];
  const meta = AGENT_META[runningAgentId] || AGENT_META.portfolio_analyst;
  const Icon = meta.icon;

  const currentStageText = maskSensitiveText(
    agentState?.currentStage ||
    agentState?.activities?.slice(-1)[0]?.title ||
    meta.defaultStage,
    isHidden
  );

  const latestEvent = agentState?.activities?.slice(-1)[0];
  const currentTelemetry = maskSensitiveText(
    latestEvent?.description ||
    agentState?.currentActivity ||
    agentState?.currentStage ||
    meta.defaultStage,
    isHidden
  );
  const currentTool = latestEvent?.tool;
  const data = isHidden && agentState?.structuredData
    ? maskInsightsData(agentState.structuredData, true)
    : agentState?.structuredData;

  const activeIndex = AGENT_ORDER.indexOf(runningAgentId) + 1;

  return (
    <div className="w-full my-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={runningAgentId}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-card/90 to-purple-950/40 backdrop-blur-md p-4 sm:p-5 shadow-2xl shadow-indigo-500/5 ring-1 ring-indigo-500/20 overflow-hidden"
        >
          {/* Subtle animated background glow accent */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* ─── Top Header: Active Agent & Streaming Indicator ─────────────── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Pulsing agent icon */}
              <div className="relative flex items-center justify-center flex-shrink-0">
                <span className="absolute inline-flex h-9 w-9 animate-ping rounded-xl bg-indigo-500/25 opacity-40" />
                <div className={`p-2.5 rounded-xl border ${meta.bg} flex items-center justify-center shadow-inner`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Agent Name & Real-Time Operational Stage */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 tracking-tight">
                    <span className="text-indigo-400">✦</span>
                    {meta.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground border border-white/10">
                    Agent {activeIndex}/4
                  </span>
                </div>

                {/* Current Stage Description */}
                <motion.p
                  key={currentStageText}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground mt-0.5 font-normal truncate"
                >
                  {currentStageText}
                </motion.p>
              </div>
            </div>

            {/* Right-hand Live Status Pulse & Tool Badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentTool && (
                <div className="hidden sm:flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-muted-foreground">
                  <Cpu className="w-3 h-3 text-indigo-400" />
                  <span className="font-mono">{currentTool}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium shadow-sm">
                <RotateCw className="w-3 h-3 animate-spin text-indigo-400" />
                <span>Streaming live...</span>
              </div>
            </div>
          </div>

          {/* ─── STREAMED INTERMEDIATE AGENT OUTPUTS ─────────────────────────── */}
          <div className="mt-3.5 pt-3 border-t border-white/10 space-y-3">
            {/* Live Operational Action / Stage Banner */}
            {currentTelemetry && (
              <motion.div
                key={currentTelemetry}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-black/40 border border-indigo-500/20 text-xs shadow-inner"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-300/90">
                      Live Operational Stream:
                    </span>
                    {latestEvent?.type && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        {latestEvent.type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-foreground font-mono leading-relaxed break-words">
                    {currentTelemetry}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                1. AGENT 1: PORTFOLIO ANALYSER OUTPUT STREAM
               ══════════════════════════════════════════════════════════════════ */}
            {runningAgentId === 'portfolio_analyst' && data && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
                {/* Health Score & Summary */}
                {data.healthSummary && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                        Portfolio Health Score:
                        <span className="text-indigo-400 font-mono">{data.healthScore}/100</span>
                        <span className="px-1.5 py-0.2 text-[10px] rounded bg-indigo-500/20 text-indigo-300 font-medium">
                          {data.healthStatus}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {data.healthSummary}
                    </p>
                  </div>
                )}

                {/* Health Assessment Reasons */}
                {data.healthReasons && data.healthReasons.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Core Diagnoses & Vulnerabilities:
                    </span>
                    <ul className="space-y-1 text-xs text-foreground/90">
                      {data.healthReasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                          <span className="text-amber-400 font-bold mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths & Weaknesses Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.topStrengths && data.topStrengths.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Portfolio Strengths
                      </span>
                      {data.topStrengths.map((str, i) => (
                        <p key={i} className="text-[11px] text-foreground/90 leading-tight">
                          • {str}
                        </p>
                      ))}
                    </div>
                  )}
                  {data.topWeaknesses && data.topWeaknesses.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Core Weaknesses
                      </span>
                      {data.topWeaknesses.map((wk, i) => (
                        <p key={i} className="text-[11px] text-foreground/90 leading-tight">
                          • {wk}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                2. AGENT 2: MACRO & MARKET ANALYST OUTPUT STREAM
               ══════════════════════════════════════════════════════════════════ */}
            {runningAgentId === 'macro_market_analyst' && data && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
                {/* Live Indices Ticker Bar */}
                {data.marketQuotes && (
                  <div className="p-2.5 rounded-xl bg-blue-950/25 border border-blue-500/30 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1 whitespace-nowrap">
                      <Activity className="w-3 h-3 animate-pulse" /> Live Market Ticker:
                    </span>
                    <span className="text-[11px] font-mono text-foreground font-semibold truncate">
                      {data.marketQuotes}
                    </span>
                  </div>
                )}

                {/* News Section Ingestion Card */}
                {Boolean(data.newsSectionCount && data.newsSectionCount > 0) && (
                  <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="w-3 h-3 text-purple-400" /> Synced News Section Feeds ({data.newsSectionCount} Articles)
                    </span>
                    {data.newsSectionHeadlines && data.newsSectionHeadlines.length > 0 && (
                      <div className="space-y-0.5">
                        {data.newsSectionHeadlines.slice(0, 2).map((headline, i) => (
                          <p key={i} className="text-[10.5px] text-muted-foreground truncate leading-tight">
                            • {headline}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Market Summary & Status */}
                {data.marketSummary && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Market Stance:</span>
                      <span className="px-1.5 py-0.2 text-[10px] rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                        {data.marketStatus || 'Active'}
                      </span>
                      {data.niftyTrend && (
                        <span className="text-[11px] font-mono text-muted-foreground truncate">
                          ({data.niftyTrend})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {data.marketSummary}
                    </p>
                  </div>
                )}

                {/* Key Drivers */}
                {data.keyDrivers && data.keyDrivers.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Macro & Policy Drivers:
                    </span>
                    <ul className="space-y-1 text-xs text-foreground/90">
                      {data.keyDrivers.map((driver, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                          <span className="text-blue-400 font-bold mt-0.5">•</span>
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sector Outlook Grid */}
                {data.sectorOutlook && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(data.sectorOutlook).map(([sector, outlook], i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                        <span className="text-[10px] font-bold text-indigo-300 block mb-0.5">
                          {sector} Sector:
                        </span>
                        <p className="text-[10.5px] text-muted-foreground leading-tight line-clamp-2">
                          {outlook}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                3. AGENT 3: RISK & STRATEGY ENGINE OUTPUT STREAM
               ══════════════════════════════════════════════════════════════════ */}
            {runningAgentId === 'risk_strategy_engine' && data && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
                {/* Opportunities & Risks Stream */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opportunities */}
                  {data.opportunities && data.opportunities.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> High-Conviction Opportunities
                      </span>
                      {data.opportunities.slice(0, 2).map((opp, i) => (
                        <div key={i} className="text-xs space-y-0.5 border-b border-emerald-500/10 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-foreground text-[11px] truncate">{opp.title}</span>
                            <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              {opp.priority}
                            </span>
                          </div>
                          {opp.actionable && (
                            <p className="text-[10.5px] text-emerald-200/80 leading-tight">
                              → {opp.actionable}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Risks */}
                  {data.risks && data.risks.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Critical Vulnerabilities
                      </span>
                      {data.risks.slice(0, 2).map((risk, i) => (
                        <div key={i} className="text-xs space-y-0.5 border-b border-rose-500/10 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-foreground text-[11px] truncate">{risk.title}</span>
                            <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300 font-mono">
                              {risk.severity}
                            </span>
                          </div>
                          {risk.mitigation && (
                            <p className="text-[10.5px] text-rose-200/80 leading-tight">
                              🛡️ {risk.mitigation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Probabilistic Stress Scenarios Grid (Bull / Base / Bear) */}
                {(data.scenarios || data.marketOutlook?.scenarios) && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" /> Stress Test Sensitivity Simulation Matrix:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(data.scenarios || data.marketOutlook?.scenarios || []).map((sc, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border text-center space-y-0.5 ${
                            i === 0
                              ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                              : i === 1
                              ? 'bg-blue-950/25 border-blue-500/30 text-blue-300'
                              : 'bg-rose-950/25 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-tight">
                            {i === 0 ? <ArrowUpRight className="w-3 h-3" /> : i === 2 ? <TrendingDown className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                            <span className="truncate">{sc.name.split(' ')[0]} Case</span>
                          </div>
                          <span className="text-sm font-bold block">{sc.impact}</span>
                          <span className="text-[9.5px] opacity-75 block font-mono">
                            {sc.probability} probability
                          </span>
                          {sc.description && (
                            <p className="text-[9.5px] text-muted-foreground line-clamp-2 pt-0.5 text-left leading-tight opacity-90">
                              {sc.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Roadmap */}
                {data.recommendations && data.recommendations.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-indigo-400" /> Actionable Execution Roadmap:
                    </span>
                    <div className="space-y-1">
                      {data.recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-[11px] p-1.5 rounded-lg bg-white/[0.02]">
                          <span className="font-medium text-foreground truncate">{rec.title}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {rec.timeframe && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground font-mono">
                                {rec.timeframe}
                              </span>
                            )}
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                              {rec.priority || 'High'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                4. AGENT 4: SYNTHESIS DIRECTOR OUTPUT STREAM
               ══════════════════════════════════════════════════════════════════ */}
            {runningAgentId === 'synthesis_director' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    Compiling Executive Intelligence Dossier
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                    SEBI Compliant
                  </span>
                </div>
                <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                  Reconciling quantitative risk scores, real-time market data grounding, and strategic rebalancing steps into the publication-grade executive report...
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
