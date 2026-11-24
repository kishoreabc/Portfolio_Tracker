/**
 * lib/stocks/market.ts
 *
 * Utilities for classifying and distinguishing Indian vs US (international) stocks,
 * inspired by Groww's market segregation patterns.
 */

export type StockMarket = 'indian' | 'us';

export interface MarketIdentifiable {
  exchange?: string | null;
  ticker?: string | null;
  symbol?: string | null;
}

const US_EXCHANGES = new Set([
  'NASDAQ',
  'NYSE',
  'AMEX',
  'ARCA',
  'BATS',
  'OTC',
  'US',
  'GLOBAL',
]);

const INDIAN_EXCHANGES = new Set([
  'NSE',
  'BSE',
  'NSI',
  'BOM',
]);

const KNOWN_US_TICKERS = new Set([
  'AAPL', 'MSFT', 'GOOG', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'BRK.A', 'BRK.B',
  'JNJ', 'JPM', 'V', 'PG', 'MA', 'UNH', 'HD', 'BAC', 'DIS', 'NFLX', 'INTC', 'AMD',
  'CRM', 'ADBE', 'PYPL', 'QCOM', 'COIN', 'PLTR', 'UBER', 'ABNB', 'SNOW', 'SQ',
  'SPY', 'QQQ', 'VOO', 'VTI', 'IVV', 'DIA', 'ARKK'
]);

/**
 * Checks if a holding or stock belongs to the US equity market.
 */
export function isUSStock(stock: MarketIdentifiable): boolean {
  if (!stock) return false;
  const rawEx = (stock.exchange || '').toUpperCase().trim();
  if (US_EXCHANGES.has(rawEx)) return true;
  if (rawEx.includes('NASDAQ') || rawEx.includes('NYSE') || rawEx.includes('AMEX')) return true;
  if (INDIAN_EXCHANGES.has(rawEx)) return false;

  const sym = (stock.ticker || stock.symbol || '').toUpperCase().trim();
  if (KNOWN_US_TICKERS.has(sym)) return true;
  if (sym.endsWith('.US')) return true;

  return false;
}

/**
 * Returns 'us' if the stock is traded on US exchanges, otherwise 'indian'.
 */
export function getStockMarket(stock: MarketIdentifiable): StockMarket {
  return isUSStock(stock) ? 'us' : 'indian';
}

export const MARKET_CONFIG = {
  indian: {
    key: 'indian' as const,
    label: 'Indian Stocks',
    shortLabel: 'Indian',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    exchanges: 'NSE / BSE',
    accentColor: 'emerald',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  us: {
    key: 'us' as const,
    label: 'US Stocks',
    shortLabel: 'US Stocks',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    exchanges: 'NASDAQ / NYSE',
    accentColor: 'blue',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  all: {
    key: 'all' as const,
    label: 'All Stocks',
    shortLabel: 'All',
    flag: '🌐',
    currency: 'INR',
    currencySymbol: '₹',
    exchanges: 'All Markets',
    accentColor: 'slate',
    badgeClass: 'bg-surface-200 text-foreground border-border/40',
  },
} as const;
