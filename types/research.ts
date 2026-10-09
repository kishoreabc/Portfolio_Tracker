/**
 * types/research.ts
 *
 * Normalized TypeScript data model for the Stock Research module.
 * All financial data flows through these types before reaching the UI.
 */

// ─── Period & Source Metadata ──────────────────────────────────────────────────

export type PeriodType = 'quarterly' | 'annual' | 'ttm';
export type ReportingMode = 'consolidated' | 'standalone';
export type DataStatus = 'fresh' | 'stale' | 'unavailable' | 'error';

export interface DataSourceMeta {
  source: string;
  fetchedAt: string | null;
  lastSuccessfulRefresh: string | null;
  status: DataStatus;
}

// ─── Company Profile ───────────────────────────────────────────────────────────

export interface CompanyCitation {
  id: number;
  url: string;
}

export interface KeyPointsData {
  title?: string;
  html?: string;
  text: string;
  citations: CompanyCitation[];
  readMoreUrl?: string;
}

export interface QuickLink {
  label: string;
  url: string;
}

export interface CompanyProfile {
  symbol: string;           // NSE symbol, e.g. "TITAN"
  yahooSymbol?: string;     // e.g. "TITAN.NS"
  name: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  exchange: string;
  currency: string;
  isin?: string;
  bseCode?: string;
  website?: string;
  description?: string;
  headquarters?: string;
  employees?: number;
  reportingMode: ReportingMode;
  aboutHtml?: string;
  aboutCitations?: CompanyCitation[];
  keyPoints?: KeyPointsData;
  quickLinks?: QuickLink[];
  meta: DataSourceMeta;
}

// ─── Quote / Price Data ────────────────────────────────────────────────────────

export interface ResearchQuote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  volume: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  week52High: number | null;
  week52Low: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  trailingEps: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  beta: number | null;
  timestamp: string | null;
  meta: DataSourceMeta;
}

// ─── Valuation Metrics ─────────────────────────────────────────────────────────

export interface ValuationMetrics {
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  evToEbitda: number | null;
  evToSales: number | null;
  priceSales: number | null;
  pegRatio: number | null;
  dividendYield: number | null;
  meta: DataSourceMeta;
}

// ─── Profitability Metrics ─────────────────────────────────────────────────────

export interface ProfitabilityMetrics {
  roe: number | null;         // Return on equity (%)
  roce: number | null;        // Return on capital employed (%)
  roa: number | null;         // Return on assets (%)
  grossMargin: number | null; // %
  operatingMargin: number | null; // %
  netMargin: number | null;   // %
  meta: DataSourceMeta;
}

// ─── Solvency Metrics ─────────────────────────────────────────────────────────

export interface SolvencyMetrics {
  debtToEquity: number | null;
  netDebtToEbitda: number | null;
  interestCoverage: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  meta: DataSourceMeta;
}

// ─── Efficiency Metrics ────────────────────────────────────────────────────────

export interface EfficiencyMetrics {
  assetTurnover: number | null;
  inventoryDays: number | null;
  receivableDays: number | null;
  payableDays: number | null;
  cashConversionCycle: number | null;
  meta: DataSourceMeta;
}

// ─── Growth Metrics ────────────────────────────────────────────────────────────

export interface GrowthCagr {
  oneYear: number | null;
  threeYear: number | null;
  fiveYear: number | null;
  tenYear: number | null;
}

export interface GrowthMetrics {
  revenue: GrowthCagr;
  profit: GrowthCagr;
  eps: GrowthCagr;
  fcf: GrowthCagr;
  priceCagr?: GrowthCagr;
  roeCagr?: GrowthCagr;
  meta: DataSourceMeta;
}

// ─── Financial Statement Row ───────────────────────────────────────────────────

export interface FinancialPeriod {
  period: string;          // e.g. "Mar 2024", "Q3 FY24"
  periodType: PeriodType;
  reportingMode: ReportingMode;
  currency: string;
  unit: string;            // e.g. "Cr", "₹"
}

export interface FinancialRow {
  metric: string;
  values: (number | null)[];  // indexed by period
  unit?: string;
  isExpandable?: boolean;
  subRows?: FinancialRow[];
}

export interface FinancialTable {
  periods: FinancialPeriod[];
  rows: FinancialRow[];
  meta: DataSourceMeta;
}

// ─── Shareholding ──────────────────────────────────────────────────────────────

export interface ShareholdingQuarter {
  quarter: string;           // e.g. "Jun 2024"
  promoters: number | null;  // %
  fii: number | null;        // %
  dii: number | null;        // %
  mutualFunds?: number | null;// %
  government?: number | null;// %
  public: number | null;     // %
  others: number | null;     // %
  total: number | null;      // Should sum to 100
  numberOfShareholders?: number | null;
}

export interface ShareholdingData {
  history: ShareholdingQuarter[];
  latest: ShareholdingQuarter | null;
  meta: DataSourceMeta;
}

// ─── Peer ─────────────────────────────────────────────────────────────────────

export interface PeerEntry {
  symbol: string;
  name: string;
  marketCap: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  cmp?: number | null;
  netProfitQtr?: number | null;
  salesQtr?: number | null;
  eps?: number | null;
}

export interface PeersData {
  peers: PeerEntry[];
  meta: DataSourceMeta;
}

// ─── Corporate Action ──────────────────────────────────────────────────────────

export type CorporateActionType =
  | 'dividend'
  | 'bonus'
  | 'split'
  | 'rights'
  | 'buyback'
  | 'merger'
  | 'demerger'
  | 'other';

export interface CorporateAction {
  type: CorporateActionType;
  date: string;           // ISO date
  description: string;
  ratio?: string;         // e.g. "2:1", "1:5"
  amount?: number;        // For dividends
  exDate?: string;
  recordDate?: string;
  sourceUrl?: string;
}

export interface CorporateActionsData {
  actions: CorporateAction[];
  meta: DataSourceMeta;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'annual_report'
  | 'quarterly_result'
  | 'investor_presentation'
  | 'earnings_call'
  | 'announcement'
  | 'shareholding_disclosure'
  | 'credit_rating'
  | 'other';

export interface CompanyDocument {
  id: string;
  type: DocumentType;
  title: string;
  period?: string;          // e.g. "FY2024", "Q3 FY24"
  publishedAt?: string;     // ISO date
  source: string;
  externalUrl: string;      // Link to official source
}

export interface DocumentsData {
  documents: CompanyDocument[];
  meta: DataSourceMeta;
}

// ─── Key Metrics Overview ──────────────────────────────────────────────────────

export interface KeyMetrics {
  marketCap: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  eps: number | null;
  bookValue?: number | null;
  faceValue?: number | null;
  cmpToFcf?: number | null;
  downFrom52wHigh?: number | null;
  pegRatio?: number | null;
}

// ─── Segment Reporting (Ind AS 108) ─────────────────────────────────────────

export interface SegmentItem {
  segment: string;
  revenueCr: number;
  sharePct: number;
  ebitCr?: number;
  ebitMarginPct?: number;
  pbitSharePct?: number;
  description?: string;
  brands?: string;
}

export interface GeoSplit {
  domesticPct: number;
  exportsPct: number;
  domesticPeriod: string;
  priorDomesticPct?: number;
  priorExportsPct?: number;
  priorPeriod?: string;
}

export interface PeriodSegmentData {
  id: string; // e.g. 'FY25', 'FY24', 'Q3-FY26', 'FY26-COMMENTARY'
  label: string; // e.g. 'FY25 (Full Year)', 'FY24 (Annual Audited)', 'Q3 FY26 (Latest Quarter)', 'FY26 (Screener Commentary)'
  shortLabel: string; // e.g. 'FY25', 'FY24', 'Q3 FY26', 'FY26'
  periodType: 'annual' | 'quarterly' | 'commentary';
  reportingNote: string; // e.g. 'Ind AS 108 Audited Annual Disclosures'
  totalRevenueCr: number;
  totalEbitCr?: number;
  segments: SegmentItem[];
  geoSplit?: GeoSplit;
}

// ─── Screener Extra Ratios ────────────────────────────────────────────────────

export interface ScreenerExtraRatios {
  marketCap?: number | null;        // In Cr
  currentPrice?: number | null;     // In ₹
  high?: number | null;             // In ₹
  low?: number | null;              // In ₹
  highLow?: string | null;          // "426 / 253"
  stockPe?: number | null;          // e.g. 16.8
  bookValue?: number | null;        // In ₹
  dividendYield?: number | null;    // %
  roce?: number | null;             // %
  roe?: number | null;              // %
  faceValue?: number | null;        // In ₹
  returnOver3Years?: number | null; // % (e.g. -15.1%)
  roe5Years?: number | null;        // % (e.g. 32.2%)
  cmpToFcf?: number | null;         // e.g. 21.9
  eps?: number | null;              // In ₹
  promoterHolding?: number | null;  // %
  pledgedPercentage?: number | null;// %
  pegRatio?: number | null;         // e.g. 5.66
  salesGrowth?: number | null;      // % (1Y/TTM)
  profitGrowth?: number | null;     // % (1Y/TTM)
  reserves?: number | null;         // In Cr
  salesGrowth3Years?: number | null;// % (e.g. 3.60%)
  profitVar3Years?: number | null;  // % (e.g. 2.97%)
  debtToEquity?: number | null;     // e.g. 0.03
  salesGrowth5Years?: number | null;// % (e.g. 9.87%)
  profitVar5Years?: number | null;  // % (e.g. 9.62%)
  downFrom52wHigh?: number | null;  // % (e.g. 37.6%)
  qtrSalesVar?: number | null;      // % (e.g. -11.1%)
  qtrProfitVar?: number | null;     // % (e.g. -22.0%)
  interestCoverage?: number | null; // e.g. 237.8
  priceToBook?: number | null;      // Price / Book Value (e.g. 4.59)
  roa?: number | null;              // % (Return on assets)
  netDebtToEbitda?: number | null;  // Net debt / EBITDA
  currentRatio?: number | null;     // Current assets / Current liabilities
  quickRatio?: number | null;       // Quick assets / Current liabilities
}

// ─── Aggregated Research Response ─────────────────────────────────────────────

export interface ResearchData {
  company: CompanyProfile;
  quote: ResearchQuote;
  keyMetrics: KeyMetrics;
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  solvency: SolvencyMetrics;
  efficiency: EfficiencyMetrics;
  growth: GrowthMetrics;
  quarterlyFinancials: FinancialTable;
  annualFinancials: FinancialTable;
  balanceSheet: FinancialTable;
  cashFlow: FinancialTable;
  shareholding: ShareholdingData;
  peers: PeersData;
  corporateActions: CorporateActionsData;
  documents: DocumentsData;
  pros?: string[];
  cons?: string[];
  extraRatios?: ScreenerExtraRatios;
  keyPoints?: KeyPointsData;
  quickLinks?: QuickLink[];
  fetchedAt: string;
}

// ─── Provider Interface ────────────────────────────────────────────────────────

export interface ResearchProvider {
  id: string;
  getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  getQuote(symbol: string): Promise<ResearchQuote>;
  getFinancials(symbol: string): Promise<{ quarterly: FinancialTable; annual: FinancialTable }>;
  getBalanceSheet(symbol: string): Promise<FinancialTable>;
  getCashFlow(symbol: string): Promise<FinancialTable>;
  getShareholding(symbol: string): Promise<ShareholdingData>;
  getPeers(symbol: string): Promise<PeersData>;
  getCorporateActions(symbol: string): Promise<CorporateActionsData>;
  getDocuments(symbol: string): Promise<DocumentsData>;
}
