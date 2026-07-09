/**
 * Header-detection heuristic parser (Architecture §4).
 * Generic — no hardcoded column names or tab names.
 */

import type { ParsedSheet, ColumnMeta, CellType, RawCellValue } from '@/types/sheets';

// ---------------------------------------------------------------------------
// Synonym map: all keys are the canonical normalized name
// ---------------------------------------------------------------------------
const HEADER_SYNONYMS: Record<string, string[]> = {
  ticker: ['symbol', 'ticker', 'scrip', 'stock symbol'],
  exchange: ['exchange', 'exch'],
  name: ['stock name', 'name', 'security name', 'company name', 'issuer name', 'company'],
  currentPrice: ['current price', 'cmp', 'ltp', 'price'],
  priceChange: ['price change', 'change', 'chg', 'day change', 'daily change', 'day chg'],
  percentChange: ['% change', 'pct change', '% chg', 'daily change %', 'change %', 'day change %', 'day % chg', 'chg %'],
  shares: ['# shares', 'shares', 'qty', 'quantity', 'units held', 'units'],
  currentValue: ['current value', 'market value', 'value', 'total value'],
  allocationPercent: ['%', 'portfolio %', 'allocation %', 'weight %', 'weight'],
  sector: ['sector', 'industry', 'category'],
  // Bond-specific
  broker: ['broker', 'brokerage'],
  issuer: ['issuer'],
  isin: ['isin', 'isin code'],
  creditRating: ['credit rating', 'rating'],
  maturityDate: ['maturity date', 'maturity', 'expiry date', 'due date'],
  duration: ['duration'],
  couponRate: ['coupon rate', 'coupon', 'interest rate'],
  ytm: ['ytm', 'yield to maturity', 'yield'],
  faceValue: ['face value', 'par value', 'nominal value'],
  buyPrice: ['buy price', 'purchase price', 'cost price', 'avg price'],
  portfolioPercent: ['portfolio %'],
  // Transaction-specific
  date: ['date'],
  foodAndEntertainment: ['food & entertainment', 'food and entertainment', 'food & ent', 'food'],
  investment: ['investment', 'invest'],
  others: ['others', 'other', 'misc'],
  dailyTotal: ['daily total', 'total', 'grand total'],
  // Portfolio rollup
  allocation: ['allocation', 'amount'],
  targetPercent: ['target %', 'target percent'],
  targetAmount: ['target amount', 'target'],
  targetAllocation: ['target allocation'],
};

/** Equity-like primary key synonyms */
const EQUITY_KEY_HINTS = ['symbol', 'ticker', 'scrip'];
/** Bond-like primary key synonyms */
const BOND_KEY_HINTS = ['isin'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeHeader(raw: string): string {
  const slug = slugify(raw);
  for (const [canonical, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    if (synonyms.some((syn) => slugify(syn) === slug)) return canonical;
  }
  // Fallback: camelCase the slug
  return slug.replace(/\s+(.)/g, (_, c) => c.toUpperCase());
}

function isStringCell(v: string): boolean {
  return v.trim() !== '' && isNaN(Number(v.replace(/[,₹$%]/g, '')));
}

function looksLikeDate(v: string): boolean {
  return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(v) ||
    /\d{4}-\d{2}-\d{2}/.test(v) ||
    /\d{1,2}-[A-Za-z]{3}-\d{2,4}/.test(v);
}

function looksLikePercent(v: string, header: string): boolean {
  if (v.includes('%')) return true;
  const h = header.toLowerCase();
  if (h.includes('%') || h.includes('percent') || h.includes('rate') || h.includes('yield')) {
    const n = parseFloat(v.replace(/[,₹$]/g, ''));
    return !isNaN(n) && n >= 0 && n <= 1;
  }
  return false;
}

function looksLikeCurrency(v: string): boolean {
  return /[₹$]/.test(v) || /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v.trim());
}

function inferCellType(sample: string[], headerKey: string): CellType {
  const dateHints = ['date', 'maturity', 'expiry'];
  if (dateHints.some((h) => headerKey.toLowerCase().includes(h))) {
    if (sample.some(looksLikeDate)) return 'date';
  }
  const percentHints = ['percent', 'change', 'yield', 'coupon', 'rate', 'allocation'];
  if (percentHints.some((h) => headerKey.toLowerCase().includes(h))) {
    if (sample.some((v) => looksLikePercent(v, headerKey))) return 'percent';
  }
  if (sample.some(looksLikeCurrency)) return 'currency';
  if (sample.some(looksLikeDate)) return 'date';
  if (sample.some((v) => looksLikePercent(v, headerKey))) return 'percent';
  const numericCount = sample.filter((v) => !isNaN(Number(v.replace(/[,₹$%]/g, '')))).length;
  if (numericCount >= Math.ceil(sample.length / 2)) return 'number';
  return 'string';
}

/** Parse a cell value to a typed JS value */
export function parseCell(raw: string | undefined | null, type: CellType): RawCellValue {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (s === '' || s === '-' || s === 'N/A') return null;

  switch (type) {
    case 'currency':
    case 'number': {
      const n = parseFloat(s.replace(/[₹$,\s]/g, ''));
      return isNaN(n) ? null : n;
    }
    case 'percent': {
      const stripped = s.replace('%', '').trim();
      const n = parseFloat(stripped.replace(/[,]/g, ''));
      if (isNaN(n)) return null;
      // Normalize: if value looks like "12.5" and not "0.125", keep as percent decimal
      return Math.abs(n) > 1 ? n / 100 : n;
    }
    case 'date':
      return s; // Keep as string; callers convert to Date as needed
    default:
      return s;
  }
}

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

/**
 * Scan the first `maxRows` rows and return the index of the most likely header row.
 * Heuristic: the row with the highest count of non-empty, string-only (non-numeric) cells
 * that is followed by at least 2 rows with mixed content.
 */
function detectHeaderRow(rows: string[][], maxRows = 15): number {
  let bestScore = -1;
  let bestIndex = 0;

  const limit = Math.min(maxRows, rows.length - 2);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    const stringCells = row.filter((v) => v && isStringCell(v)).length;
    const totalCells = row.filter((v) => v && v.trim() !== '').length;
    if (totalCells < 3) continue; // too sparse
    const ratio = stringCells / totalCells;
    // Check the next 2 rows have data
    const nextRows = rows.slice(i + 1, i + 3);
    const hasData = nextRows.every((r) => r.filter((v) => v && v.trim() !== '').length >= 2);
    if (ratio > bestScore && hasData) {
      bestScore = ratio;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Find the last contiguous data row (stop at first fully-blank row after header).
 */
function findDataEnd(rows: string[][], startRow: number): number {
  let lastNonBlank = startRow;
  for (let i = startRow; i < rows.length; i++) {
    const hasContent = rows[i].some((v) => v && v.trim() !== '');
    if (hasContent) lastNonBlank = i;
    else break; // first fully-blank row stops the block
  }
  return lastNonBlank;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseSheet(tabName: string, rawRows: string[][]): ParsedSheet {
  if (!rawRows || rawRows.length === 0) {
    return { tabName, headerRowIndex: 0, columns: [], rows: [], primaryKeyColumn: undefined };
  }

  const headerRowIndex = detectHeaderRow(rawRows);
  const headerRow = rawRows[headerRowIndex];
  const dataEnd = findDataEnd(rawRows, headerRowIndex + 1);
  const dataRows = rawRows.slice(headerRowIndex + 1, dataEnd + 1);

  // Build column metadata
  const columns: ColumnMeta[] = [];
  for (let ci = 0; ci < headerRow.length; ci++) {
    const rawHeader = (headerRow[ci] ?? '').trim();
    if (!rawHeader) continue;

    const normalizedKey = normalizeHeader(rawHeader);
    const sampleValues = dataRows
      .map((r) => r[ci])
      .filter((v) => v && v.trim() !== '')
      .slice(0, 5);

    const type = inferCellType(sampleValues, rawHeader);
    columns.push({ rawHeader, normalizedKey, type, index: ci });
  }

  // Detect unmapped columns (log warning, don't drop)
  columns.forEach((col) => {
    const isSlugFallback = !Object.keys(HEADER_SYNONYMS).includes(col.normalizedKey);
    if (isSlugFallback) {
      console.warn(`[parser] Unmapped column "${col.rawHeader}" → normalized as "${col.normalizedKey}"`);
    }
  });

  // Parse data rows
  const parsedRows: Record<string, RawCellValue>[] = [];
  for (const raw of dataRows) {
    const obj: Record<string, RawCellValue> = {};
    let hasAnyValue = false;
    for (const col of columns) {
      const cell = raw[col.index] ?? '';
      const val = parseCell(cell, col.type);
      obj[col.normalizedKey] = val;
      if (val !== null) hasAnyValue = true;
    }
    if (hasAnyValue) parsedRows.push(obj);
  }

  // Detect primary key
  let primaryKeyColumn: string | undefined;
  const colKeys = columns.map((c) => c.normalizedKey);
  if (colKeys.some((k) => BOND_KEY_HINTS.includes(k))) {
    primaryKeyColumn = 'isin';
  } else if (colKeys.some((k) => EQUITY_KEY_HINTS.includes(k))) {
    primaryKeyColumn = 'ticker';
  }

  return { tabName, headerRowIndex, columns, rows: parsedRows, primaryKeyColumn };
}
