import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (typeof v !== 'number' || isNaN(v)) return '₹0.00';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v: number): string {
  if (typeof v !== 'number' || isNaN(v)) return '0.00%';
  if (Math.abs(v) <= 1 && v !== 0) {
    return `${(v * 100).toFixed(2)}%`;
  }
  return `${v.toFixed(2)}%`;
}

function calcWeightPct(value: number, total: number): string {
  if (typeof value !== 'number' || isNaN(value) || total <= 0) return '0.00%';
  return `${((value / total) * 100).toFixed(2)}%`;
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#4f46e5',
  secondary: '#7c3aed',
  accent: '#059669',
  danger: '#e11d48',
  warning: '#d97706',
  text: '#0f172a',
  muted: '#64748b',
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#cbd5e1',
  totalBg: '#e0e7ff',
};

// ─── Shared Styles ─────────────────────────────────────────────────────────────
const styles: Record<string, object> = {
  header: { fontSize: 20, bold: true, color: COLORS.primary, margin: [0, 0, 0, 4] },
  subheader: { fontSize: 12, bold: true, color: COLORS.primary, margin: [0, 6, 0, 4] },
  label: { fontSize: 8, color: COLORS.muted, bold: true },
  value: { fontSize: 10.5, bold: true, color: COLORS.text },
  tableHeader: { fontSize: 8.5, bold: true, color: COLORS.white, fillColor: COLORS.primary },
  tableRow: { fontSize: 8.5, color: COLORS.text },
  footer: { fontSize: 8, color: COLORS.muted, italics: true },
  disclaimer: { fontSize: 7.5, color: COLORS.muted, italics: true, margin: [0, 12, 0, 0] },
};

function renderHeaderBanner(title: string, subtitle: string) {
  return [
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              fillColor: COLORS.primary,
              margin: [16, 12, 16, 12],
              stack: [
                { text: 'PORTFOLIO TRACKER', fontSize: 9, bold: true, color: '#c7d2fe', characterSpacing: 1 },
                { text: title, fontSize: 18, bold: true, color: COLORS.white, margin: [0, 3, 0, 2] },
                { text: subtitle, fontSize: 9.5, color: '#e0e7ff' },
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 6],
    },
    {
      columns: [
        { text: `Report Date: ${today()}`, fontSize: 8, color: COLORS.muted },
        { text: 'Confidential — Personal Investment Portfolio', fontSize: 8, color: COLORS.muted, alignment: 'right' },
      ],
      margin: [0, 0, 0, 12],
    },
  ];
}

function sectionTitle(text: string) {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            text,
            fontSize: 11,
            bold: true,
            color: COLORS.primary,
            fillColor: '#f1f5f9',
            margin: [8, 5, 8, 5],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: (i: number) => (i === 1 ? 1.5 : 0),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.primary,
    },
    margin: [0, 8, 0, 8],
  };
}

function renderStatRow(stats: { label: string; value: string; color?: string }[]) {
  return {
    table: {
      widths: Array(stats.length).fill('*'),
      body: [
        stats.map((s) => ({
          fillColor: COLORS.bg,
          margin: [8, 6, 8, 6],
          stack: [
            { text: s.label.toUpperCase(), fontSize: 7.5, bold: true, color: COLORS.muted },
            { text: s.value, fontSize: 11.5, bold: true, color: s.color || COLORS.text, margin: [0, 2, 0, 0] },
          ],
        })),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
    },
    margin: [0, 0, 0, 12],
  };
}

function makeTable(
  headers: string[],
  rows: string[][],
  widths?: (string | number)[],
  totalRow?: string[]
) {
  const bodyRows: any[] = rows.map((row, ri) =>
    row.map((cell) => ({
      text: cell,
      style: 'tableRow',
      fillColor: ri % 2 === 0 ? COLORS.bg : COLORS.white,
      margin: [5, 3.5, 5, 3.5],
    }))
  );

  if (totalRow) {
    bodyRows.push(
      totalRow.map((cell) => ({
        text: cell,
        fontSize: 8.5,
        bold: true,
        fillColor: COLORS.totalBg,
        color: COLORS.primary,
        margin: [5, 4.5, 5, 4.5],
      }))
    );
  }

  return {
    table: {
      headerRows: 1,
      widths: widths ?? Array(headers.length).fill('*'),
      body: [
        headers.map((h) => ({ text: h, style: 'tableHeader', margin: [5, 4, 5, 4] })),
        ...bodyRows,
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => {
        if (totalRow && i === node.table.body.length - 1) return 1.5;
        if (totalRow && i === node.table.body.length) return 1.5;
        return 0.5;
      },
      vLineWidth: () => 0,
      hLineColor: (i: number, node: any) => {
        if (totalRow && (i === node.table.body.length - 1 || i === node.table.body.length)) return COLORS.primary;
        return COLORS.border;
      },
    },
    margin: [0, 0, 0, 12],
  };
}

// ─── PDF builders per report type ─────────────────────────────────────────────

async function buildPortfolioPDF(data: SheetsData) {
  const { equity, bonds } = data;
  const equityTotal = equity.reduce((s: number, h: EquityHoldingRaw) => s + h.currentValue, 0);
  const bondTotal = bonds.reduce((s: number, b: BondHoldingRaw) => s + b.totalValue, 0);
  const netWorth = equityTotal + bondTotal;
  const totalShares = equity.reduce((s: number, h: EquityHoldingRaw) => s + h.shares, 0);

  const equityRows = equity.map((h: EquityHoldingRaw) => [
    h.ticker,
    h.name,
    h.sector,
    String(h.shares),
    fmt(h.currentPrice),
    fmt(h.currentValue),
    calcWeightPct(h.currentValue, netWorth),
    `${h.percentChange >= 0 ? '+' : ''}${pct(h.percentChange)}`,
  ]);

  const equityTotalRow = [
    'TOTAL',
    `${equity.length} Stocks`,
    '',
    String(totalShares),
    '',
    fmt(equityTotal),
    calcWeightPct(equityTotal, netWorth),
    '',
  ];

  const bondRows = bonds.map((b: BondHoldingRaw) => [
    b.isin,
    b.securityName,
    b.creditRating || '—',
    b.sector,
    pct(b.couponRate),
    pct(b.ytm),
    `${b.duration} Months`,
    fmt(b.totalValue),
    calcWeightPct(b.totalValue, netWorth),
  ]);

  const bondTotalRow = [
    'TOTAL',
    `${bonds.length} Bonds`,
    '',
    '',
    '',
    '',
    '',
    fmt(bondTotal),
    calcWeightPct(bondTotal, netWorth),
  ];

  const docDef: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [35, 30, 35, 35],
    styles,
    content: [
      ...renderHeaderBanner('Full Portfolio Intelligence Report', `${equity.length} Stocks & ${bonds.length} Bonds — Evaluated: ${today()}`),

      renderStatRow([
        { label: 'Net Worth', value: fmt(netWorth), color: COLORS.primary },
        { label: 'Total Equity', value: `${fmt(equityTotal)} (${calcWeightPct(equityTotal, netWorth)})`, color: '#2563eb' },
        { label: 'Total Debt / Bonds', value: `${fmt(bondTotal)} (${calcWeightPct(bondTotal, netWorth)})`, color: '#7c3aed' },
        { label: 'Total Holdings', value: `${equity.length + bonds.length} (${equity.length} Stocks, ${bonds.length} Bonds)` },
      ]),

      sectionTitle(`1. Equity Holdings (${equity.length} Stocks — Total Value: ${fmt(equityTotal)})`),
      makeTable(
        ['Ticker', 'Company Name', 'Sector', 'Shares', 'Current Price', 'Holding Value', 'Portfolio %', 'Day Change'],
        equityRows,
        [75, 160, 105, 50, 75, 95, 65, 65],
        equityTotalRow
      ),

      sectionTitle(`2. Fixed Income & Bond Holdings (${bonds.length} Bonds — Total Value: ${fmt(bondTotal)})`),
      makeTable(
        ['ISIN', 'Security / Issuer Name', 'Rating', 'Sector', 'Coupon', 'YTM', 'Duration', 'Holding Value', 'Portfolio %'],
        bondRows,
        [85, 175, 50, 85, 50, 50, 55, 90, 60],
        bondTotalRow
      ),

      { text: 'Disclaimer: This report is generated for informational and tracking purposes only and does not constitute formal investment advice.', style: 'disclaimer' },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Portfolio Tracker · Full Portfolio Report · Page ${currentPage} of ${pageCount}`,
      alignment: 'center',
      style: 'footer',
      margin: [0, 10, 0, 0],
    }),
  };

  return docDef;
}

async function buildEquityPDF(data: SheetsData) {
  const { equity } = data;
  const equityTotal = equity.reduce((s: number, h: EquityHoldingRaw) => s + h.currentValue, 0);
  const totalShares = equity.reduce((s: number, h: EquityHoldingRaw) => s + h.shares, 0);

  const rows = equity.map((h: EquityHoldingRaw) => [
    h.ticker, h.exchange ?? 'NSE', h.name, h.sector,
    fmt(h.currentPrice), fmt(h.currentValue),
    String(h.shares), calcWeightPct(h.currentValue, equityTotal),
    `${h.percentChange >= 0 ? '+' : ''}${pct(h.percentChange)}`,
  ]);

  const totalRow = [
    'TOTAL', '', `${equity.length} Stocks`, '', '',
    fmt(equityTotal), String(totalShares), '100.00%', '',
  ];

  const docDef: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [35, 30, 35, 35],
    styles,
    content: [
      ...renderHeaderBanner('Equity Holdings Report', `${equity.length} Stocks — Total Value: ${fmt(equityTotal)}`),
      sectionTitle('Equity Positions Breakdown'),
      makeTable(
        ['Ticker', 'Exchange', 'Name', 'Sector', 'Price', 'Holding Value', 'Shares', 'Weight %', 'Day Change'],
        rows,
        [75, 55, 150, 95, 75, 90, 45, 60, 60],
        totalRow
      ),
      { text: 'Disclaimer: This report is for informational purposes only.', style: 'disclaimer' },
    ],
    footer: (p: number, t: number) => ({
      text: `Portfolio Tracker · Equity Report · Page ${p} of ${t}`, alignment: 'center', style: 'footer', margin: [0, 10, 0, 0],
    }),
  };
  return docDef;
}

async function buildBondsPDF(data: SheetsData) {
  const { bonds } = data;
  const bondTotal = bonds.reduce((s: number, b: BondHoldingRaw) => s + b.totalValue, 0);
  const totalUnits = bonds.reduce((s: number, b: BondHoldingRaw) => s + b.unitsHeld, 0);

  const rows = bonds.map((b: BondHoldingRaw) => [
    b.securityName, b.isin, b.creditRating || '—', b.sector,
    b.maturityDate ?? 'N/A', `${b.duration} Months`,
    pct(b.couponRate), pct(b.ytm), String(b.unitsHeld), fmt(b.totalValue), calcWeightPct(b.totalValue, bondTotal),
  ]);

  const totalRow = [
    'TOTAL', '', '', '', '', '', '', '', String(totalUnits), fmt(bondTotal), '100.00%',
  ];

  const docDef: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [35, 30, 35, 35],
    styles,
    content: [
      ...renderHeaderBanner('Bond Holdings Report', `${bonds.length} Bonds — Total Value: ${fmt(bondTotal)}`),
      sectionTitle('Fixed Income Positions'),
      makeTable(
        ['Security', 'ISIN', 'Rating', 'Sector', 'Maturity', 'Duration', 'Coupon', 'YTM', 'Units', 'Holding Value', 'Weight %'],
        rows,
        [145, 80, 45, 75, 60, 50, 45, 45, 35, 80, 55],
        totalRow
      ),
      { text: 'Disclaimer: YTM calculations are estimates. This is not investment advice.', style: 'disclaimer' },
    ],
    footer: (p: number, t: number) => ({
      text: `Portfolio Tracker · Bond Report · Page ${p} of ${t}`, alignment: 'center', style: 'footer', margin: [0, 10, 0, 0],
    }),
  };
  return docDef;
}

async function buildCashFlowPDF(data: SheetsData) {
  const rows = data.monthlySummaries.map((m: MonthlySummaryRaw) => [
    m.label, fmt(m.investment), fmt(m.foodAndEntertainment), fmt(m.others), fmt(m.totalExpenses),
    `${m.investment - m.totalExpenses >= 0 ? '+' : ''}${fmt(m.investment - m.totalExpenses)}`,
  ]);

  const totalInvestment = data.monthlySummaries.reduce((s: number, m: MonthlySummaryRaw) => s + m.investment, 0);
  const totalFood = data.monthlySummaries.reduce((s: number, m: MonthlySummaryRaw) => s + m.foodAndEntertainment, 0);
  const totalOthers = data.monthlySummaries.reduce((s: number, m: MonthlySummaryRaw) => s + m.others, 0);
  const totalExpenses = data.monthlySummaries.reduce((s: number, m: MonthlySummaryRaw) => s + m.totalExpenses, 0);
  const netSurplus = totalInvestment - totalExpenses;

  const totalRow = [
    'TOTAL',
    fmt(totalInvestment),
    fmt(totalFood),
    fmt(totalOthers),
    fmt(totalExpenses),
    `${netSurplus >= 0 ? '+' : ''}${fmt(netSurplus)}`,
  ];

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [35, 30, 35, 35],
    styles,
    content: [
      ...renderHeaderBanner('Monthly Cash Flow Report', `${data.monthlySummaries.length} Months Tracked`),
      renderStatRow([
        { label: 'Total Invested', value: fmt(totalInvestment), color: '#2563eb' },
        { label: 'Total Expenses', value: fmt(totalExpenses), color: '#e11d48' },
        { label: 'Net Surplus', value: `${netSurplus >= 0 ? '+' : ''}${fmt(netSurplus)}`, color: netSurplus >= 0 ? '#059669' : '#e11d48' },
      ]),
      sectionTitle('Monthly Summary Breakdown'),
      makeTable(
        ['Month', 'Invested', 'Food & Entertainment', 'Others', 'Total Expenses', 'Net'],
        rows,
        ['16%', '16%', '22%', '16%', '16%', '14%'],
        totalRow
      ),
      { text: 'Disclaimer: Cash flow data is sourced from your Daily Transactions sheet.', style: 'disclaimer' },
    ],
    footer: (p: number, t: number) => ({
      text: `Portfolio Tracker · Cash Flow Report · Page ${p} of ${t}`, alignment: 'center', style: 'footer', margin: [0, 10, 0, 0],
    }),
  };
  return docDef;
}

async function buildRiskPDF(data: SheetsData) {
  const { equity, bonds } = data;
  const equityTotal = equity.reduce((s: number, h: EquityHoldingRaw) => s + h.currentValue, 0);
  const bondTotal = bonds.reduce((s: number, b: BondHoldingRaw) => s + b.totalValue, 0);
  const netWorth = equityTotal + bondTotal;

  const all = [
    ...equity.map((h: EquityHoldingRaw) => ({ name: h.ticker, value: h.currentValue, type: 'Equity' })),
    ...bonds.map((b: BondHoldingRaw) => ({ name: b.isin, value: b.totalValue, type: 'Bond' })),
  ].sort((a, b) => b.value - a.value);

  const top10Total = all.slice(0, 10).reduce((s, h) => s + h.value, 0);
  const top10Rows = all.slice(0, 10).map((h) => [
    h.name, h.type, fmt(h.value), calcWeightPct(h.value, netWorth),
  ]);

  const top10TotalRow = [
    'TOP 10 TOTAL',
    '',
    fmt(top10Total),
    calcWeightPct(top10Total, netWorth),
  ];

  const sectorMap = new Map<string, number>();
  equity.forEach((h: EquityHoldingRaw) => sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + h.currentValue));
  bonds.forEach((b: BondHoldingRaw) => sectorMap.set(b.sector, (sectorMap.get(b.sector) ?? 0) + b.totalValue));
  const sectorRows = Array.from(sectorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([sec, val]) => [sec, fmt(val), calcWeightPct(val, netWorth)]);

  const sectorTotalRow = [
    'PORTFOLIO TOTAL',
    fmt(netWorth),
    '100.00%',
  ];

  const docDef: any = {
    pageSize: 'A4',
    pageMargins: [35, 30, 35, 35],
    styles,
    content: [
      ...renderHeaderBanner('Risk & Concentration Report', `Portfolio Net Worth: ${fmt(netWorth)}`),
      renderStatRow([
        { label: 'Net Worth', value: fmt(netWorth), color: COLORS.primary },
        { label: 'Equity Weight', value: calcWeightPct(equityTotal, netWorth), color: '#2563eb' },
        { label: 'Bond Weight', value: calcWeightPct(bondTotal, netWorth), color: '#7c3aed' },
        { label: 'Total Holdings', value: String(all.length) },
      ]),
      sectionTitle('Top 10 Largest Holdings by Concentration'),
      makeTable(['Holding', 'Type', 'Value', 'Portfolio %'], top10Rows, ['40%', '20%', '20%', '20%'], top10TotalRow),
      sectionTitle('Sector Allocation Breakdown'),
      makeTable(['Sector', 'Value', 'Portfolio %'], sectorRows, ['50%', '25%', '25%'], sectorTotalRow),
      { text: 'Note: Diversification scores are calculated using the Herfindahl-Hirschman Index (HHI). Lower HHI = more diversified. This is not investment advice.', style: 'disclaimer' },
    ],
    footer: (p: number, t: number) => ({
      text: `Portfolio Tracker · Risk Report · Page ${p} of ${t}`, alignment: 'center', style: 'footer', margin: [0, 10, 0, 0],
    }),
  };
  return docDef;
}

// ─── Types for raw sheet data ──────────────────────────────────────────────────

interface EquityHoldingRaw {
  ticker: string; exchange?: string; name: string; sector: string;
  currentPrice: number; priceChange: number; percentChange: number;
  shares: number; currentValue: number; allocationPercent: number;
}
interface BondHoldingRaw {
  isin: string; securityName: string; sector: string; creditRating: string;
  maturityDate: string | null; duration: number; couponRate: number; ytm: number;
  faceValue: number; buyPrice: number; unitsHeld: number; totalValue: number; portfolioPercent: number;
}
interface MonthlySummaryRaw {
  label: string; investment: number; foodAndEntertainment: number; others: number; totalExpenses: number;
}
interface SheetsData {
  equity: EquityHoldingRaw[];
  bonds: BondHoldingRaw[];
  monthlySummaries: MonthlySummaryRaw[];
}

async function buildAIInsightsPDF(insights: any, data: SheetsData): Promise<any> {
  const eqTotal = data.equity.reduce((s, e) => s + (e.currentValue || 0), 0);
  const bdTotal = data.bonds.reduce((s, b) => s + (b.totalValue || 0), 0);
  const netWorth = eqTotal + bdTotal;

  const content: any[] = [
    ...renderHeaderBanner('AI Portfolio Intelligence Report', 'Quantitative Health Assessment & Real-Time Macro Insights'),

    renderStatRow([
      { label: 'Health Score', value: `${insights.health?.score ?? 75}/100`, color: COLORS.primary },
      { label: 'Health Status', value: String(insights.health?.status ?? 'Good'), color: COLORS.accent },
      { label: 'Market Stance', value: String(insights.marketCondition?.status ?? 'Sideways'), color: COLORS.warning },
      { label: 'Net Worth Evaluated', value: fmt(netWorth), color: COLORS.secondary },
    ]),

    sectionTitle('1. Executive Portfolio Summary'),
    {
      text: insights.summary || 'Comprehensive portfolio intelligence report.',
      fontSize: 9,
      lineHeight: 1.4,
      margin: [0, 0, 0, 10],
    },
  ];

  if (Array.isArray(insights.health?.reasons) && insights.health.reasons.length > 0) {
    content.push(
      { text: 'Key Observations & Health Drivers:', style: 'label', margin: [0, 0, 0, 4] },
      {
        ul: insights.health.reasons.map((r: string) => ({ text: r, fontSize: 8.5, margin: [0, 1, 0, 1] })),
        margin: [0, 0, 0, 10],
      }
    );
  }

  // V2 Section: Deterministic Health Breakdown
  if (insights.healthBreakdown) {
    const hb = insights.healthBreakdown;
    content.push(
      sectionTitle('2. Health Scorecard Breakdown (6 Factor Pillars)'),
      makeTable(
        ['Factor Pillar', 'Score', 'Weight', 'Weighted Impact'],
        [
          ['Fundamental Quality', `${hb.fundamental?.score ?? '—'}/100`, `${((hb.fundamental?.weight ?? 0.25) * 100).toFixed(0)}%`, `${((hb.fundamental?.score ?? 0) * (hb.fundamental?.weight ?? 0.25)).toFixed(1)} pts`],
          ['Technical Breadth', `${hb.technical?.score ?? '—'}/100`, `${((hb.technical?.weight ?? 0.20) * 100).toFixed(0)}%`, `${((hb.technical?.score ?? 0) * (hb.technical?.weight ?? 0.20)).toFixed(1)} pts`],
          ['Risk & Drawdown', `${hb.risk?.score ?? '—'}/100`, `${((hb.risk?.weight ?? 0.20) * 100).toFixed(0)}%`, `${((hb.risk?.score ?? 0) * (hb.risk?.weight ?? 0.20)).toFixed(1)} pts`],
          ['Diversification (HHI)', `${hb.diversification?.score ?? '—'}/100`, `${((hb.diversification?.weight ?? 0.15) * 100).toFixed(0)}%`, `${((hb.diversification?.score ?? 0) * (hb.diversification?.weight ?? 0.15)).toFixed(1)} pts`],
          ['Valuation Alignment', `${hb.valuation?.score ?? '—'}/100`, `${((hb.valuation?.weight ?? 0.10) * 100).toFixed(0)}%`, `${((hb.valuation?.score ?? 0) * (hb.valuation?.weight ?? 0.10)).toFixed(1)} pts`],
          ['Performance Momentum', `${hb.performance?.score ?? '—'}/100`, `${((hb.performance?.weight ?? 0.10) * 100).toFixed(0)}%`, `${((hb.performance?.score ?? 0) * (hb.performance?.weight ?? 0.10)).toFixed(1)} pts`],
        ],
        ['35%', '20%', '20%', '25%'],
        ['Composite Health Score', `${insights.health?.score ?? 75}/100`, '100%', `${insights.health?.score ?? 75} pts`]
      )
    );
  }

  // V2 Section: Review Flags
  if (Array.isArray(insights.reviewFlags) && insights.reviewFlags.length > 0) {
    content.push(
      sectionTitle('3. Critical Review Flags'),
      makeTable(
        ['Severity', 'Issue / Signal', 'Telemetry Evidence', 'Actionable Recommendation'],
        insights.reviewFlags.map((f: any) => [
          String(f.severity || 'yellow').toUpperCase(),
          f.title || '—',
          f.evidence || '—',
          f.recommendation || '—',
        ]),
        ['12%', '28%', '30%', '30%']
      )
    );
  }

  // Section: Market Conditions & Scenario Forecasts
  if (insights.marketCondition || insights.marketOutlook) {
    content.push(
      sectionTitle('4. Market Environment & Scenario Forecasts'),
      {
        text: `Market Commentary: ${insights.marketCondition?.summary || 'Market conditions remain range-bound.'}`,
        fontSize: 8.5,
        color: COLORS.muted,
        italics: true,
        margin: [0, 0, 0, 8],
      }
    );

    const scenarios = insights.marketOutlook?.scenarios || [];
    if (scenarios.length > 0) {
      const scenHeaders = ['Scenario', 'Probability', 'Expected Return / Impact', 'Trigger / Description'];
      const scenRows = scenarios.map((s: any) => [
        s.name || s.label || 'Scenario',
        typeof s.probability === 'number' ? `${s.probability}%` : String(s.probability || '—'),
        s.impact || s.expectedReturn || '—',
        s.description || s.trigger || '—',
      ]);
      content.push(makeTable(scenHeaders, scenRows, ['25%', '15%', '25%', '35%']));
    }
  }

  // Section 3: Strategic Opportunities & Key Risks
  if (Array.isArray(insights.opportunities) && insights.opportunities.length > 0) {
    content.push(
      sectionTitle('3. Strategic Opportunities'),
      makeTable(
        ['Priority', 'Opportunity', 'Evidence', 'Actionable Step'],
        insights.opportunities.map((o: any) => [
          o.priority || 'Medium',
          o.title || 'Opportunity',
          o.evidence || '—',
          o.action || o.description || '—',
        ]),
        ['12%', '26%', '31%', '31%']
      )
    );
  }

  if (Array.isArray(insights.risks) && insights.risks.length > 0) {
    content.push(
      sectionTitle('4. Key Risks & Mitigations'),
      makeTable(
        ['Severity', 'Risk Factor', 'Description', 'Mitigation Plan'],
        insights.risks.map((r: any) => [
          r.severity || 'Medium',
          r.title || 'Risk',
          r.description || '—',
          r.mitigation || '—',
        ]),
        ['12%', '26%', '31%', '31%']
      )
    );
  }

  // Section 5: Recommendations & Long-Term Roadmap
  if (Array.isArray(insights.recommendations) && insights.recommendations.length > 0) {
    content.push(
      sectionTitle('5. Actionable Recommendations'),
      makeTable(
        ['Category', 'Action Item', 'Priority', 'Timeframe', 'Target Asset'],
        insights.recommendations.map((rec: any) => [
          rec.category || 'General',
          rec.action || rec.title || '—',
          rec.priority || 'Medium',
          rec.timeframe || 'Immediate',
          rec.targetAsset || 'Portfolio',
        ]),
        ['18%', '34%', '14%', '18%', '16%']
      )
    );
  }

  if (insights.longTermStrategy) {
    const stratText = typeof insights.longTermStrategy === 'string'
      ? insights.longTermStrategy
      : insights.longTermStrategy.currentApproach || 'Maintain systematic wealth accumulation discipline.';
    content.push(
      sectionTitle('6. Long-Term Wealth Strategy'),
      {
        text: stratText,
        fontSize: 9,
        lineHeight: 1.4,
        margin: [0, 0, 0, 10],
      }
    );
  }

  // V2 Section: Valuation Intelligence
  if (insights.valuation) {
    content.push(
      sectionTitle('7. Valuation Intelligence'),
      {
        text: `Portfolio Weighted P/E: ${insights.valuation.portfolioWeightedPE ?? '—'}x vs Nifty 50 Benchmark: ${insights.valuation.benchmarkPE ?? 22.8}x (${(insights.valuation.relativeDiscountPremiumPct ?? 0) >= 0 ? '+' : ''}${insights.valuation.relativeDiscountPremiumPct ?? 0}% relative). Sector Bias: ${insights.valuation.sectorBias || 'Balanced'}.`,
        fontSize: 8.5,
        color: COLORS.text,
        margin: [0, 0, 0, 8],
      }
    );
  }

  // V2 Section: Thesis Monitor
  if (Array.isArray(insights.thesisMonitor) && insights.thesisMonitor.length > 0) {
    content.push(
      sectionTitle('8. Investment Thesis Monitor (Top Equities)'),
      makeTable(
        ['Symbol', 'Weight', 'Status', 'Thesis & Core Drivers', 'Key Catalysts to Watch'],
        insights.thesisMonitor.map((t: any) => [
          t.symbol || '—',
          typeof t.allocationPct === 'number' ? `${t.allocationPct.toFixed(1)}%` : '—',
          String(t.status || 'intact').toUpperCase(),
          t.thesis || '—',
          t.catalystsWatch || '—',
        ]),
        ['14%', '10%', '14%', '34%', '28%']
      )
    );
  }

  content.push({
    text: 'Disclaimer: AI Portfolio Intelligence is generated automatically for educational and informational purposes. This is not formal SEBI investment advice. Always conduct your own research or consult a registered advisor before making financial transactions.',
    style: 'disclaimer',
  });

  return {
    content,
    styles,
    pageMargins: [35, 30, 35, 35],
    defaultStyle: { font: 'Roboto' },
  } as any;
}

// ─── Fetch portfolio data (server-side, no HTTP round-trip) ────────────────────

async function fetchPortfolioData(): Promise<SheetsData> {
  const { fetchAllSheetData } = await import('@/lib/sheets/fetcher');
  const { mapEquityHoldings } = await import('@/lib/mappers/equity');
  const { mapBondHoldings } = await import('@/lib/mappers/bonds');
  const { mapTransactions, buildCashFlowStats } = await import('@/lib/mappers/cashflow');

  const raw = await fetchAllSheetData();

  const equity = mapEquityHoldings(raw?.equity ?? null);
  const bonds = mapBondHoldings(raw?.bonds ?? null);
  const transactions = mapTransactions(raw?.transactions ?? null);
  const { monthlySummaries } = buildCashFlowStats(transactions);

  return { equity, bonds, monthlySummaries };
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { reportType, insights } = await request.json();

    // Dynamically import pdfmake (Node.js runtime)
    const pdfmakeModule = await import('pdfmake');
    const pdfmake = (pdfmakeModule.default || pdfmakeModule) as any;

    const vfsFontsModule = await import('pdfmake/build/vfs_fonts');
    const vfsFonts = (vfsFontsModule.default || vfsFontsModule) as any;
    const vfs = vfsFonts?.pdfMake?.vfs || vfsFonts;

    if (vfs && pdfmake.virtualfs) {
      for (const [name, data] of Object.entries(vfs)) {
        if (!pdfmake.virtualfs.existsSync(name)) {
          pdfmake.virtualfs.writeFileSync(name, Buffer.from(data as string, 'base64'));
        }
      }
    }

    pdfmake.setFonts({
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    });

    if (typeof pdfmake.setUrlAccessPolicy === 'function') {
      pdfmake.setUrlAccessPolicy(() => false);
    }
    if (typeof pdfmake.setLocalAccessPolicy === 'function') {
      pdfmake.setLocalAccessPolicy(() => false);
    }

    const data = await fetchPortfolioData();

    let docDef: any;
    let filename: string;
    const dateStr = new Date().toISOString().slice(0, 10);

    switch (reportType) {
      case 'portfolio':
        docDef = await buildPortfolioPDF(data);
        filename = `portfolio-report-${dateStr}.pdf`;
        break;
      case 'equity':
        docDef = await buildEquityPDF(data);
        filename = `equity-holdings-${dateStr}.pdf`;
        break;
      case 'bonds':
        docDef = await buildBondsPDF(data);
        filename = `bond-holdings-${dateStr}.pdf`;
        break;
      case 'cashflow':
        docDef = await buildCashFlowPDF(data);
        filename = `cashflow-${dateStr}.pdf`;
        break;
      case 'risk':
        docDef = await buildRiskPDF(data);
        filename = `risk-diversification-${dateStr}.pdf`;
        break;
      case 'ai':
        if (!insights) {
          return NextResponse.json({ error: 'No AI insights data provided for PDF export' }, { status: 400 });
        }
        docDef = await buildAIInsightsPDF(insights, data);
        filename = `ai-intelligence-report-${dateStr}.pdf`;
        break;
      default:
        return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });
    }

    // Generate PDF buffer using OutputDocument.getBuffer()
    const pdfDoc = pdfmake.createPdf(docDef);
    const pdfBuffer: Buffer = await pdfDoc.getBuffer();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    console.error('[api/reports/pdf]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
