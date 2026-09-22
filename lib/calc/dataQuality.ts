/**
 * Data Quality & Validation Engine
 *
 * Validates normalized portfolio data (equity, bonds, transactions) and
 * returns a DataQualityReport with categorized issues.
 *
 * This runs SERVER-SIDE after normalization, before data reaches the UI.
 * It never crashes the app — it only flags issues.
 */

import type { EquityHolding } from '@/types/holdings';
import type { BondHolding } from '@/types/bonds';
import type { Transaction } from '@/types/transactions';
import type { DataIssue, DataQualityReport, IssueSeverity, IssueCategory } from '@/types/dataQuality';

let _issueCounter = 0;
function makeId(): string {
  return `dq-${++_issueCounter}`;
}

function issue(
  severity: IssueSeverity,
  category: IssueCategory,
  field: string,
  message: string,
  affectedRecord?: string,
): DataIssue {
  return { id: makeId(), severity, category, field, message, affectedRecord };
}

// ---------------------------------------------------------------------------
// Equity validation
// ---------------------------------------------------------------------------

function validateEquity(equity: EquityHolding[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const seenTickers = new Map<string, number>(); // ticker → count

  for (const h of equity) {
    const label = h.ticker || h.name || '(unknown)';

    // Missing name
    if (!h.name || h.name.trim() === '') {
      issues.push(issue('error', 'missing', 'name', `Holding is missing a name`, label));
    }

    // Missing or zero current value
    if (h.currentValue == null || h.currentValue < 0) {
      issues.push(issue('error', 'invalid', 'currentValue',
        `Negative or missing current value`, label));
    }

    // Missing sector
    if (!h.sector || h.sector === 'Unknown') {
      issues.push(issue('warning', 'missing', 'sector',
        `Holding has no sector classification`, label));
    }

    // Duplicate ticker detection
    if (h.ticker) {
      const c = (seenTickers.get(h.ticker) ?? 0) + 1;
      seenTickers.set(h.ticker, c);
    }
  }

  // Flag duplicates
  for (const [ticker, count] of seenTickers.entries()) {
    if (count > 1) {
      issues.push(issue('warning', 'duplicate', 'ticker',
        `Ticker "${ticker}" appears ${count} times in equity data`, ticker));
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Bond validation
// ---------------------------------------------------------------------------

function validateBonds(bonds: BondHolding[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const seenIsins = new Map<string, number>();

  for (const b of bonds) {
    const label = b.securityName || b.isin || '(unknown bond)';

    // Missing ISIN
    if (!b.isin || b.isin.trim() === '') {
      issues.push(issue('warning', 'missing', 'isin', `Bond is missing an ISIN`, label));
    }

    // Missing maturity date
    if (!b.maturityDate) {
      issues.push(issue('warning', 'missing', 'maturityDate',
        `Bond has no maturity date — timeline cannot include this bond`, label));
    } else {
      // Validate maturity date format
      const d = parseDateSafe(b.maturityDate);
      if (!d) {
        issues.push(issue('error', 'invalid', 'maturityDate',
          `Maturity date "${b.maturityDate}" is not a recognizable date format`, label));
      }
    }

    // Invalid coupon rate
    if (b.couponRate < 0 || b.couponRate > 1) {
      issues.push(issue('warning', 'invalid', 'couponRate',
        `Coupon rate ${(b.couponRate * 100).toFixed(2)}% looks unusual`, label));
    }

    // Missing or zero total value
    if (!b.totalValue || b.totalValue <= 0) {
      issues.push(issue('warning', 'missing', 'totalValue',
        `Bond has no total value`, label));
    }

    // Duplicate ISIN
    if (b.isin) {
      const c = (seenIsins.get(b.isin) ?? 0) + 1;
      seenIsins.set(b.isin, c);
    }
  }

  for (const [isin, count] of seenIsins.entries()) {
    if (count > 1) {
      issues.push(issue('warning', 'duplicate', 'isin',
        `ISIN "${isin}" appears ${count} times in bond data`, isin));
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Transaction validation
// ---------------------------------------------------------------------------

function validateTransactions(transactions: Transaction[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const seenDates = new Map<string, number>();

  for (const t of transactions) {
    const label = t.date instanceof Date ? t.date.toLocaleDateString('en-IN') : String(t.date);

    // Future-dated transactions
    const txDate = t.date instanceof Date ? t.date : new Date(t.date);
    if (txDate > today) {
      issues.push(issue('info', 'future-dated', 'date',
        `Transaction dated ${label} is in the future`, label));
    }

    // Negative investment
    if (t.investment < 0) {
      issues.push(issue('warning', 'invalid', 'investment',
        `Negative investment value on ${label}`, label));
    }

    // Track duplicate dates (warn only — same-day multiple transactions are valid)
    const key = txDate.toISOString().slice(0, 10);
    seenDates.set(key, (seenDates.get(key) ?? 0) + 1);
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDateSafe(raw: string): Date | null {
  // ISO
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;
  // DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function computeCompleteness(
  equity: EquityHolding[],
  bonds: BondHolding[],
  transactions: Transaction[],
  issues: DataIssue[],
): number {
  // Count total "fields" we care about across all records
  const totalFields =
    equity.length * 3 +  // name, currentValue, sector
    bonds.length * 3 +   // isin, maturityDate, totalValue
    transactions.length * 1; // date

  if (totalFields === 0) return 100;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  // Errors count full, warnings count half
  const penaltyPoints = errorCount + warningCount * 0.5;
  const pct = Math.max(0, ((totalFields - penaltyPoints) / totalFields) * 100);
  return Math.round(Math.min(100, pct));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validatePortfolioData(
  equity: EquityHolding[],
  bonds: BondHolding[],
  transactions: Transaction[],
): DataQualityReport {
  _issueCounter = 0; // reset per validation run

  const equityIssues = validateEquity(equity);
  const bondIssues = validateBonds(bonds);
  const txIssues = validateTransactions(transactions);

  const allIssues = [...equityIssues, ...bondIssues, ...txIssues];

  const equityErrors = equityIssues.filter((i) => i.severity === 'error').length;
  const bondErrors = bondIssues.filter((i) => i.severity === 'error').length;
  const txErrors = txIssues.filter((i) => i.severity === 'error').length;

  return {
    issues: allIssues,
    completenessPercent: computeCompleteness(equity, bonds, transactions, allIssues),
    equityOk: equityErrors === 0 && equity.length > 0,
    bondsOk: bondErrors === 0 && bonds.length > 0,
    transactionsOk: txErrors === 0 && transactions.length > 0,
  };
}
