export interface EquityHolding {
  ticker: string;
  exchange: string;
  name: string;
  currentPrice: number;
  priceChange: number;
  percentChange: number;
  shares: number;
  currentValue: number;
  allocationPercent: number;
  sector: string;
}

export type PortfolioRowType = 'equity' | 'bond';

export interface PortfolioRow {
  id: string;
  type: PortfolioRowType;
  ticker: string;       // Symbol for equity, ISIN for bonds
  name: string;
  sector: string;
  currentValue: number;
  allocationPercent: number;
  percentChange?: number;   // equity only
  maturityDate?: string;    // bonds only
  creditRating?: string;    // bonds only
  ytm?: number;             // bonds only
}

export interface SectorAllocation {
  sector: string;
  equityValue: number;
  bondValue: number;
  totalValue: number;
  percent: number;
  targetPercent?: number;
}

export interface AssetClassSummary {
  label: string;
  value: number;
  percent: number;
  color: string;
}
