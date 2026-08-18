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
  // Agent 1: Portfolio Analyst
  healthScore?: number;
  healthStatus?: string;
  healthSummary?: string;
  healthReasons?: string[];
  allocationCommentary?: string;
  cashFlowHealth?: string;
  concentrationRisk?: string;
  topStrengths?: string[];
  topWeaknesses?: string[];
  
  // Agent 2: Macro Analyst
  marketStatus?: string;
  marketQuotes?: string;
  marketSummary?: string;
  keyDrivers?: string[];
  niftyTrend?: string;
  rbiStance?: string;
  fiiDiiFlow?: string;
  sectorOutlook?: Record<string, string>;
  impactOnEquity?: string;
  impactOnBonds?: string;
  impactOnPortfolio?: string;
  topHeadline?: string;
  searchSource?: string;
  newsSectionCount?: number;
  newsSectionHeadlines?: string[];
  
  // Agent 3: Strategy & Opportunities
  opportunities?: {
    title: string;
    priority: string;
    category?: string;
    description?: string;
    actionable?: string;
    evidence?: string;
  }[];
  risks?: {
    title: string;
    severity: string;
    description?: string;
    mitigation?: string;
  }[];
  recommendations?: {
    title: string;
    action?: string;
    priority?: string;
    timeframe?: string;
    category?: string;
    targetAsset?: string;
  }[];
  longTermStrategy?: string;
  
  // Agent 4: Risk & Scenarios
  diversification?: {
    score?: number;
    grade?: string;
    hhi?: number;
    strengths?: string[];
    weaknesses?: string[];
    suggestion?: string;
  };
  marketOutlook?: {
    sentiment?: string;
    shortTerm?: string;
    mediumTerm?: string;
    scenarios?: {
      name: string;
      probability: string;
      impact: string;
      description?: string;
    }[];
  };
  scenarios?: {
    name: string;
    probability: string;
    impact: string;
    description?: string;
  }[];

  // Additional generic output fields
  rawOutput?: Record<string, unknown>;
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
