export interface WatchlistItem {
  symbol: string;
  name?: string;
  sector?: string;
  exchange?: string;
  addedAt: string;
}

export interface WatchlistStockQuote {
  symbol: string;
  name: string;
  exchange: string;
  currentPrice: number;
  priceChange: number;
  percentChange: number;
  dayHigh?: number;
  dayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  trailingPE?: number | null;
  priceToBook?: number | null;
  dividendRate?: number | null;
  dividendYield?: number | null;
  sector?: string;
  industry?: string;
  currency?: string;
  regularMarketTime?: string | number;
}
