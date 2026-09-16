/**
 * Indian Equity Sector P/E Benchmarks and Multiples Valuation Intelligence.
 * Provides realistic sector-specific price-to-earnings (P/E) multiples based on
 * NSE/BSE sectoral indices and industry benchmarks.
 */

export const SECTOR_PE_BENCHMARKS: Record<string, number> = {
  // Financials & Banking
  'banking': 14.5,
  'banks': 14.5,
  'bank': 14.5,
  'private bank': 15.0,
  'psu bank': 9.5,
  'financial services': 17.5,
  'financial': 17.5,
  'finance': 17.5,
  'nbfc': 20.0,
  'insurance': 36.0,

  // Technology
  'information technology': 29.0,
  'it': 29.0,
  'technology': 29.0,
  'software': 29.0,
  'tech': 29.0,

  // Healthcare
  'pharmaceuticals': 33.0,
  'pharmaceutical': 33.0,
  'pharma': 33.0,
  'healthcare': 35.0,
  'hospitals': 45.0,

  // Consumer
  'fmcg': 44.0,
  'consumer goods': 44.0,
  'consumer staples': 44.0,
  'consumer': 40.0,
  'consumer discretionary': 38.0,
  'retail': 50.0,

  // Auto
  'automobile': 24.0,
  'automobiles': 24.0,
  'auto': 24.0,
  'auto components': 28.0,

  // Energy & Utilities
  'energy': 12.0,
  'oil & gas': 11.5,
  'oil and gas': 11.5,
  'power': 19.0,
  'utilities': 18.0,

  // Metals & Mining
  'metals': 12.0,
  'metal': 12.0,
  'mining': 11.0,
  'steel': 11.5,

  // Industrial & Materials
  'capital goods': 38.0,
  'infrastructure': 25.0,
  'construction': 24.0,
  'cement': 30.0,
  'chemicals': 30.0,
  'specialty chemicals': 35.0,
  'real estate': 38.0,
  'realty': 38.0,
  'telecom': 48.0,
  'telecommunications': 48.0,
};

// Known ticker to sector & sector P/E mapping as deterministic backup
export const KNOWN_TICKER_SECTOR_PE: Record<string, { sector: string; pe: number }> = {
  // Banking
  'KTKBANK': { sector: 'Banking', pe: 14.5 },
  'SOUTHBANK': { sector: 'Banking', pe: 14.5 },
  'IDFCFIRSTB': { sector: 'Banking', pe: 14.5 },
  'HDFCBANK': { sector: 'Banking', pe: 18.0 },
  'ICICIBANK': { sector: 'Banking', pe: 17.0 },
  'SBIN': { sector: 'Banking', pe: 10.5 },
  'KOTAKBANK': { sector: 'Banking', pe: 19.0 },
  'INDUSINDBK': { sector: 'Banking', pe: 13.5 },
  'FEDERALBNK': { sector: 'Banking', pe: 12.0 },
  'AXISBANK': { sector: 'Banking', pe: 14.0 },
  'BANDHANBNK': { sector: 'Banking', pe: 12.5 },
  'PNB': { sector: 'Banking', pe: 9.0 },
  'BANKBARODA': { sector: 'Banking', pe: 8.5 },
  'CANBK': { sector: 'Banking', pe: 8.0 },

  // Financial Services / NBFC
  'BAJFINANCE': { sector: 'Financial Services', pe: 26.0 },
  'BAJAJFINSV': { sector: 'Financial Services', pe: 28.0 },
  'JIOFIN': { sector: 'Financial Services', pe: 35.0 },
  'MUTHOOTFIN': { sector: 'Financial Services', pe: 16.0 },
  'MANAPPURAM': { sector: 'Financial Services', pe: 11.0 },
  'SBILIFE': { sector: 'Insurance', pe: 36.0 },
  'HDFCLIFE': { sector: 'Insurance', pe: 42.0 },

  // IT
  'TCS': { sector: 'Information Technology', pe: 29.0 },
  'INFY': { sector: 'Information Technology', pe: 27.0 },
  'WIPRO': { sector: 'Information Technology', pe: 22.0 },
  'HCLTECH': { sector: 'Information Technology', pe: 25.0 },
  'TECHM': { sector: 'Information Technology', pe: 24.0 },
  'LTIM': { sector: 'Information Technology', pe: 32.0 },
  'COFORGE': { sector: 'Information Technology', pe: 38.0 },
  'PERSISTENT': { sector: 'Information Technology', pe: 42.0 },

  // FMCG / Consumer
  'ITC': { sector: 'FMCG', pe: 44.0 },
  'HINDUNILVR': { sector: 'FMCG', pe: 50.0 },
  'NESTLEIND': { sector: 'FMCG', pe: 65.0 },
  'BRITANNIA': { sector: 'FMCG', pe: 50.0 },
  'TATACONSUM': { sector: 'FMCG', pe: 58.0 },
  'JYOTHYLAB': { sector: 'FMCG', pe: 40.0 },
  'DABUR': { sector: 'FMCG', pe: 48.0 },
  'MARICO': { sector: 'FMCG', pe: 46.0 },
  'ITCHOTELS': { sector: 'Hospitality', pe: 45.0 },

  // Pharma / Healthcare
  'NATCOPHARM': { sector: 'Pharmaceuticals', pe: 33.0 },
  'DRREDDY': { sector: 'Pharmaceuticals', pe: 33.0 },
  'CIPLA': { sector: 'Pharmaceuticals', pe: 28.0 },
  'SUNPHARMA': { sector: 'Pharmaceuticals', pe: 36.0 },
  'DIVISLAB': { sector: 'Pharmaceuticals', pe: 55.0 },
  'ZYDUSLIFE': { sector: 'Pharmaceuticals', pe: 26.0 },
  'APOLLOHOSP': { sector: 'Healthcare', pe: 60.0 },
  'LUPIN': { sector: 'Pharmaceuticals', pe: 34.0 },
  'AUROPHARMA': { sector: 'Pharmaceuticals', pe: 22.0 },

  // Auto
  'TATAMOTORS': { sector: 'Automobile', pe: 16.0 },
  'TMCV': { sector: 'Automobile', pe: 18.0 },
  'TMPV': { sector: 'Automobile', pe: 22.0 },
  'MARUTI': { sector: 'Automobile', pe: 26.0 },
  'M&M': { sector: 'Automobile', pe: 28.0 },
  'BAJAJ-AUTO': { sector: 'Automobile', pe: 30.0 },
  'HEROMOTOCO': { sector: 'Automobile', pe: 24.0 },
  'EICHERMOT': { sector: 'Automobile', pe: 32.0 },

  // Energy & Materials
  'RELIANCE': { sector: 'Energy & Retail', pe: 24.0 },
  'ONGC': { sector: 'Energy / Oil & Gas', pe: 9.0 },
  'BPCL': { sector: 'Energy / Oil & Gas', pe: 10.0 },
  'IOC': { sector: 'Energy / Oil & Gas', pe: 9.5 },
  'TATASTEEL': { sector: 'Metals & Mining', pe: 12.0 },
  'JSWSTEEL': { sector: 'Metals & Mining', pe: 13.0 },
  'HINDALCO': { sector: 'Metals & Mining', pe: 11.0 },
  'COALINDIA': { sector: 'Metals & Mining', pe: 8.5 },
  'LT': { sector: 'Capital Goods', pe: 36.0 },
  'BHARTIARTL': { sector: 'Telecom', pe: 45.0 },

  // Commodities / ETFs (P/E is not applicable)
  'GOLDBEES': { sector: 'Precious Metals (Gold ETF)', pe: 0 },
  'SILVERBEES': { sector: 'Precious Metals (Silver ETF)', pe: 0 },
  'JUNIORBEES': { sector: 'Index ETF', pe: 22.8 },
};

/**
 * Resolves the Sector P/E multiple for a given sector name and/or stock ticker.
 */
export function getSectorPE(sector?: string, ticker?: string): number | undefined {
  // 1. Check direct ticker mapping first
  const cleanTicker = (ticker || '').trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  if (cleanTicker && KNOWN_TICKER_SECTOR_PE[cleanTicker]) {
    const val = KNOWN_TICKER_SECTOR_PE[cleanTicker].pe;
    if (val > 0) return val;
    if (val === 0) return undefined; // e.g. Gold/Commodity ETF
  }

  // 2. Check sector name if available
  if (!sector) return undefined;
  const s = sector.trim().toLowerCase();

  // Safeguard: Check ETF / Gold / Commodity keywords before general metals
  if (
    s.includes('gold') ||
    s.includes('silver') ||
    s.includes('bullion') ||
    s.includes('etf') ||
    s.includes('commodity') ||
    s.includes('precious')
  ) {
    return undefined;
  }

  // Check direct benchmark matches
  for (const [key, pe] of Object.entries(SECTOR_PE_BENCHMARKS)) {
    if (s === key || s.includes(key) || key.includes(s)) {
      return pe;
    }
  }

  return undefined;
}

/**
 * Evaluates valuation status and multiple assessment relative to sector P/E.
 */
export function evaluateValuation(
  pe?: number,
  sectorPe?: number
): { status: 'Undervalued' | 'Fair' | 'Elevated' | 'N/A'; assessment: string } {
  if (!pe || pe <= 0) {
    return { status: 'N/A', assessment: 'Valuation data not available' };
  }

  if (!sectorPe || sectorPe <= 0) {
    return { status: 'Fair', assessment: 'Aligned with broader market multiples' };
  }

  const ratio = pe / sectorPe;
  if (ratio < 0.82) {
    return { status: 'Undervalued', assessment: 'Attractive valuation margin of safety' };
  } else if (ratio > 1.25) {
    return { status: 'Elevated', assessment: 'Trading at rich sector premium' };
  } else {
    return { status: 'Fair', assessment: 'Aligned with sector multiples' };
  }
}
