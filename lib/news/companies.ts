import type { NewsCompany } from '@/types/news';

// ── Known Indian company name → symbol mappings ───────────────────────────────
const COMPANY_ALIASES: Record<string, { name: string; symbol: string }> = {
  // Tata Group
  tcs: { name: 'Tata Consultancy Services', symbol: 'TCS' },
  'tata consultancy': { name: 'Tata Consultancy Services', symbol: 'TCS' },
  'tata consultancy services': { name: 'Tata Consultancy Services', symbol: 'TCS' },
  'tata motors': { name: 'Tata Motors', symbol: 'TATAMOTORS' },
  'tata steel': { name: 'Tata Steel', symbol: 'TATASTEEL' },
  'tata power': { name: 'Tata Power', symbol: 'TATAPOWER' },
  'titan': { name: 'Titan Company', symbol: 'TITAN' },
  'titan company': { name: 'Titan Company', symbol: 'TITAN' },

  // Reliance
  ril: { name: 'Reliance Industries', symbol: 'RELIANCE' },
  reliance: { name: 'Reliance Industries', symbol: 'RELIANCE' },
  'reliance industries': { name: 'Reliance Industries', symbol: 'RELIANCE' },
  jio: { name: 'Reliance Industries', symbol: 'RELIANCE' },

  // IT
  infosys: { name: 'Infosys', symbol: 'INFY' },
  infy: { name: 'Infosys', symbol: 'INFY' },
  wipro: { name: 'Wipro', symbol: 'WIPRO' },
  hcl: { name: 'HCL Technologies', symbol: 'HCLTECH' },
  'hcl technologies': { name: 'HCL Technologies', symbol: 'HCLTECH' },
  'tech mahindra': { name: 'Tech Mahindra', symbol: 'TECHM' },
  ltimindtree: { name: 'LTIMindtree', symbol: 'LTIM' },
  mphasis: { name: 'Mphasis', symbol: 'MPHASIS' },

  // FMCG
  itc: { name: 'ITC Limited', symbol: 'ITC' },
  'itc limited': { name: 'ITC Limited', symbol: 'ITC' },
  hul: { name: 'Hindustan Unilever', symbol: 'HINDUNILVR' },
  'hindustan unilever': { name: 'Hindustan Unilever', symbol: 'HINDUNILVR' },
  'godrej consumer': { name: 'Godrej Consumer Products', symbol: 'GODREJCP' },
  'godrej consumer products': { name: 'Godrej Consumer Products', symbol: 'GODREJCP' },
  gcpl: { name: 'Godrej Consumer Products', symbol: 'GODREJCP' },
  'dabur': { name: 'Dabur India', symbol: 'DABUR' },
  marico: { name: 'Marico', symbol: 'MARICO' },
  britannia: { name: 'Britannia Industries', symbol: 'BRITANNIA' },
  nestle: { name: 'Nestle India', symbol: 'NESTLEIND' },
  'colgate': { name: 'Colgate-Palmolive India', symbol: 'COLPAL' },

  // Banks
  hdfc: { name: 'HDFC Bank', symbol: 'HDFCBANK' },
  'hdfc bank': { name: 'HDFC Bank', symbol: 'HDFCBANK' },
  icici: { name: 'ICICI Bank', symbol: 'ICICIBANK' },
  'icici bank': { name: 'ICICI Bank', symbol: 'ICICIBANK' },
  sbi: { name: 'State Bank of India', symbol: 'SBIN' },
  'state bank': { name: 'State Bank of India', symbol: 'SBIN' },
  'state bank of india': { name: 'State Bank of India', symbol: 'SBIN' },
  kotak: { name: 'Kotak Mahindra Bank', symbol: 'KOTAKBANK' },
  'kotak mahindra': { name: 'Kotak Mahindra Bank', symbol: 'KOTAKBANK' },
  axis: { name: 'Axis Bank', symbol: 'AXISBANK' },
  'axis bank': { name: 'Axis Bank', symbol: 'AXISBANK' },
  'bajaj finance': { name: 'Bajaj Finance', symbol: 'BAJFINANCE' },
  bajajfinserv: { name: 'Bajaj Finserv', symbol: 'BAJAJFINSV' },

  // Pharma
  'sun pharma': { name: 'Sun Pharmaceutical Industries', symbol: 'SUNPHARMA' },
  'sun pharmaceutical': { name: 'Sun Pharmaceutical Industries', symbol: 'SUNPHARMA' },
  'dr reddy': { name: "Dr. Reddy's Laboratories", symbol: 'DRREDDY' },
  "dr reddy's": { name: "Dr. Reddy's Laboratories", symbol: 'DRREDDY' },
  cipla: { name: 'Cipla', symbol: 'CIPLA' },
  divi: { name: "Divi's Laboratories", symbol: 'DIVISLAB' },

  // Auto
  'maruti': { name: 'Maruti Suzuki', symbol: 'MARUTI' },
  'maruti suzuki': { name: 'Maruti Suzuki', symbol: 'MARUTI' },
  'hero motocorp': { name: 'Hero MotoCorp', symbol: 'HEROMOTOCO' },
  'bajaj auto': { name: 'Bajaj Auto', symbol: 'BAJAJ-AUTO' },
  eicher: { name: 'Eicher Motors', symbol: 'EICHERMOT' },
  mahindra: { name: 'Mahindra & Mahindra', symbol: 'M&M' },
  'm&m': { name: 'Mahindra & Mahindra', symbol: 'M&M' },

  // Others
  'asian paints': { name: 'Asian Paints', symbol: 'ASIANPAINT' },
  ultratech: { name: 'UltraTech Cement', symbol: 'ULTRACEMCO' },
  'ultratech cement': { name: 'UltraTech Cement', symbol: 'ULTRACEMCO' },
  jsw: { name: 'JSW Steel', symbol: 'JSWSTEEL' },
  'jsw steel': { name: 'JSW Steel', symbol: 'JSWSTEEL' },
  ongc: { name: 'Oil & Natural Gas Corporation', symbol: 'ONGC' },
  ntpc: { name: 'NTPC', symbol: 'NTPC' },
  adani: { name: 'Adani Enterprises', symbol: 'ADANIENT' },
  zomato: { name: 'Zomato', symbol: 'ZOMATO' },
  nykaa: { name: 'FSN E-Commerce Ventures (Nykaa)', symbol: 'NYKAA' },
  paytm: { name: 'One 97 Communications (Paytm)', symbol: 'PAYTM' },
};

/**
 * Deterministically extract company mentions from article text.
 * Matches against known aliases first, then returns results sorted by confidence.
 */
export function extractCompanies(
  text: string,
  portfolioSymbols: string[] = []
): NewsCompany[] {
  const lowerText = text.toLowerCase();
  const found = new Map<string, NewsCompany>();

  for (const [alias, { name, symbol }] of Object.entries(COMPANY_ALIASES)) {
    // Use word boundary matching to avoid partial matches
    const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
    if (pattern.test(lowerText)) {
      if (!found.has(symbol)) {
        const confidence = portfolioSymbols.includes(symbol) ? 0.98 : 0.95;
        found.set(symbol, { name, symbol, confidence });
      }
    }
  }

  return Array.from(found.values()).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if any company in the article matches the user's portfolio holdings.
 */
export function isPortfolioRelevant(
  companies: NewsCompany[],
  portfolioSymbols: string[]
): boolean {
  if (portfolioSymbols.length === 0) return false;
  return companies.some((c) => c.symbol && portfolioSymbols.includes(c.symbol));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
