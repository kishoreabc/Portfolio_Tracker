"""
services/stock-research/models.py

Data schemas matching the application's normalized TypeScript data model.
Uses dataclasses with default values for flexible, zero-dependency execution.
"""

from typing import List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class DataSourceMeta:
    source: str = "Screener.in"
    fetchedAt: Optional[str] = None
    lastSuccessfulRefresh: Optional[str] = None
    status: str = "fresh"  # 'fresh' | 'stale' | 'unavailable' | 'error'


@dataclass
class CompanyProfile:
    symbol: str
    name: str
    exchange: str = "NSE"
    currency: str = "INR"
    sector: Optional[str] = None
    industry: Optional[str] = None
    bseCode: Optional[str] = None
    isin: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    reportingMode: str = "consolidated"
    meta: DataSourceMeta = field(default_factory=DataSourceMeta)


@dataclass
class FinancialPeriod:
    period: str
    periodType: str
    reportingMode: str = "consolidated"
    currency: str = "INR"
    unit: str = "Cr"


@dataclass
class FinancialRow:
    metric: str
    values: List[Optional[float]] = field(default_factory=list)
    unit: Optional[str] = None


@dataclass
class FinancialTable:
    periods: List[FinancialPeriod] = field(default_factory=list)
    rows: List[FinancialRow] = field(default_factory=list)
    meta: DataSourceMeta = field(default_factory=DataSourceMeta)


@dataclass
class ShareholdingQuarter:
    quarter: str
    promoters: Optional[float] = None
    fii: Optional[float] = None
    dii: Optional[float] = None
    mutualFunds: Optional[float] = None
    public: Optional[float] = None
    others: Optional[float] = None
    total: Optional[float] = 100.0


@dataclass
class ShareholdingData:
    history: List[ShareholdingQuarter] = field(default_factory=list)
    latest: Optional[ShareholdingQuarter] = None
    meta: DataSourceMeta = field(default_factory=DataSourceMeta)


@dataclass
class ResearchExtractionResult:
    symbol: str
    company: CompanyProfile
    quarterlyFinancials: FinancialTable
    annualFinancials: FinancialTable
    balanceSheet: FinancialTable
    cashFlow: FinancialTable
    shareholding: ShareholdingData
    fetchedAt: str

    def to_dict(self):
        return asdict(self)
