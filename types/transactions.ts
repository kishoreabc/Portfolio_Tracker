export interface Transaction {
  date: Date;
  foodAndEntertainment: number;
  investment: number;
  others: number;
  dailyTotal: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  /** e.g. "Jul 2025" */
  label: string;
  foodAndEntertainment: number;
  investment: number;
  others: number;
  totalExpenses: number;
}

export interface CashFlowStats {
  totalInvestment: number;
  totalExpenses: number;
  totalFoodAndEntertainment: number;
  totalOthers: number;
  monthlySummaries: MonthlySummary[];
  /** Earliest transaction date */
  startDate: Date | null;
  /** Latest transaction date */
  endDate: Date | null;
}
