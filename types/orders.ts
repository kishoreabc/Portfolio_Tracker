export interface Order {
  id?: number;
  symbol: string;
  orderType: 'BUY' | 'SELL';
  quantity: number;
  value: number; // total order value (qty × price)
  executedAt: string; // ISO date-time string
  createdAt?: string;
}

export interface CapitalDeployedPoint {
  date: string;       // YYYY-MM-DD
  cumulative: number; // running total of BUY - SELL values
  daily: number;      // net value for that day (positive = net buy, negative = net sell)
}

export interface PerformanceHistory {
  points: CapitalDeployedPoint[];
  totalCapitalDeployed: number;
  dataSource: 'order-history';
  startDate: string | null;
  endDate: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number; // duplicates
  errors: string[];
}

export type PerformanceRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
