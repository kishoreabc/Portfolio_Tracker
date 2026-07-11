export interface BondHolding {
  broker: string;
  issuer: string;
  securityName: string;
  isin: string;
  sector: string;
  creditRating: string;
  maturityDate: string | null;
  duration: number;
  couponRate: number;
  ytm: number;
  faceValue: number;
  buyPrice: number;
  unitsHeld: number;
  totalValue: number;
  portfolioPercent: number;
  /** Payout frequency from sheet e.g. 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'At Maturity' */
  payoutType: string;
  /** Next payout / anchor date string from sheet, if present */
  payoutDate: string | null;
}

export interface CouponPayment {
  date: Date;
  /** Estimated payment amount = (faceValue * unitsHeld * couponRate) / paymentsPerYear */
  amount: number;
  /** True if dates were derived (no payoutDate in sheet), false if anchored from real payoutDate */
  isEstimated: boolean;
}

export interface BondMaturityEvent {
  isin: string;
  securityName: string;
  issuer: string;
  maturityDate: Date;
  totalValue: number;
  faceValue: number;
  unitsHeld: number;
  couponRate: number;
  creditRating: string;
  payoutType: string;
  /** Upcoming coupon payments — real if payoutDate present, estimated otherwise */
  couponPayments: CouponPayment[];
}

export interface BondLadderEntry {
  year: number;
  count: number;
  totalValue: number;
  bonds: BondHolding[];
}

export interface CreditRatingBucket {
  rating: string;
  count: number;
  totalValue: number;
  percent: number;
}
