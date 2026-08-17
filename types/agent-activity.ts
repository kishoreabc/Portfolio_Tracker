/**
 * types/agent-activity.ts
 *
 * Structured state and event models for the transient Multi-Agent Thinking UI.
 * Exposes high-level operational activity and milestones without exposing
 * raw chain-of-thought, hidden prompts, or private model deliberations.
 */

export type AgentId =
  | 'portfolio_analyst'
  | 'macro_market_analyst'
  | 'risk_strategy_engine'
  | 'synthesis_director';

export type AgentStatus =
  | 'waiting'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying';

export type ActivityType =
  | 'agent_started'
  | 'stage_started'
  | 'tool_started'
  | 'tool_completed'
  | 'progress'
  | 'milestone'
  | 'agent_completed'
  | 'agent_failed'
  | 'agent_retrying'
  | 'pipeline_completed';

export interface AgentStructuredOutput {
  // Quantitative metrics (Agent 1)
  healthScore?: number;
  healthStatus?: string;
  strengths?: string[];
  weaknesses?: string[];
  
  // Market grounding (Agent 2)
  marketStatus?: string;
  marketQuotes?: string;
  marketSummary?: string;
  topHeadline?: string;
  searchSource?: string;
  
  // Strategy & Actions (Agent 3)
  opportunities?: { title: string; priority: string; category?: string }[];
  risks?: { title: string; severity: string }[];
  recommendations?: { title: string; timeframe?: string; priority?: string }[];
  
  // Scenarios & Risk (Agent 4)
  scenarios?: { name: string; probability: string; impact: string; description?: string }[];
  sentiment?: string;
  diversificationGrade?: string;
}

export interface AgentActivityEvent {
  id: string;
  runId: string;
  timestamp: string;
  agentId: AgentId;
  type: ActivityType;
  title: string;
  description?: string;
  status?: AgentStatus;
  progress?: number;
  tool?: string;
  metadata?: Record<string, unknown>;
  structuredData?: AgentStructuredOutput;
}

export interface AgentState {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  currentStage?: string;
  currentActivity?: string;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  activities: AgentActivityEvent[];
  structuredData?: AgentStructuredOutput;
  error?: string;
}

export interface PipelineState {
  runId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  activeAgent?: AgentId;
  agents: Record<AgentId, AgentState>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export const INITIAL_AGENTS: Record<AgentId, AgentState> = {
  portfolio_analyst: {
    id: 'portfolio_analyst',
    name: 'Portfolio Analyst',
    role: 'Quantitative & Concentration Evaluator',
    status: 'waiting',
    activities: [],
  },
  macro_market_analyst: {
    id: 'macro_market_analyst',
    name: 'Macro & Market Analyst',
    role: 'Live Grounding & Web Scraping Engine',
    status: 'waiting',
    activities: [],
  },
  risk_strategy_engine: {
    id: 'risk_strategy_engine',
    name: 'Risk & Strategy Engine',
    role: 'Scenario Forecaster & Threat Modeler',
    status: 'waiting',
    activities: [],
  },
  synthesis_director: {
    id: 'synthesis_director',
    name: 'Synthesis Director',
    role: 'Chief Intelligence & Report Assembly',
    status: 'waiting',
    activities: [],
  },
};
