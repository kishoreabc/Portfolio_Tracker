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
  category?: string;
  actionable?: string;
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
  category?: string;
  targetAsset?: string;
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

// ─── V2 AI Portfolio Intelligence Types ─────────────────────────────────────

export interface PortfolioHealthBreakdown {
  overall: number;
  fundamental: number;
  technical: number;
  valuation: number;
  risk: number;
  diversification: number;
  performance?: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary?: string;
  methodology?: string;
}

export interface ScoringWeights {
  fundamental: number;
  technical: number;
  valuation: number;
  risk: number;
  diversification: number;
  performance: number;
}

export interface ExecutiveSummaryInsight {
  title: string;
  insight: string;
  category: 'fundamental' | 'technical' | 'valuation' | 'risk' | 'portfolio' | 'macro';
  evidence: string[];
  metrics?: Record<string, string | number>;
}

export interface FundamentalHolding {
  symbol: string;
  name: string;
  weight: number;
  pe?: number;
  forwardPe?: number;
  pb?: number;
  roe?: number;
  roce?: number;
  epsGrowth?: number;
  revenueGrowth?: number;
  netMargin?: number;
  debtToEquity?: number;
  dividendYield?: number;
  status: 'Strong' | 'Neutral' | 'Weak' | 'Under Review';
}

export interface FundamentalIntelligence {
  score: number;
  strengths: string[];
  watchItems: string[];
  interpretation: string;
  holdings: FundamentalHolding[];
}

export interface TechnicalSignalHolding {
  symbol: string;
  name: string;
  weight: number;
  currentPrice: number;
  trend: 'Bullish' | 'Neutral' | 'Bearish';
  momentum: 'Strong' | 'Neutral' | 'Weak';
  marketStructure: 'Above 200DMA' | 'Near 200DMA' | 'Below 200DMA';
  priceVs200DMA?: number;
  priceVs50DMA?: number;
  rsi?: number;
  signalExplanation: string;
}

export interface TechnicalIntelligence {
  breadthScore: number;
  trend: 'Bullish' | 'Neutral' | 'Bearish';
  momentum: 'Strong' | 'Neutral' | 'Weak';
  marketStructure: 'Above 200DMA' | 'Near 200DMA' | 'Below 200DMA';
  signals: TechnicalSignalHolding[];
  interpretation?: string;
}

export interface ValuationIntelligence {
  portfolioPe: number;
  benchmarkPe: number;
  benchmarkName: string;
  relativeValuationPct: number;
  interpretation: string;
  holdingsValuation?: {
    symbol: string;
    pe?: number;
    benchmarkPe?: number;
    sectorPe?: number;
    status: 'Undervalued' | 'Fair' | 'Elevated' | 'N/A';
  }[];
}

export interface RiskFactor {
  title: string;
  category: string;
  severity: 'High' | 'Medium' | 'Low';
  evidence: string;
  potentialImpact: string;
  whatToMonitor: string;
}

export interface RiskIntelligence {
  overallRiskScore: number;
  topSectorExposure: { sector: string; percentage: number };
  top5HoldingsWeight: number;
  largestPosition: { symbol: string; percentage: number };
  debtQualityScore?: number;
  topRiskFactors: RiskFactor[];
  interpretation: string;
}

export interface PerformanceContributor {
  symbol: string;
  name?: string;
  contributionPct: number;
  returnPct: number;
  weight: number;
  type: 'gain' | 'loss';
}

export interface PortfolioIntelligence {
  portfolioReturnPct?: number;
  topContributors: PerformanceContributor[];
  underperformers: PerformanceContributor[];
  interpretation: string;
  assetAllocationSummary?: { asset: string; percentage: number }[];
  sectorAllocationSummary?: { sector: string; percentage: number }[];
}

export interface MacroExposure {
  variable: string;
  currentValue?: string;
  trend: 'Elevated' | 'Rising' | 'Falling' | 'Stable' | 'Neutral';
  sensitivity: string;
  affectedHoldingsOrSectors: string;
}

export interface MacroIntelligence {
  summary: string;
  exposures: MacroExposure[];
}

export interface MatrixStock {
  symbol: string;
  name: string;
  weight: number;
  fundamental: 'Strong' | 'Neutral' | 'Weak';
  technical: 'Strong' | 'Neutral' | 'Weak';
}

export interface FundamentalTechnicalMatrix {
  stocks: MatrixStock[];
  summary?: string;
}

export interface ReviewFlag {
  type: 'concentration' | 'technical' | 'valuation' | 'quality';
  severity: 'red' | 'orange' | 'yellow' | 'green';
  title: string;
  description: string;
  evidence: string;
  actionRecommendation?: string;
}

export interface ThesisHolding {
  symbol: string;
  name: string;
  weight: number;
  fundamentalsStatus: 'Strong' | 'Neutral' | 'Weak';
  valuationStatus: 'Undervalued' | 'Moderate' | 'Elevated' | 'Fair';
  technicalStatus: 'Bullish' | 'Neutral' | 'Bearish';
  riskLevel: 'Low' | 'Medium' | 'High';
  thesisStatus: 'Intact' | 'Monitor' | 'Review' | 'Invalidated';
  invalidationCondition?: string;
  explanation: string;
}

export interface PortfolioChangeItem {
  metric: string;
  previousValue: string;
  currentValue: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  interpretation?: string;
}

export interface PortfolioChanges {
  isAvailable: boolean;
  message?: string;
  changes: PortfolioChangeItem[];
  interpretation?: string;
}

export interface AIConfidence {
  level: 'High' | 'Medium' | 'Low';
  reason: string;
  metricsAvailableCount: number;
  metricsTotalExpected: number;
}

export interface AnalysisMetadata {
  runId: string;
  snapshotHash: string;
  analysisMode: 'quick' | 'deep' | 'no_ai' | 'deterministic_only';
  analyticsVersion: string;
  promptVersion: string;
  generatedAt: string;
  dataAsOf: {
    portfolio?: string;
    market?: string;
    macro?: string;
    news?: string;
  };
  provider?: string;
  model?: string;
  apiUsageEstimate?: {
    llmCalls: number;
    tavilyCalls: number;
  };
  overallConfidence: 'high' | 'medium' | 'low';
  degradationState: 'full' | 'degraded' | 'partial' | 'failed';
  llmCallsCount?: number;
  tavilyCreditsUsed?: number;
  claimCoverage?: ClaimCoverageMetrics;
  evidenceCount?: number;
  executionTimeMs?: number;
  isDegraded?: boolean;
  degradationReason?: string;
  idempotencyKey?: string;
}

export interface IntegratedView {
  symbol: string;
  fundamentals: string;
  valuation: string;
  technicals: string;
  macroExposure: string;
  newsContext: string;
  interaction: 'aligned' | 'partially_aligned' | 'conflicting' | 'insufficient_data';
  conclusion: string;
  evidenceIds: string[];
  confidence: number;
}

export interface ClaimCoverageMetrics {
  factualClaimCount: number;
  validatedClaimCount: number;
  unsupportedClaimCount: number;
  claimCoveragePercent: number;
}

export interface AIInsightsResponse {
  // V1 fields (strictly preserved for backwards compatibility)
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

  // V2 Additive Fields
  portfolioHealthBreakdown?: PortfolioHealthBreakdown;
  scoringWeights?: ScoringWeights;
  executiveSummaryInsights?: ExecutiveSummaryInsight[];
  fundamentalIntelligence?: FundamentalIntelligence;
  technicalIntelligence?: TechnicalIntelligence;
  valuationIntelligence?: ValuationIntelligence;
  riskIntelligence?: RiskIntelligence;
  portfolioIntelligence?: PortfolioIntelligence;
  macroIntelligence?: MacroIntelligence;
  fundamentalTechnicalMatrix?: FundamentalTechnicalMatrix;
  reviewFlags?: ReviewFlag[];
  thesisMonitor?: ThesisHolding[];
  portfolioChanges?: PortfolioChanges;
  aiConfidence?: AIConfidence;

  // Sections 37, 59, 64 Extensions
  metadata?: AnalysisMetadata;
  claimCoverage?: ClaimCoverageMetrics;
  integratedViews?: IntegratedView[];
}

// ─── Input Types for AI Pipeline ─────────────────────────────────────────────

export interface EquityInput {
  ticker: string;
  name: string;
  sector: string;
  currentValue: number;
  percentChange: number;
  allocationPercent: number;
  shares: number;
}

export interface BondInput {
  isin: string;
  securityName: string;
  sector: string;
  creditRating: string;
  ytm: number;
  couponRate: number;
  duration: number;
  totalValue: number;
  maturityDate: string | null;
}

export interface PortfolioInput {
  // Aggregates
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  equityCount: number;
  bondCount: number;
  diversificationScore: number;
  herfindahlIndex: number;
  top5Percent: number;
  // Holdings
  topEquity: EquityInput[];
  topBonds: BondInput[];
  winners: EquityInput[];
  losers: EquityInput[];
  // Allocation
  assetAllocation: { label: string; percent: number }[];
  sectorAllocation: { sector: string; percent: number }[];
  // Cash flow
  totalInvestment: number;
  totalExpenses: number;
  monthlyAvgInvestment: number;
  lastMonthInvestment: number;
  lastMonthExpenses: number;
  previousReport?: any;
}

