export interface PortfolioHealth {
  score: number;
  summary: string;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface Allocation {
  equity: number;
  bonds: number;
  gold: number;
  cash: number;
}

export interface Opportunity {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Risk {
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface CashFlow {
  investment: number;
  expenses: number;
  net: number;
  summary: string;
}

export interface AIInsightsResponse {
  health: PortfolioHealth;
  allocation: Allocation;
  opportunities: Opportunity[];
  risks: Risk[];
  cashFlow: CashFlow;
  recommendations: string[];
  summary: string;
}
