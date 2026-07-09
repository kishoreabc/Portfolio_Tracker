import type { ParsedSheet } from '@/types/sheets';
import type { Transaction, MonthlySummary, CashFlowStats } from '@/types/transactions';
import { format, parseISO, isValid, getYear, getMonth } from 'date-fns';

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  // Try DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MMM-YYYY
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // ISO
    /^(\d{2})-([A-Za-z]{3})-(\d{4})$/, // DD-Mon-YYYY
  ];
  const s = String(raw).trim();

  // Try ISO first
  try {
    const d = parseISO(s);
    if (isValid(d)) return d;
  } catch { /* fall through */ }

  // Try DD/MM/YYYY
  const ddmm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmm) {
    const d = new Date(Number(ddmm[3]), Number(ddmm[2]) - 1, Number(ddmm[1]));
    if (isValid(d)) return d;
  }

  return null;
}

const MONTH_LABELS: Record<number, string> = {
  0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
  6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec',
};

export function mapTransactions(sheet: ParsedSheet | null): Transaction[] {
  if (!sheet || !sheet.rows.length) return [];

  return sheet.rows
    .map((row) => {
      const date = parseDate(row.date as string);
      if (!date) return null;
      return {
        date,
        foodAndEntertainment: Number(row.foodAndEntertainment ?? 0),
        investment: Number(row.investment ?? 0),
        others: Number(row.others ?? 0),
        dailyTotal: Number(row.dailyTotal ?? 0),
      } satisfies Transaction;
    })
    .filter((t): t is Transaction => t !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function buildCashFlowStats(transactions: Transaction[]): CashFlowStats {
  if (!transactions.length) {
    return {
      totalInvestment: 0,
      totalExpenses: 0,
      totalFoodAndEntertainment: 0,
      totalOthers: 0,
      monthlySummaries: [],
      startDate: null,
      endDate: null,
    };
  }

  // Group by year-month
  const monthMap = new Map<string, MonthlySummary>();

  let totalInvestment = 0;
  let totalExpenses = 0;
  let totalFoodAndEntertainment = 0;
  let totalOthers = 0;

  for (const t of transactions) {
    const y = getYear(t.date);
    const m = getMonth(t.date);
    const key = `${y}-${String(m).padStart(2, '0')}`;

    totalInvestment += t.investment;
    totalFoodAndEntertainment += t.foodAndEntertainment;
    totalOthers += t.others;
    totalExpenses += t.foodAndEntertainment + t.others;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        year: y,
        month: m,
        label: `${MONTH_LABELS[m]} ${y}`,
        foodAndEntertainment: 0,
        investment: 0,
        others: 0,
        totalExpenses: 0,
      });
    }

    const ms = monthMap.get(key)!;
    ms.foodAndEntertainment += t.foodAndEntertainment;
    ms.investment += t.investment;
    ms.others += t.others;
    ms.totalExpenses += t.foodAndEntertainment + t.others;
  }

  const monthlySummaries = Array.from(monthMap.values()).sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );

  return {
    totalInvestment,
    totalExpenses,
    totalFoodAndEntertainment,
    totalOthers,
    monthlySummaries,
    startDate: transactions[0].date,
    endDate: transactions[transactions.length - 1].date,
  };
}
