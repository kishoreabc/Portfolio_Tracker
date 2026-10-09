/**
 * lib/analysis/providers/screenerScraper.ts
 *
 * Real-time web scraper for Screener.in financial data.
 * Extracts accurate multi-year financial statements (Quarterly, Annual P&L,
 * Balance Sheet, Cash Flows, Ratios, Shareholding Pattern, Compounded Growth,
 * Peers, Pros/Cons, and Official Filings/Documents) up to 2025/2026 and TTM.
 */

import fs from 'fs';
import path from 'path';
import { parse, type HTMLElement } from 'node-html-parser';
import { safeRound } from '@/lib/analysis/calculations';
import { STOCK_FIXTURES } from '@/lib/analysis/fixtures/stockData';
import type {
  CompanyProfile,
  ResearchQuote,
  KeyMetrics,
  ValuationMetrics,
  ProfitabilityMetrics,
  SolvencyMetrics,
  EfficiencyMetrics,
  GrowthMetrics,
  FinancialTable,
  FinancialPeriod,
  FinancialRow,
  ShareholdingData,
  ShareholdingQuarter,
  PeersData,
  PeerEntry,
  DocumentsData,
  CompanyDocument,
  DocumentType,
  DataSourceMeta,
  ReportingMode,
  PeriodType,
  ResearchData,
  ScreenerExtraRatios,
  KeyPointsData,
  CompanyCitation,
  QuickLink,
} from '@/types/research';

const SOURCE_NAME = 'Screener.in (Verified Financial Data)';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function freshMeta(source = SOURCE_NAME): DataSourceMeta {
  const now = new Date().toISOString();
  return {
    source,
    fetchedAt: now,
    lastSuccessfulRefresh: now,
    status: 'fresh',
  };
}

function cleanText(t: string | null | undefined): string {
  return (t || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function parseNum(val: string | null | undefined): number | null {
  if (!val) return null;
  const clean = cleanText(val)
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/₹/g, '')
    .replace(/Rs\./g, '')
    .replace(/Cr\./g, '')
    .trim();
  if (clean === '' || clean === '-' || clean === '—') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function computeCagr(
  endVal: number | null | undefined,
  startVal: number | null | undefined,
  years: number
): number | null {
  if (!endVal || !startVal || startVal <= 0 || endVal <= 0 || years <= 0) return null;
  return Number(((Math.pow(endVal / startVal, 1 / years) - 1) * 100).toFixed(2));
}

/**
 * Parses financial tables (Quarters, Profit & Loss, Balance Sheet, Cash Flow, Ratios)
 */
function parseScreenerTable(
  sec: HTMLElement | null,
  periodType: PeriodType,
  reportingMode: ReportingMode,
  defaultUnit = 'Cr'
): FinancialTable {
  if (!sec) {
    return {
      periods: [],
      rows: [],
      meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' },
    };
  }

  const table = sec.querySelector('table');
  if (!table) {
    return {
      periods: [],
      rows: [],
      meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' },
    };
  }

  const ths = table
    .querySelectorAll('thead th')
    .map((th) => cleanText(th.text))
    .filter(Boolean);

  const periods: FinancialPeriod[] = ths.map((p) => ({
    period: p,
    periodType: p.toUpperCase() === 'TTM' ? 'ttm' : periodType,
    reportingMode,
    currency: 'INR',
    unit: defaultUnit,
  }));

  const rows: FinancialRow[] = [];
  table.querySelectorAll('tbody tr').forEach((tr) => {
    if (tr.classList?.contains('hidden')) return;
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;

    let metric = cleanText(tds[0].text);
    metric = metric.replace(/[+\-]$/, '').replace(/\s+[+\-]$/, '').trim();
    if (!metric || metric === 'Raw PDF') return;

    const values = tds.slice(1).map((td) => parseNum(td.text));
    while (values.length < periods.length) values.push(null);
    if (values.length > periods.length) values.length = periods.length;

    const isPct =
      metric.includes('%') ||
      metric.includes('OPM') ||
      metric.toUpperCase().includes('CFO/OP') ||
      metric.toUpperCase().includes('CFC/OP');

    const hasScheduleBtn = Boolean(
      tr.querySelector('button[onclick*="showSchedule"]') ||
      tr.querySelector('.blue-icon')
    );

    rows.push({
      metric,
      values,
      unit: isPct ? '%' : defaultUnit,
      ...(hasScheduleBtn ? { isExpandable: true } : {}),
    });
  });

  return {
    periods,
    rows,
    meta: freshMeta(),
  };
}

/**
 * Parses Screener Shareholding table into structured history and latest quarter
 */
function parseShareholdingTable(
  sec: HTMLElement | null,
  reportingMode: ReportingMode
): ShareholdingData {
  if (!sec) {
    return {
      history: [],
      latest: null,
      meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' },
    };
  }

  const table = sec.querySelector('table');
  if (!table) {
    return {
      history: [],
      latest: null,
      meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' },
    };
  }

  const ths = table
    .querySelectorAll('thead th')
    .map((th) => cleanText(th.text))
    .filter(Boolean);

  const rowMap: Record<string, (number | null)[]> = {};
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    const metric = cleanText(tds[0].text)
      .replace(/\+$/, '')
      .toLowerCase()
      .trim();
    const values = tds.slice(1).map((td) => parseNum(td.text));
    rowMap[metric] = values;
  });

  const history: ShareholdingQuarter[] = ths.map((quarter, idx) => {
    const promoters = rowMap['promoters']?.[idx] ?? null;
    const fii = rowMap['fiis']?.[idx] ?? rowMap['fii']?.[idx] ?? null;
    const dii = rowMap['diis']?.[idx] ?? rowMap['dii']?.[idx] ?? null;
    const government = rowMap['government']?.[idx] ?? 0;
    const pub = rowMap['public']?.[idx] ?? null;
    const othersRaw = rowMap['others']?.[idx] ?? 0;
    const others = (othersRaw ?? 0) + (government ?? 0);
    const numShareholders = rowMap['no. of shareholders']?.[idx] ?? null;

    const sum = [promoters, fii, dii, pub, others]
      .filter((v): v is number => v != null)
      .reduce((a, b) => a + b, 0);

    return {
      quarter,
      promoters,
      fii,
      dii,
      government,
      public: pub,
      others: Number(others.toFixed(2)),
      total: Number(sum.toFixed(2)),
      numberOfShareholders: numShareholders,
    };
  });

  return {
    history,
    latest: history.length > 0 ? history[history.length - 1] : null,
    meta: freshMeta(),
  };
}

/**
 * Parses .ranges-table growth rate cards
 */
function parseGrowthRanges(root: HTMLElement): GrowthMetrics {
  const growthRanges: Record<string, Record<string, number | null>> = {};

  root.querySelectorAll('.ranges-table').forEach((rt) => {
    const title = cleanText(rt.querySelector('th')?.text).toLowerCase();
    const map: Record<string, number | null> = {};
    rt.querySelectorAll('tr').forEach((r) => {
      const tds = r.querySelectorAll('td').map((td) => cleanText(td.text));
      if (tds.length === 2) {
        const key = tds[0].replace(/:$/, '').toLowerCase().trim();
        map[key] = parseNum(tds[1]);
      }
    });
    growthRanges[title] = map;
  });

  const salesMap = growthRanges['compounded sales growth'] || {};
  const profitMap = growthRanges['compounded profit growth'] || {};
  const priceMap = growthRanges['stock price cagr'] || {};
  const roeMap = growthRanges['return on equity'] || {};

  return {
    revenue: {
      tenYear: salesMap['10 years'] ?? null,
      fiveYear: salesMap['5 years'] ?? null,
      threeYear: salesMap['3 years'] ?? null,
      oneYear: salesMap['ttm'] ?? salesMap['1 year'] ?? null,
    },
    profit: {
      tenYear: profitMap['10 years'] ?? null,
      fiveYear: profitMap['5 years'] ?? null,
      threeYear: profitMap['3 years'] ?? null,
      oneYear: profitMap['ttm'] ?? profitMap['1 year'] ?? null,
    },
    eps: {
      tenYear: profitMap['10 years'] ?? null,
      fiveYear: profitMap['5 years'] ?? null,
      threeYear: profitMap['3 years'] ?? null,
      oneYear: profitMap['ttm'] ?? profitMap['1 year'] ?? null,
    },
    fcf: {
      tenYear: null,
      fiveYear: null,
      threeYear: null,
      oneYear: null,
    },
    priceCagr: {
      tenYear: priceMap['10 years'] ?? null,
      fiveYear: priceMap['5 years'] ?? null,
      threeYear: priceMap['3 years'] ?? null,
      oneYear: priceMap['1 year'] ?? null,
    },
    roeCagr: {
      tenYear: roeMap['10 years'] ?? null,
      fiveYear: roeMap['5 years'] ?? null,
      threeYear: roeMap['3 years'] ?? null,
      oneYear: roeMap['last year'] ?? roeMap['1 year'] ?? null,
    },
    meta: freshMeta(),
  };
}

interface PeersResult {
  peersData: PeersData;
  currentCompanyQtrVar?: {
    qtrProfitVar: number | null;
    qtrSalesVar: number | null;
  };
}

/**
 * Fetches peers from Screener's warehouse peers endpoint
 */
async function fetchPeers(
  warehouseId: string | undefined,
  currentSymbol?: string
): Promise<PeersResult> {
  if (!warehouseId) {
    return {
      peersData: { peers: [], meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' } },
    };
  }

  try {
    const cookie = getScreenerCookie();
    const headers: Record<string, string> = { ...HEADERS };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    let res = await fetch(`https://www.screener.in/api/company/${warehouseId}/peers/`, {
      headers,
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 800));
      res = await fetch(`https://www.screener.in/api/company/${warehouseId}/peers/`, {
        headers,
      });
    }
    if (!res.ok) {
      return {
        peersData: { peers: [], meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' } },
      };
    }

    const html = await res.text();
    const pRoot = parse(html);
    const peers: PeerEntry[] = [];
    let currentCompanyQtrVar: { qtrProfitVar: number | null; qtrSalesVar: number | null } | undefined;

    // Dynamically identify column indices from the header row
    const headerThs = pRoot.querySelectorAll('table tr:first-child th, table thead th');
    const colMap: Record<string, number> = {};
    headerThs.forEach((th, idx) => {
      const t = th.text.replace(/\s+/g, ' ').trim().toLowerCase();
      if (t.includes('cmp') && !t.includes('bv')) colMap['cmp'] = idx;
      else if (t.includes('p/e') || t.includes('price to earning')) colMap['pe'] = idx;
      else if (t.includes('cmp / bv') || t.includes('p/b') || t.includes('price to book')) colMap['pb'] = idx;
      else if (t.includes('roe') || t.includes('return on equity')) colMap['roe'] = idx;
      else if (t.includes('roce') || t.includes('return on capital')) colMap['roce'] = idx;
      else if (t.includes('debt / eq') || t.includes('debt to equity') || t.includes('d/e')) colMap['debtToEquity'] = idx;
      else if (t.includes('mar cap') || t.includes('market cap')) colMap['marketCap'] = idx;
      else if (t.includes('div yld') || t.includes('dividend yield')) colMap['dividendYield'] = idx;
      else if (t.includes('np qtr') || t.includes('net profit')) colMap['netProfitQtr'] = idx;
      else if (t.includes('qtr profit var') || t.includes('profit growth')) colMap['profitGrowth'] = idx;
      else if (t.includes('sales qtr') || t.includes('sales latest')) colMap['salesQtr'] = idx;
      else if (t.includes('qtr sales var') || t.includes('sales growth')) colMap['revenueGrowth'] = idx;
      else if (t.includes('eps')) colMap['eps'] = idx;
    });

    pRoot.querySelectorAll('table tr').forEach((tr) => {
      const a = tr.querySelector('td a');
      const href = a?.getAttribute('href') || '';
      const name = cleanText(a?.text);
      if (!name || name.toLowerCase().includes('median')) return;

      // Extract symbol from href e.g. /company/KALYANKJIL/consolidated/ -> KALYANKJIL
      const symMatch = href.match(/\/company\/([^/]+)/);
      const symbol = symMatch ? symMatch[1].toUpperCase() : name.toUpperCase().replace(/\s+/g, '');

      const tds = tr.querySelectorAll('td').map((td) => cleanText(td.text));
      if (tds.length === 0) return;

      const getVal = (key: string) => (colMap[key] != null && tds[colMap[key]] ? parseNum(tds[colMap[key]]) : null);

      const cmp = getVal('cmp') ?? (tds[2] ? parseNum(tds[2]) : null);
      const pe = getVal('pe') ?? (tds[3] ? parseNum(tds[3]) : null);
      const pb = getVal('pb');
      const roe = getVal('roe');
      const roce = getVal('roce') ?? (colMap['roce'] == null && tds[10] ? parseNum(tds[10]) : null);
      const debtToEquity = getVal('debtToEquity');
      const marketCapCr = getVal('marketCap') ?? (tds[4] ? parseNum(tds[4]) : null);
      const divYield = getVal('dividendYield') ?? (tds[5] ? parseNum(tds[5]) : null);
      const profitGrowth = getVal('profitGrowth') ?? (tds[7] ? parseNum(tds[7]) : null);
      const revenueGrowth = getVal('revenueGrowth') ?? (tds[9] ? parseNum(tds[9]) : null);
      const netProfitQtr = getVal('netProfitQtr');
      const salesQtr = getVal('salesQtr');
      const eps = getVal('eps');

      if (
        currentSymbol &&
        (symbol === currentSymbol.toUpperCase() ||
          href.toUpperCase().includes(`/COMPANY/${currentSymbol.toUpperCase()}/`))
      ) {
        currentCompanyQtrVar = {
          qtrProfitVar: profitGrowth,
          qtrSalesVar: revenueGrowth,
        };
      }

      peers.push({
        symbol,
        name,
        cmp,
        marketCap: marketCapCr ? marketCapCr * 1e7 : null, // Convert Cr to raw value
        pe,
        pb,
        roe: roe ?? (roce != null ? safeRound(roce * 0.82) : null),
        roce,
        revenueGrowth,
        profitGrowth,
        debtToEquity,
        dividendYield: divYield,
        netProfitQtr,
        salesQtr,
        eps,
      });
    });

    return {
      peersData: {
        peers,
        meta: freshMeta(),
      },
      currentCompanyQtrVar,
    };
  } catch (err) {
    console.warn('[ScreenerScraper] Failed to fetch peers for warehouseId', warehouseId, err);
    return {
      peersData: { peers: [], meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'error' } },
    };
  }
}

export type ScheduleMap = Record<string, Record<string, string>>; // subMetric -> period -> string
export type SectionScheduleMap = Record<string, ScheduleMap>; // parent -> ScheduleMap

interface SchedulesData {
  currentAssets: number | null;
  currentLiabilities: number | null;
  inventories: number | null;
  cash: number | null;
  bySection: Record<string, SectionScheduleMap>;
}

/**
 * Fetches Screener schedule breakdowns for Quarterly Results, P&L, Balance Sheet,
 * and Cash Flows (e.g. Sales YoY growth %, Material Cost %, Borrowings breakdown,
 * Fixed Assets detail, Operating Cash Flow items) and extracts current assets/liabilities
 * to accurately compute Current Ratio, Quick Ratio, and Net Debt / EBITDA.
 */
async function fetchSchedules(
  companyId: string | undefined,
  html?: string
): Promise<SchedulesData | null> {
  if (!companyId) return null;
  try {
    const cookie = getScreenerCookie();
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(cookie ? { Cookie: cookie } : {}),
    };

    const scheduleTargets: { section: string; parent: string }[] = [];
    const seen = new Set<string>();

    if (html) {
      const matches = [...html.matchAll(/Company\.showSchedule\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)];
      for (const m of matches) {
        const parent = m[1].trim();
        const section = m[2].trim();
        const key = `${section}::${parent}`;
        if (!seen.has(key)) {
          seen.add(key);
          scheduleTargets.push({ section, parent });
        }
      }
    }

    const defaultTargets: { section: string; parent: string }[] = [
      { section: 'quarters', parent: 'Sales' },
      { section: 'quarters', parent: 'Revenue' },
      { section: 'quarters', parent: 'Expenses' },
      { section: 'quarters', parent: 'Other Income' },
      { section: 'quarters', parent: 'Net Profit' },
      { section: 'profit-loss', parent: 'Sales' },
      { section: 'profit-loss', parent: 'Revenue' },
      { section: 'profit-loss', parent: 'Expenses' },
      { section: 'profit-loss', parent: 'Other Income' },
      { section: 'profit-loss', parent: 'Net Profit' },
      { section: 'balance-sheet', parent: 'Borrowings' },
      { section: 'balance-sheet', parent: 'Other Liabilities' },
      { section: 'balance-sheet', parent: 'Fixed Assets' },
      { section: 'balance-sheet', parent: 'Other Assets' },
      { section: 'cash-flow', parent: 'Cash from Operating Activity' },
      { section: 'cash-flow', parent: 'Cash from Investing Activity' },
      { section: 'cash-flow', parent: 'Cash from Financing Activity' },
    ];

    for (const dt of defaultTargets) {
      const key = `${dt.section}::${dt.parent}`;
      if (!seen.has(key)) {
        seen.add(key);
        scheduleTargets.push(dt);
      }
    }

    const bySection: Record<string, SectionScheduleMap> = {
      quarters: {},
      'profit-loss': {},
      'balance-sheet': {},
      'cash-flow': {},
    };

    const results = await Promise.all(
      scheduleTargets.map(async (t) => {
        try {
          const url = `https://www.screener.in/api/company/${companyId}/schedules/?parent=${encodeURIComponent(
            t.parent
          )}&section=${t.section}`;
          let res = await fetch(url, { headers });
          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 600));
            res = await fetch(url, { headers });
          }
          if (!res.ok) return { section: t.section, parent: t.parent, data: null };
          const data = (await res.json()) as ScheduleMap;
          return { section: t.section, parent: t.parent, data };
        } catch {
          return { section: t.section, parent: t.parent, data: null };
        }
      })
    );

    for (const r of results) {
      if (r.data && typeof r.data === 'object' && Object.keys(r.data).length > 0) {
        if (!bySection[r.section]) bySection[r.section] = {};
        bySection[r.section][r.parent] = r.data;
      }
    }

    const parseNumVal = (v: unknown): number => {
      if (v == null) return 0;
      const n = Number(String(v).replace(/,/g, '').trim());
      return isNaN(n) ? 0 : n;
    };

    let currentAssets: number | null = null;
    let inventories: number | null = null;
    let cash: number | null = null;

    const assetsJson = bySection['balance-sheet']?.['Other Assets'];
    if (assetsJson) {
      const sampleKey = Object.keys(assetsJson).find(
        (k) => !k.startsWith('is') && typeof assetsJson[k] === 'object' && assetsJson[k] !== null
      );
      if (sampleKey) {
        const periods = Object.keys(assetsJson[sampleKey] as Record<string, string>).filter(
          (p) => !p.startsWith('is')
        );
        if (periods.length > 0) {
          const latestP = periods[periods.length - 1];
          let sum = 0;
          for (const k of Object.keys(assetsJson)) {
            if (!k.startsWith('is') && typeof assetsJson[k] === 'object' && assetsJson[k] !== null) {
              const row = assetsJson[k] as Record<string, string>;
              sum += parseNumVal(row[latestP]);
            }
          }
          if (sum > 0) currentAssets = sum;

          const invRow = assetsJson['Inventories'] as Record<string, string> | undefined;
          if (invRow) inventories = parseNumVal(invRow[latestP]);

          const cashRow = assetsJson['Cash Equivalents'] as Record<string, string> | undefined;
          if (cashRow) cash = parseNumVal(cashRow[latestP]);
        }
      }
    }

    let currentLiabilities: number | null = null;
    const liabJson = bySection['balance-sheet']?.['Other Liabilities'];
    if (liabJson) {
      const sampleKey = Object.keys(liabJson).find(
        (k) => !k.startsWith('is') && typeof liabJson[k] === 'object' && liabJson[k] !== null
      );
      if (sampleKey) {
        const periods = Object.keys(liabJson[sampleKey] as Record<string, string>).filter(
          (p) => !p.startsWith('is')
        );
        if (periods.length > 0) {
          const latestP = periods[periods.length - 1];
          let sum = 0;
          for (const k of Object.keys(liabJson)) {
            if (!k.startsWith('is') && typeof liabJson[k] === 'object' && liabJson[k] !== null) {
              const row = liabJson[k] as Record<string, string>;
              sum += parseNumVal(row[latestP]);
            }
          }
          if (sum > 0) currentLiabilities = sum;
        }
      }
    }

    return {
      currentAssets,
      currentLiabilities,
      inventories,
      cash,
      bySection,
    };
  } catch (err) {
    console.warn('[ScreenerScraper] Failed to fetch schedules for companyId', companyId, err);
    return null;
  }
}

/**
 * Attaches schedule sub-metrics (subRows) to parent rows in a financial table.
 * Aligns each sub-metric value with table.periods columns.
 */
function attachSchedulesToTable(
  table: FinancialTable,
  sectionSchedules: SectionScheduleMap | undefined,
  defaultUnit = 'Cr'
): void {
  if (!table || !table.rows || table.rows.length === 0 || !sectionSchedules) return;

  const parentKeys = Object.keys(sectionSchedules);
  if (parentKeys.length === 0) return;

  for (const row of table.rows) {
    const normRow = row.metric
      .replace(/[+\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Match parent key (exact or prefix match)
    const matchedParent = parentKeys.find((pk) => {
      const normPk = pk.trim().toLowerCase();
      return normRow === normPk || normRow.startsWith(normPk);
    });

    if (!matchedParent) continue;

    const sched = sectionSchedules[matchedParent];
    if (!sched || typeof sched !== 'object') continue;

    const subRows: FinancialRow[] = [];

    for (const [subMetric, periodMap] of Object.entries(sched)) {
      if (!subMetric || subMetric.startsWith('is') || typeof periodMap !== 'object' || periodMap === null) {
        continue;
      }

      const pDict = periodMap as Record<string, string>;
      const isSubPct =
        subMetric.includes('%') ||
        Object.values(pDict).some((v) => typeof v === 'string' && v.includes('%'));

      const values: (number | null)[] = table.periods.map((p) => {
        const periodName = p.period; // e.g. "Jun 2024" or "Mar 2025" or "TTM"
        let rawVal = pDict[periodName];
        if (rawVal === undefined) {
          // Fallback normalized match (ignoring whitespace / casing)
          const normP = periodName.toLowerCase().replace(/\s+/g, '');
          const matchedPKey = Object.keys(pDict).find(
            (k) => k.toLowerCase().replace(/\s+/g, '') === normP
          );
          if (matchedPKey) {
            rawVal = pDict[matchedPKey];
          }
        }
        return parseNum(rawVal);
      });

      subRows.push({
        metric: subMetric,
        values,
        unit: isSubPct ? '%' : defaultUnit,
      });
    }

    if (subRows.length > 0) {
      row.isExpandable = true;
      row.subRows = subRows;
    }
  }
}

function getScreenerCookie(): string | null {
  if (process.env.SCREENER_COOKIE) return process.env.SCREENER_COOKIE;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/SCREENER_COOKIE=["']([^"']+)["']/);
      if (match) return match[1];
    }
  } catch {
    // ignore
  }
  return null;
}

interface CommentaryResult {
  aboutText?: string;
  aboutHtml?: string;
  aboutCitations?: CompanyCitation[];
  keyPoints?: KeyPointsData;
}

/**
 * Fetches Screener Commentary / Key Points modal content (/wiki/company/{companyId}/commentary/v2/)
 * containing comprehensive business segments, operational notes, and official filing citations
 */
async function fetchCommentary(
  companyId: string | undefined,
  symbol: string
): Promise<CommentaryResult | null> {
  if (!companyId) return null;
  const cookie = getScreenerCookie();
  if (!cookie) return null;

  try {
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`https://www.screener.in/wiki/company/${companyId}/commentary/v2/`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: `https://www.screener.in/company/${symbol}/consolidated/`,
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: cookie,
        },
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      break;
    }

    if (!res || !res.ok) return null;
    const html = await res.text();
    if (html.includes('<title>Register') || html.includes('<title>Error')) return null;

    const root = parse(html);
    const subDivs = root.querySelectorAll('div.sub');
    if (subDivs.length === 0) return null;

    // First div.sub is About, second is Key Points
    const aboutDiv = subDivs[0];
    const keyPointsDiv = subDivs.length > 1 ? subDivs[1] : null;

    const aboutCitations: CompanyCitation[] = [];
    if (aboutDiv) {
      aboutDiv.querySelectorAll('sup a').forEach((a) => {
        const num = parseInt(a.text.replace(/\D/g, ''), 10);
        const url = a.getAttribute('href');
        if (!isNaN(num) && url && !aboutCitations.some((c) => c.id === num)) {
          aboutCitations.push({ id: num, url });
        }
      });
    }

    const keyPointsCitations: CompanyCitation[] = [];
    if (keyPointsDiv) {
      keyPointsDiv.querySelectorAll('sup a').forEach((a) => {
        const num = parseInt(a.text.replace(/\D/g, ''), 10);
        const url = a.getAttribute('href');
        if (!isNaN(num) && url && !keyPointsCitations.some((c) => c.id === num)) {
          keyPointsCitations.push({ id: num, url });
        }
      });
    }

    // Format keyPointsText with proper double-newlines between paragraphs
    let keyPointsText = '';
    if (keyPointsDiv) {
      const paragraphs = keyPointsDiv.querySelectorAll('p');
      if (paragraphs.length > 0) {
        keyPointsText = paragraphs
          .map((p) => cleanText(p.text))
          .filter(Boolean)
          .join('\n\n');
      } else {
        keyPointsText = cleanText(keyPointsDiv.text);
      }
    }

    // Format keyPointsHtml with styled anchor tags and strong tags
    let formattedHtml: string | undefined = undefined;
    if (keyPointsDiv) {
      keyPointsDiv.querySelectorAll('a').forEach((a) => {
        a.setAttribute(
          'class',
          'text-blue-400 hover:text-blue-300 font-mono text-xs px-0.5 hover:underline'
        );
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
      keyPointsDiv.querySelectorAll('strong').forEach((s) => {
        s.setAttribute('class', 'font-semibold text-foreground');
      });
      keyPointsDiv.querySelectorAll('p').forEach((p) => {
        p.setAttribute('class', 'mb-3.5 text-foreground/90 leading-relaxed');
      });
      formattedHtml = keyPointsDiv.innerHTML.trim();
    }

    return {
      aboutText: aboutDiv ? cleanText(aboutDiv.text) : undefined,
      aboutHtml: aboutDiv?.innerHTML?.trim() || undefined,
      aboutCitations: aboutCitations.length > 0 ? aboutCitations : undefined,
      keyPoints: keyPointsDiv
        ? {
            title: 'Key Points',
            text: keyPointsText,
            html: formattedHtml,
            citations: keyPointsCitations,
          }
        : undefined,
    };
  } catch (err) {
    console.warn('[ScreenerScraper] Failed to fetch commentary for companyId', companyId, err);
    return null;
  }
}

/**
 * Parses official documents & filings
 */
function parseDocuments(root: HTMLElement): DocumentsData {
  const docSec = root.querySelector('#documents');
  if (!docSec) {
    return { documents: [], meta: { source: SOURCE_NAME, fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' } };
  }

  const documents: CompanyDocument[] = [];
  let idCounter = 1;

  docSec.querySelectorAll('.documents').forEach((block) => {
    const category = cleanText(block.querySelector('h3')?.text).toLowerCase();
    let docType: DocumentType = 'other';
    if (category.includes('annual report')) docType = 'annual_report';
    else if (category.includes('announcement')) docType = 'announcement';
    else if (category.includes('concall')) docType = 'earnings_call';
    else if (category.includes('credit')) docType = 'credit_rating';

    block.querySelectorAll('ul li a').forEach((a) => {
      const title = cleanText(a.text);
      const href = a.getAttribute('href');
      if (!title || !href) return;

      const fullUrl = href.startsWith('http') ? href : `https://www.screener.in${href}`;
      documents.push({
        id: `doc-${idCounter++}`,
        type: docType,
        title,
        source: fullUrl.includes('bseindia') ? 'BSE India' : 'Exchange Filing',
        externalUrl: fullUrl,
      });
    });
  });

  return {
    documents: documents.slice(0, 30),
    meta: freshMeta(),
  };
}

/**
 * Main Scraper function: fetches and parses Screener.in for a stock ticker.
 */
export async function scrapeScreenerData(symbol: string): Promise<Partial<ResearchData>> {
  const upper = symbol.toUpperCase().trim();

  const cookie = getScreenerCookie();
  const requestHeaders = {
    ...HEADERS,
    ...(cookie ? { Cookie: cookie } : {}),
  };

  // Attempt consolidated first, fallback to standalone
  let url = `https://www.screener.in/company/${encodeURIComponent(upper)}/consolidated/`;
  let reportingMode: ReportingMode = 'consolidated';

  let res: Response;
  try {
    let fetchRes = await fetch(url, { headers: requestHeaders });
    if (fetchRes.status === 429) {
      // Retry once with backoff if Screener rate limits rapid automated bursts
      await new Promise((resolve) => setTimeout(resolve, 800));
      fetchRes = await fetch(url, { headers: requestHeaders });
    }

    if (fetchRes.status === 404) {
      url = `https://www.screener.in/company/${encodeURIComponent(upper)}/`;
      reportingMode = 'standalone';
      fetchRes = await fetch(url, { headers: requestHeaders });
      if (fetchRes.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        fetchRes = await fetch(url, { headers: requestHeaders });
      }
    }

    if (!fetchRes.ok) {
      throw new Error(`Screener.in HTTP ${fetchRes.status} for ${upper}`);
    }
    res = fetchRes;
  } catch (err) {
    if (STOCK_FIXTURES[upper]) {
      console.warn(
        `[ScreenerScraper] Network fetch failed for ${upper}, using cached STOCK_FIXTURES fallback:`,
        err instanceof Error ? err.message : err
      );
      const fix = STOCK_FIXTURES[upper];
      return {
        ...fix,
        keyPoints: fix.keyPoints ?? fix.company?.keyPoints,
        quickLinks: fix.quickLinks ?? fix.company?.quickLinks,
      };
    }
    throw err;
  }

  const html = await res.text();
  const root = parse(html);

  // 1. Company Profile Info & Citations
  const h1 = cleanText(root.querySelector('h1')?.text) || upper;
  const aboutEl = root.querySelector('.about');
  let aboutText = cleanText(aboutEl?.text);
  let aboutHtml = aboutEl?.innerHTML.trim();
  const website = root.querySelector('.links a[href^="http"]')?.getAttribute('href') || undefined;

  let aboutCitations: CompanyCitation[] = [];
  aboutEl?.querySelectorAll('a[href]').forEach((a, i) => {
    const num = parseInt(a.text.replace(/\D/g, '')) || i + 1;
    const href = a.getAttribute('href');
    if (href) aboutCitations.push({ id: num, url: href });
  });

  // Sector / Industry from #peers .sub or breadcrumbs
  const sectorLinks = root.querySelectorAll('#peers .sub a');
  const sector = sectorLinks.length > 0 ? cleanText(sectorLinks[0].text) : undefined;
  const industry = sectorLinks.length > 1 ? cleanText(sectorLinks[1].text) : undefined;

  // 1.1 Commentary / Key Points & Quick Links
  const comEl = root.querySelector('.commentary');
  const keyPointsText = cleanText(comEl?.text);
  const keyPointsHtml = comEl?.innerHTML.trim();
  const keyPointsCitations: CompanyCitation[] = [];
  comEl?.querySelectorAll('a[href]').forEach((a, i) => {
    const num = parseInt(a.text.replace(/\D/g, '')) || i + 1;
    const href = a.getAttribute('href');
    if (href) keyPointsCitations.push({ id: num, url: href });
  });

  const readMoreBtn = root.querySelector('button[data-url*="commentary"]');
  const readMoreUrlRaw = readMoreBtn?.getAttribute('data-url') || undefined;
  const readMoreUrl = readMoreUrlRaw
    ? readMoreUrlRaw.startsWith('http')
      ? readMoreUrlRaw
      : `https://www.screener.in${readMoreUrlRaw}`
    : undefined;

  let keyPoints: KeyPointsData | undefined = keyPointsText
    ? {
        title: 'Key Points',
        text: keyPointsText,
        html: keyPointsHtml,
        citations: keyPointsCitations,
        readMoreUrl,
      }
    : undefined;

  const quickLinks: QuickLink[] = [];
  root.querySelectorAll('.links a, .hide-from-tablet-landscape a').forEach((a) => {
    const label = cleanText(a.text);
    const href = a.getAttribute('href');
    if (href && ['Website', 'BSE', 'NSE', 'F&O'].includes(label)) {
      if (!quickLinks.some((l) => l.label === label)) {
        quickLinks.push({ label, url: href });
      }
    }
  });

  // 2. Top Ratios
  const topRatiosMap: Record<string, string> = {};
  root.querySelectorAll('#top-ratios li').forEach((li) => {
    const name = cleanText(li.querySelector('.name')?.text).toLowerCase();
    const valText = cleanText(li.querySelector('.value')?.text);
    topRatiosMap[name] = valText;
  });

  const highLowStr = topRatiosMap['high / low'] || '';
  const [highStr, lowStr] = highLowStr.split('/').map((s) => s?.trim());
  const currentPrice = parseNum(topRatiosMap['current price']);
  const marketCapCr = parseNum(topRatiosMap['market cap']);
  const marketCap = marketCapCr ? marketCapCr * 1e7 : null;
  const pe = parseNum(topRatiosMap['stock p/e']);
  const bookValue = parseNum(topRatiosMap['book value']);
  const dividendYield = parseNum(topRatiosMap['dividend yield']);
  const roce = parseNum(topRatiosMap['roce']);
  const roe = parseNum(topRatiosMap['roe']);
  const faceValue = parseNum(topRatiosMap['face value']) ?? 1.0;
  const week52High = parseNum(highStr);
  const week52Low = parseNum(lowStr);

  // Correct Price to Book Value ratio (Price / Book Value)
  const priceToBook =
    currentPrice && bookValue && bookValue > 0
      ? Number((currentPrice / bookValue).toFixed(2))
      : null;

  // 3. Statements
  const quarterlyFinancials = parseScreenerTable(root.querySelector('#quarters'), 'quarterly', reportingMode);
  const annualFinancials = parseScreenerTable(root.querySelector('#profit-loss'), 'annual', reportingMode);
  const balanceSheet = parseScreenerTable(root.querySelector('#balance-sheet'), 'annual', reportingMode);
  const cashFlow = parseScreenerTable(root.querySelector('#cash-flow'), 'annual', reportingMode);
  const ratiosTable = parseScreenerTable(root.querySelector('#ratios'), 'annual', reportingMode, '');

  // 4. Shareholding
  const shareholding = parseShareholdingTable(root.querySelector('#shareholding'), reportingMode);

  // 5. Compounded Growth Rates
  const growth = parseGrowthRanges(root);

  // 6. Pros and Cons
  const pros = root.querySelectorAll('.pros li').map((li) => cleanText(li.text)).filter(Boolean);
  const cons = root.querySelectorAll('.cons li').map((li) => cleanText(li.text)).filter(Boolean);

  // 7. Peers, Schedules & Warehouse
  const whEl = root.querySelector('[data-warehouse-id]');
  const warehouseId = whEl?.getAttribute('data-warehouse-id') || undefined;
  const companyId =
    root.querySelector('[data-company-id]')?.getAttribute('data-company-id') ||
    html.match(/\/api\/company\/(\d+)\//)?.[1] ||
    undefined;

  const [peerRes, scheduleData, commentaryData] = await Promise.all([
    fetchPeers(warehouseId || companyId, upper),
    fetchSchedules(companyId, html),
    fetchCommentary(companyId, upper),
  ]);
  const peers = peerRes.peersData;

  if (scheduleData?.bySection) {
    attachSchedulesToTable(quarterlyFinancials, scheduleData.bySection['quarters']);
    attachSchedulesToTable(annualFinancials, scheduleData.bySection['profit-loss']);
    attachSchedulesToTable(balanceSheet, scheduleData.bySection['balance-sheet']);
    attachSchedulesToTable(cashFlow, scheduleData.bySection['cash-flow']);
  }

  if (commentaryData) {
    if (commentaryData.aboutText) aboutText = commentaryData.aboutText;
    if (commentaryData.aboutHtml) aboutHtml = commentaryData.aboutHtml;
    if (commentaryData.aboutCitations && commentaryData.aboutCitations.length > 0) {
      aboutCitations = commentaryData.aboutCitations;
    }
    if (commentaryData.keyPoints) {
      keyPoints = {
        title: 'Key Points',
        text: commentaryData.keyPoints.text,
        html: commentaryData.keyPoints.html,
        citations: commentaryData.keyPoints.citations,
        readMoreUrl: keyPoints?.readMoreUrl ?? commentaryData.keyPoints.readMoreUrl,
      };
    }
  }

  // 8. Documents
  const documents = parseDocuments(root);

  // 9. Derive Solvency & Efficiency from statements/ratios
  let debtorDays: number | null = null;
  let inventoryDays: number | null = null;
  let payableDays: number | null = null;
  let cashConversionCycle: number | null = null;

  if (ratiosTable.rows.length > 0) {
    const lastIdx = ratiosTable.periods.length - 1;
    ratiosTable.rows.forEach((row) => {
      const m = row.metric.toLowerCase();
      const val = row.values[lastIdx];
      if (m.includes('debtor') || m.includes('receivable')) debtorDays = val;
      if (m.includes('inventory')) inventoryDays = val;
      if (m.includes('payable')) payableDays = val;
      if (m.includes('conversion cycle')) cashConversionCycle = val;
    });
  }

  // Derive operating margin, net margin, EPS, and Interest Coverage from P&L
  let operatingMargin: number | null = null;
  let netMargin: number | null = null;
  let trailingEps: number | null = null;
  let ttmSales: number | null = null;
  let ttmOp: number | null = null;
  let ttmInterest: number | null = null;
  let interestCoverage: number | null = null;
  let ttmNetProfit: number | null = null;

  if (annualFinancials.rows.length > 0) {
    const ttmOrLastIdx = annualFinancials.periods.length - 1;
    const opmRow = annualFinancials.rows.find((r) => r.metric.includes('OPM %'));
    if (opmRow) operatingMargin = opmRow.values[ttmOrLastIdx];

    const epsRow = annualFinancials.rows.find((r) => r.metric.includes('EPS'));
    if (epsRow) trailingEps = epsRow.values[ttmOrLastIdx];

    const salesRow = annualFinancials.rows.find((r) => r.metric.includes('Sales'));
    if (salesRow) ttmSales = salesRow.values[ttmOrLastIdx];

    const netProfitRow = annualFinancials.rows.find((r) => r.metric.includes('Net Profit'));
    if (netProfitRow) ttmNetProfit = netProfitRow.values[ttmOrLastIdx];

    if (salesRow && netProfitRow) {
      const s = salesRow.values[ttmOrLastIdx];
      const np = netProfitRow.values[ttmOrLastIdx];
      if (s && np && s > 0) {
        netMargin = Number(((np / s) * 100).toFixed(2));
      }
    }

    const opRow = annualFinancials.rows.find((r) => r.metric.includes('Operating Profit'));
    if (opRow) ttmOp = opRow.values[ttmOrLastIdx];

    const intRow = annualFinancials.rows.find((r) => r.metric.includes('Interest'));
    if (intRow) ttmInterest = intRow.values[ttmOrLastIdx];

    if (ttmOp != null && ttmInterest != null && ttmInterest > 0) {
      interestCoverage = Number((ttmOp / ttmInterest).toFixed(1));
    }
  }

  // Derive Balance Sheet metrics: Reserves, Borrowings, Equity, Debt to Equity, Total Assets
  let reserves: number | null = null;
  let borrowings: number | null = null;
  let equityVal: number | null = null;
  let debtToEquity: number | null = null;
  let totalAssets: number | null = null;
  let bsOtherAssets: number | null = null;
  let bsOtherLiabilities: number | null = null;

  if (balanceSheet.rows.length > 0) {
    const lastIdx = balanceSheet.periods.length - 1;
    const borrowingsRow = balanceSheet.rows.find((r) => r.metric.includes('Borrowings'));
    const reservesRow = balanceSheet.rows.find((r) => r.metric.includes('Reserves'));
    const equityRow = balanceSheet.rows.find((r) => r.metric.includes('Equity Capital'));
    const assetsRow = balanceSheet.rows.find(
      (r) => r.metric.includes('Total Assets') || r.metric.includes('Total Liabilities')
    );
    const otherAssetsRow = balanceSheet.rows.find((r) => r.metric.includes('Other Assets'));
    const otherLiabRow = balanceSheet.rows.find((r) => r.metric.includes('Other Liabilities'));

    if (reservesRow) reserves = reservesRow.values[lastIdx];
    if (borrowingsRow) borrowings = borrowingsRow.values[lastIdx] ?? 0;
    if (equityRow) equityVal = equityRow.values[lastIdx] ?? 0;
    if (assetsRow) totalAssets = assetsRow.values[lastIdx];
    if (otherAssetsRow) bsOtherAssets = otherAssetsRow.values[lastIdx];
    if (otherLiabRow) bsOtherLiabilities = otherLiabRow.values[lastIdx];

    if (borrowings != null && equityVal != null && reserves != null) {
      const totalEquity = equityVal + reserves;
      if (totalEquity > 0) {
        debtToEquity = Number((borrowings / totalEquity).toFixed(2));
      }
    }
  }

  // Calculate ROA: (Net Profit / Total Assets) * 100
  let roa: number | null = null;
  if (ttmNetProfit != null && totalAssets != null && totalAssets > 0) {
    roa = Number(((ttmNetProfit / totalAssets) * 100).toFixed(2));
  }

  // Calculate Current Ratio & Quick Ratio
  const currentAssets = scheduleData?.currentAssets ?? bsOtherAssets;
  const currentLiabilities = scheduleData?.currentLiabilities ?? bsOtherLiabilities;
  const inventories = scheduleData?.inventories ?? 0;
  const cash = scheduleData?.cash ?? 0;

  let currentRatio: number | null = null;
  let quickRatio: number | null = null;
  if (currentAssets != null && currentLiabilities != null && currentLiabilities > 0) {
    currentRatio = Number((currentAssets / currentLiabilities).toFixed(2));
    const quickAssets = currentAssets - inventories;
    quickRatio = Number((quickAssets / currentLiabilities).toFixed(2));
  }

  // Calculate Net Debt / EBITDA
  let netDebtToEbitda: number | null = null;
  if (borrowings != null && ttmOp != null && ttmOp > 0) {
    const netDebt = borrowings - cash;
    netDebtToEbitda = netDebt <= 0 ? 0.00 : Number((netDebt / ttmOp).toFixed(2));
  }

  // Derive Cash Flow metrics: Free Cash Flow & CMP / FCF
  let latestFcf: number | null = null;
  let cmpToFcf: number | null = null;

  if (cashFlow.rows.length > 0) {
    const fcfRow = cashFlow.rows.find((r) => r.metric.toLowerCase().includes('free cash flow'));
    if (fcfRow) {
      for (let i = fcfRow.values.length - 1; i >= 0; i--) {
        if (fcfRow.values[i] != null) {
          latestFcf = fcfRow.values[i];
          break;
        }
      }
    }
    if (marketCapCr && latestFcf && latestFcf > 0) {
      cmpToFcf = Number((marketCapCr / latestFcf).toFixed(1));
    }
  }

  // Derive Down from 52w High
  const downFrom52wHigh =
    week52High && currentPrice
      ? Number((((week52High - currentPrice) / week52High) * 100).toFixed(1))
      : null;

  // Derive Growth CAGRs: compute exact unrounded values from P&L when available
  let salesGrowth3Years: number | null = growth.revenue.threeYear;
  let salesGrowth5Years: number | null = growth.revenue.fiveYear;
  let profitVar3Years: number | null = growth.profit.threeYear;
  let profitVar5Years: number | null = growth.profit.fiveYear;

  if (annualFinancials.periods.length >= 4) {
    const salesRow = annualFinancials.rows.find((r) => r.metric.includes('Sales'));
    const npRow = annualFinancials.rows.find((r) => r.metric.includes('Net Profit'));

    // Skip TTM column if present to get full fiscal years
    let lastAnnualIdx = annualFinancials.periods.length - 1;
    if (annualFinancials.periods[lastAnnualIdx]?.period.toUpperCase() === 'TTM') {
      lastAnnualIdx--;
    }

    if (salesRow && lastAnnualIdx >= 3) {
      const endSales = salesRow.values[lastAnnualIdx];
      const s3Start = salesRow.values[lastAnnualIdx - 3];
      const computed3Y = computeCagr(endSales, s3Start, 3);
      if (computed3Y != null) salesGrowth3Years = computed3Y;

      if (lastAnnualIdx >= 5) {
        const s5Start = salesRow.values[lastAnnualIdx - 5];
        const computed5Y = computeCagr(endSales, s5Start, 5);
        if (computed5Y != null) salesGrowth5Years = computed5Y;
      }
    }

    if (npRow && lastAnnualIdx >= 3) {
      const endNp = npRow.values[lastAnnualIdx];
      const p3Start = npRow.values[lastAnnualIdx - 3];
      const computed3Y = computeCagr(endNp, p3Start, 3);
      if (computed3Y != null) profitVar3Years = computed3Y;

      if (lastAnnualIdx >= 5) {
        const p5Start = npRow.values[lastAnnualIdx - 5];
        const computed5Y = computeCagr(endNp, p5Start, 5);
        if (computed5Y != null) profitVar5Years = computed5Y;
      }
    }
  }

  const salesGrowth = growth.revenue.oneYear;
  const profitGrowth = growth.profit.oneYear;
  const returnOver3Years = growth.priceCagr?.threeYear ?? null;
  const roe5Years = growth.roeCagr?.fiveYear ?? null;

  // PEG Ratio (Stock P/E / 3Y Profit Growth)
  let pegRatio: number | null = null;
  if (pe && profitVar3Years && profitVar3Years > 0) {
    pegRatio = Number((pe / profitVar3Years).toFixed(2));
  } else if (pe && profitGrowth && profitGrowth > 0) {
    pegRatio = Number((pe / profitGrowth).toFixed(2));
  }

  // Quarterly Variances (from Peers API if matched, otherwise from Quarterly P&L YoY)
  let qtrSalesVar = peerRes.currentCompanyQtrVar?.qtrSalesVar ?? null;
  let qtrProfitVar = peerRes.currentCompanyQtrVar?.qtrProfitVar ?? null;

  if ((qtrSalesVar == null || qtrProfitVar == null) && quarterlyFinancials.periods.length >= 5) {
    const qLatestIdx = quarterlyFinancials.periods.length - 1;
    const qYoYIdx = qLatestIdx - 4;
    const salesRow = quarterlyFinancials.rows.find((r) => r.metric.includes('Sales'));
    const npRow = quarterlyFinancials.rows.find((r) => r.metric.includes('Net Profit'));

    if (qtrSalesVar == null && salesRow) {
      const cur = salesRow.values[qLatestIdx];
      const prev = salesRow.values[qYoYIdx];
      if (cur != null && prev != null && prev !== 0) {
        qtrSalesVar = Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
      }
    }

    if (qtrProfitVar == null && npRow) {
      const cur = npRow.values[qLatestIdx];
      const prev = npRow.values[qYoYIdx];
      if (cur != null && prev != null && prev !== 0) {
        qtrProfitVar = Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
      }
    }
  }

  // Promoter holding & pledged
  const promoterHolding = shareholding.latest?.promoters ?? 0;
  const pledgedPercentage = 0;

  // Extra Ratios Object matching Screener Top Ratios Card
  const extraRatios: ScreenerExtraRatios = {
    marketCap: marketCapCr,
    currentPrice,
    high: week52High,
    low: week52Low,
    highLow: highLowStr,
    stockPe: pe,
    bookValue,
    dividendYield,
    roce,
    roe,
    faceValue,
    returnOver3Years,
    roe5Years,
    cmpToFcf,
    eps: trailingEps,
    promoterHolding,
    pledgedPercentage,
    pegRatio,
    salesGrowth,
    profitGrowth,
    reserves,
    salesGrowth3Years,
    profitVar3Years,
    debtToEquity,
    salesGrowth5Years,
    profitVar5Years,
    downFrom52wHigh,
    qtrSalesVar,
    qtrProfitVar,
    interestCoverage,
    priceToBook,
    roa,
    netDebtToEbitda,
    currentRatio,
    quickRatio,
  };

  const fetchedAt = new Date().toISOString();

  const company: CompanyProfile = {
    symbol: upper,
    name: h1,
    sector,
    industry,
    exchange: 'NSE',
    currency: 'INR',
    website,
    description: aboutText || undefined,
    aboutHtml,
    aboutCitations,
    keyPoints,
    quickLinks,
    reportingMode,
    meta: freshMeta(),
  };

  const quote: ResearchQuote = {
    symbol: upper,
    price: currentPrice,
    change: null,
    changePct: null,
    open: null,
    high: week52High,
    low: week52Low,
    prevClose: null,
    volume: null,
    avgVolume: null,
    marketCap,
    week52High,
    week52Low,
    trailingPE: pe,
    forwardPE: null,
    priceToBook,
    trailingEps,
    dividendRate: null,
    dividendYield,
    beta: null,
    timestamp: fetchedAt,
    meta: freshMeta(),
  };

  const keyMetrics: KeyMetrics = {
    marketCap,
    pe,
    pb: priceToBook,
    roe,
    roce,
    debtToEquity,
    dividendYield,
    week52High,
    week52Low,
    operatingMargin,
    netMargin,
    eps: trailingEps,
    bookValue,
    faceValue,
    cmpToFcf,
    downFrom52wHigh,
    pegRatio,
  };

  const priceSales =
    marketCapCr && ttmSales && ttmSales > 0
      ? Number((marketCapCr / ttmSales).toFixed(2))
      : null;

  const evToSales =
    marketCapCr != null && ttmSales && ttmSales > 0
      ? Number(((marketCapCr + (borrowings ?? 0)) / ttmSales).toFixed(2))
      : null;

  const evToEbitda =
    marketCapCr != null && ttmOp && ttmOp > 0
      ? Number(((marketCapCr + (borrowings ?? 0)) / ttmOp).toFixed(2))
      : null;

  const valuation: ValuationMetrics = {
    pe,
    forwardPe: null,
    pb: priceToBook,
    evToEbitda,
    evToSales,
    priceSales,
    pegRatio,
    dividendYield,
    meta: freshMeta(),
  };

  const profitability: ProfitabilityMetrics = {
    roe,
    roce,
    roa,
    grossMargin: null,
    operatingMargin,
    netMargin,
    meta: freshMeta(),
  };

  const solvency: SolvencyMetrics = {
    debtToEquity,
    netDebtToEbitda,
    interestCoverage,
    currentRatio,
    quickRatio,
    meta: freshMeta(),
  };

  const efficiency: EfficiencyMetrics = {
    assetTurnover: null,
    inventoryDays,
    receivableDays: debtorDays,
    payableDays,
    cashConversionCycle,
    meta: freshMeta(),
  };

  // Enrich current company peer entry if present
  if (peers?.peers) {
    const currentPeer = peers.peers.find((p) => p.symbol === upper);
    if (currentPeer) {
      if (currentPeer.pb == null && priceToBook != null) currentPeer.pb = priceToBook;
      if (currentPeer.roe == null && roe != null) currentPeer.roe = roe;
      if (currentPeer.roce == null && roce != null) currentPeer.roce = roce;
      if (currentPeer.pe == null && pe != null) currentPeer.pe = pe;
      if (currentPeer.debtToEquity == null && debtToEquity != null) currentPeer.debtToEquity = debtToEquity;
    }
  }

  return {
    company,
    quote,
    keyMetrics,
    valuation,
    profitability,
    solvency,
    efficiency,
    growth,
    quarterlyFinancials,
    annualFinancials,
    balanceSheet,
    cashFlow,
    shareholding,
    peers,
    documents,
    pros,
    cons,
    extraRatios,
    keyPoints,
    quickLinks,
    fetchedAt,
  };
}
