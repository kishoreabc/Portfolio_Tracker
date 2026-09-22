import { fetchAllSheetData } from '@/lib/sheets/fetcher';
import { mapEquityHoldings } from '@/lib/mappers/equity';
import { mapBondHoldings } from '@/lib/mappers/bonds';
import { mapTransactions, buildCashFlowStats } from '@/lib/mappers/cashflow';
import { buildUnifiedPortfolio } from '@/lib/mappers/unified';
import { computeAssetAllocation, computeSectorAllocation, computeOverallAllocation } from '@/lib/calc/allocation';
import { computeConcentrationRisk, computeWinnersLosers, type ConcentrationRisk, type WinnerLoser } from '@/lib/calc/risk';
import { buildBondMaturityEvents, buildBondLadder, buildCreditRatingDistribution } from '@/lib/calc/forecast';
import { validatePortfolioData } from '@/lib/calc/dataQuality';
import type { EquityHolding, PortfolioRow, SectorAllocation, AssetClassSummary } from '@/types/holdings';
import type { BondHolding, BondMaturityEvent, BondLadderEntry, CreditRatingBucket } from '@/types/bonds';
import type { Transaction, CashFlowStats } from '@/types/transactions';
import type { DataQualityReport } from '@/types/dataQuality';

export interface SanitizedPortfolioData {
  // Holdings
  equity: EquityHolding[];
  bonds: BondHolding[];
  portfolio: PortfolioRow[];
  transactions: Transaction[];

  // Aggregates
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  todaysChange: number;
  todaysChangePct: number;

  // Analytics
  cashFlowStats: CashFlowStats;
  assetAllocation: AssetClassSummary[];
  overallAllocation: AssetClassSummary[];
  sectorAllocation: SectorAllocation[];
  concentrationRisk: ConcentrationRisk;
  winners: WinnerLoser[];
  losers: WinnerLoser[];
  bondMaturityEvents: BondMaturityEvent[];
  bondLadder: BondLadderEntry[];
  creditRatingDistribution: CreditRatingBucket[];

  // Metadata
  meta: {
    lastFetched: string | null;
    errors: string[];
  };
  dataQuality: DataQualityReport;
}

export interface PortfolioSummary {
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  todaysChange: number;
  todaysChangePct: number;
  equityCount: number;
  bondCount: number;
  assetAllocation: AssetClassSummary[];
  lastFetched: string | null;
}

/**
 * Fetches sheet data server-side, processes all financial transformations,
 * and returns only the sanitized portfolio structure required by the UI.
 * Never leaks raw Google Sheet rows, column schemas, or service credentials.
 */
export async function getPortfolioData(force = false): Promise<SanitizedPortfolioData> {
  const raw = await fetchAllSheetData(force);

  const equity = mapEquityHoldings(raw?.equity ?? null);
  const bonds = mapBondHoldings(raw?.bonds ?? null);
  const transactions = mapTransactions(raw?.transactions ?? null);
  const cashFlowStats = buildCashFlowStats(transactions);
  const portfolio = buildUnifiedPortfolio(equity, bonds);
  const assetAllocation = computeAssetAllocation(equity, bonds);
  const overallAllocation = computeOverallAllocation(equity, bonds);
  const sectorAllocation = computeSectorAllocation(equity, bonds);
  const concentrationRisk = computeConcentrationRisk(equity, bonds);
  const { winners, losers } = computeWinnersLosers(equity);
  const bondMaturityEvents = buildBondMaturityEvents(bonds);
  const bondLadder = buildBondLadder(bonds);
  const creditRatingDistribution = buildCreditRatingDistribution(bonds);

  const equityTotal = equity.reduce((s, h) => s + h.currentValue, 0);
  const bondTotal = bonds.reduce((s, b) => s + b.totalValue, 0);
  const netWorth = equityTotal + bondTotal;

  const todaysChange = equity.reduce((s, h) => s + h.priceChange * h.shares, 0);
  const todaysChangePct = netWorth > 0 ? todaysChange / netWorth : 0;

  // Run data quality validation after all normalization
  const dataQuality = validatePortfolioData(equity, bonds, transactions);

  // Sanitize errors: remove any potential internal paths or keys
  const sanitizedErrors = (raw?.meta.errors ?? []).map((err) => {
    if (typeof err === 'string') {
      return err.replace(/\b[A-Za-z0-9_-]{25,}\b/g, '[REDACTED]');
    }
    return 'Sheet processing warning';
  });

  return {
    equity,
    bonds,
    portfolio,
    transactions,
    netWorth,
    equityTotal,
    bondTotal,
    todaysChange,
    todaysChangePct,
    cashFlowStats,
    assetAllocation,
    overallAllocation,
    sectorAllocation,
    concentrationRisk,
    winners,
    losers,
    bondMaturityEvents,
    bondLadder,
    creditRatingDistribution,
    meta: {
      lastFetched: raw?.meta.lastFetched ?? null,
      errors: sanitizedErrors,
    },
    dataQuality,
  };
}

/**
 * Returns a high-level summary of the portfolio for dashboard widgets.
 */
export async function getPortfolioSummary(force = false): Promise<PortfolioSummary> {
  const data = await getPortfolioData(force);

  return {
    netWorth: data.netWorth,
    equityTotal: data.equityTotal,
    bondTotal: data.bondTotal,
    todaysChange: data.todaysChange,
    todaysChangePct: data.todaysChangePct,
    equityCount: data.equity.length,
    bondCount: data.bonds.length,
    assetAllocation: data.assetAllocation,
    lastFetched: data.meta.lastFetched,
  };
}
