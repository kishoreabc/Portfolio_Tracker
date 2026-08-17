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
  Activity,
  Layers,
} from 'lucide-react';
import {
  type PipelineState,
  type AgentId,
} from '@/types/agent-activity';

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

  const currentStageText =
    agentState?.currentStage ||
    agentState?.activities?.slice(-1)[0]?.title ||
    meta.defaultStage;

  const latestEvent = agentState?.activities?.slice(-1)[0];
  const currentTelemetry = latestEvent?.description;
  const currentTool = latestEvent?.tool;
  const structuredData = agentState?.structuredData;

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
          className="relative rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-card/85 to-purple-950/35 backdrop-blur-md p-4 sm:p-5 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/20 overflow-hidden"
        >
          {/* Subtle animated background glow accent */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Active Agent & Thinking Pulse */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Spinning/pulsing agent icon */}
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
                <span>Streaming...</span>
              </div>
            </div>
          </div>

          {/* ─── STREAMED STRUCTURED DATA CARDS ─────────────────────────────────── */}
          <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2.5">
            {/* 1. Live Telemetry / Description Stream */}
            {currentTelemetry && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-black/35 border border-white/5 text-xs">
                <Activity className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-300/80 block mb-0.5">
                    Live Operational Stream:
                  </span>
                  <p className="text-[11.5px] text-foreground/90 font-mono leading-relaxed break-words">
                    {currentTelemetry}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Agent 1: Quantitative Findings (Score & Strengths/Weaknesses) */}
            {runningAgentId === 'portfolio_analyst' && structuredData && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {structuredData.strengths && structuredData.strengths.length > 0 && (
                  <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3" /> Key Strength
                    </span>
                    <p className="text-[11px] text-foreground/90 leading-tight">
                      {structuredData.strengths[0]}
                    </p>
                  </div>
                )}
                {structuredData.weaknesses && structuredData.weaknesses.length > 0 && (
                  <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs">
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" /> Concentration Area
                    </span>
                    <p className="text-[11px] text-foreground/90 leading-tight">
                      {structuredData.weaknesses[0]}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. Agent 2: Live Market Ticker & Headlines */}
            {runningAgentId === 'macro_market_analyst' && structuredData && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {structuredData.marketQuotes && (
                  <div className="p-2 rounded-lg bg-blue-950/20 border border-blue-500/20 flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-bold text-blue-400 whitespace-nowrap">
                      📊 Indices:
                    </span>
                    <span className="text-[11px] font-mono text-foreground/90 truncate">
                      {structuredData.marketQuotes}
                    </span>
                  </div>
                )}
                {structuredData.topHeadline && (
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-bold text-indigo-300 whitespace-nowrap">
                      📰 Tavily News:
                    </span>
                    <span className="text-[11px] text-muted-foreground italic truncate">
                      &quot;{structuredData.topHeadline}&quot;
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. Agent 3: Opportunities, Risks & Stress Scenarios */}
            {runningAgentId === 'risk_strategy_engine' && structuredData && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {/* Opportunities & Risks row */}
                {(structuredData.opportunities || structuredData.risks) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {structuredData.opportunities && structuredData.opportunities.length > 0 && (
                      <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
                          <Flame className="w-3 h-3" /> Top Opportunity
                        </span>
                        <span className="text-[11px] text-foreground font-medium block truncate">
                          {structuredData.opportunities[0].title}
                        </span>
                      </div>
                    )}
                    {structuredData.risks && structuredData.risks.length > 0 && (
                      <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20">
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 mb-0.5">
                          <ShieldAlert className="w-3 h-3" /> Key Threat
                        </span>
                        <span className="text-[11px] text-foreground font-medium block truncate">
                          {structuredData.risks[0].title}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Probabilistic Scenarios Grid */}
                {structuredData.scenarios && structuredData.scenarios.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {structuredData.scenarios.map((sc, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-center ${
                          i === 0
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                            : i === 1
                            ? 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                          {i === 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : i === 2 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Layers className="w-3 h-3" />
                          )}
                          <span className="truncate">{sc.name.split(' ')[0]} Case</span>
                        </div>
                        <span className="text-xs font-bold block mt-0.5">{sc.impact}</span>
                        <span className="text-[9.5px] opacity-70 block font-mono">
                          {sc.probability} prob
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
