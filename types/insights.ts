export interface PortfolioHealth {
  score: number;
  summary: string;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  reasons?: string[];
}

export interface Allocation {
  equity: number;
  bonds: number;
  gold: number;
  cash: number;
  other?: number;
  total?: number;
  commentary?: string;
}

export interface Opportunity {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  evidence?: string;
  action?: string;
}

export interface Risk {
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  evidence?: string;
  mitigation?: string;
}

export interface CashFlow {
  investment: number;
  expenses: number;
  net: number;
  summary: string;
}

export interface Recommendation {
  title: string;
  action: string;
  rationale: string;
  priority: 'High' | 'Medium' | 'Low';
  evidence?: string;
  timeframe?: string;
}

export interface Diversification {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  hhi: number;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
}

export interface MarketCondition {
  status: 'Bull Market' | 'Bear Market' | 'Sideways' | 'Volatile' | 'Recovery';
  summary: string;
  keyDrivers: string[];
  impactOnEquity: string;
  impactOnBonds: string;
  impactOnPortfolio: string;
  lastUpdated?: string;
}

export interface MarketScenario {
  probability: number | string;
  label?: string;
  name?: string;
  trigger?: string;
  description?: string;
  expectedReturn?: string;
  impact?: string;
  portfolioImpact?: string;
}

export interface MarketOutlook {
  horizon?: string;
  sentiment?: 'Bullish' | 'Cautious' | 'Neutral' | 'Bearish' | string;
  shortTerm?: string;
  mediumTerm?: string;
  bull?: MarketScenario;
  base?: MarketScenario;
  bear?: MarketScenario;
  scenarios?: MarketScenario[];
  recommendation?: string;
}

export interface LongTermStrategy {
  alignmentScore: number;
  currentApproach: string;
  suggestions: string[];
  compoundingInsight: string;
  targetAllocation?: {
    equity: number;
    bonds: number;
    gold: number;
    cash: number;
  };
}

export interface AIInsightsResponse {
  health: PortfolioHealth;
  allocation: Allocation;
  opportunities: Opportunity[];
  risks: Risk[];
  cashFlow: CashFlow;
  recommendations: Recommendation[];
  summary: string;
  diversification?: Diversification;
  marketCondition?: MarketCondition;
  marketOutlook?: MarketOutlook;
  longTermStrategy?: LongTermStrategy;
  generatedAt?: string;
}
