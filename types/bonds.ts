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
}

export interface BondMaturityEvent {
  isin: string;
  securityName: string;
  issuer: string;
  maturityDate: Date;
  totalValue: number;
  couponRate: number;
  creditRating: string;
  /** Estimated coupon payment dates (not from sheet, derived from couponRate + maturityDate) */
  estimatedCouponDates: Date[];
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
