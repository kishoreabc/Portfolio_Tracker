"""
services/stock-research/openscreener_adapter.py

Adapter for the openscreener library with safety guardrails,
response normalization, and fallback handling.
"""

import datetime
import logging
from typing import Optional, Dict, Any

from config import settings
from models import (
    ResearchExtractionResult,
    CompanyProfile,
    FinancialTable,
    FinancialPeriod,
    FinancialRow,
    ShareholdingData,
    ShareholdingQuarter,
    DataSourceMeta,
)

logger = logging.getLogger(__name__)


class ScreenerScraperNotPermittedError(Exception):
    """Raised when extraction is attempted without authorization flag enabled."""
    pass


def normalize_financial_dict_to_table(
    raw_dict: Dict[str, Any],
    period_type: str = "quarterly"
) -> FinancialTable:
    """
    Normalizes a dictionary from openscreener/Screener.in into the FinancialTable schema.
    Example raw format:
    {
       "Sep 2023": {"Sales": 12529, "Expenses": 11174, "Operating Profit": 1355},
       "Dec 2023": {"Sales": 14163, "Expenses": 12602, "Operating Profit": 1561}
    }
    """
    if not raw_dict:
        return FinancialTable(
            periods=[],
            rows=[],
            meta=DataSourceMeta(source="Screener.in", status="unavailable")
        )

    period_names = list(raw_dict.keys())
    periods = [
        FinancialPeriod(
            period=p,
            periodType=period_type,
            reportingMode="consolidated",
            currency="INR",
            unit="Cr"
        )
        for p in period_names
    ]

    # Collect all unique metric names across periods
    all_metrics = []
    seen = set()
    for p in period_names:
        for m in raw_dict[p].keys():
            if m not in seen:
                seen.add(m)
                all_metrics.append(m)

    rows = []
    for metric_name in all_metrics:
        values = []
        for p in period_names:
            val = raw_dict[p].get(metric_name)
            try:
                values.append(float(val) if val is not None else None)
            except (ValueError, TypeError):
                values.append(None)
        rows.append(FinancialRow(metric=metric_name, values=values, unit="Cr"))

    return FinancialTable(
        periods=periods,
        rows=rows,
        meta=DataSourceMeta(
            source="Screener.in (openscreener)",
            fetchedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            status="fresh"
        )
    )


def extract_stock_data(symbol: str) -> ResearchExtractionResult:
    """
    Extracts stock financial statements using openscreener if enabled,
    or raises ScreenerScraperNotPermittedError.
    """
    if not settings.enable_screener_scraper:
        raise ScreenerScraperNotPermittedError(
            f"Automated extraction from Screener.in is disabled per policy. "
            f"Set ENABLE_SCREENER_SCRAPER=true only after verifying authorization."
        )

    try:
        from openscreener import Stock
    except ImportError as e:
        raise RuntimeError("openscreener is not installed. Run `pip install openscreener`") from e

    upper_symbol = symbol.upper().strip()
    logger.info("Extracting data for symbol %s via openscreener", upper_symbol)
    
    stock = Stock(upper_symbol, consolidated=True)
    
    raw_summary = stock.summary()
    raw_quarterly = stock.quarterly_results()
    raw_pnl = stock.profit_loss()
    raw_balance_sheet = stock.balance_sheet()
    raw_cash_flow = stock.cash_flow()
    raw_shareholding = stock.shareholding_quarterly()

    fetched_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    company_profile = CompanyProfile(
        symbol=upper_symbol,
        name=raw_summary.get("company_name", upper_symbol),
        exchange="NSE",
        currency="INR",
        sector=raw_summary.get("sector"),
        industry=raw_summary.get("industry"),
        bseCode=str(raw_summary.get("bse_code", "")),
        meta=DataSourceMeta(source="Screener.in", fetchedAt=fetched_at, status="fresh")
    )

    quarterly_table = normalize_financial_dict_to_table(raw_quarterly, "quarterly")
    pnl_table = normalize_financial_dict_to_table(raw_pnl, "annual")
    bs_table = normalize_financial_dict_to_table(raw_balance_sheet, "annual")
    cf_table = normalize_financial_dict_to_table(raw_cash_flow, "annual")

    # Shareholding normalization
    history = []
    if isinstance(raw_shareholding, dict):
        for q_name, q_data in raw_shareholding.items():
            if isinstance(q_data, dict):
                history.append(ShareholdingQuarter(
                    quarter=q_name,
                    promoters=q_data.get("Promoters"),
                    fii=q_data.get("FIIs"),
                    dii=q_data.get("DIIs"),
                    public=q_data.get("Public"),
                    others=q_data.get("Others", 0.0),
                ))

    shareholding = ShareholdingData(
        history=history,
        latest=history[-1] if history else None,
        meta=DataSourceMeta(source="Screener.in", fetchedAt=fetched_at, status="fresh")
    )

    return ResearchExtractionResult(
        symbol=upper_symbol,
        company=company_profile,
        quarterlyFinancials=quarterly_table,
        annualFinancials=pnl_table,
        balanceSheet=bs_table,
        cashFlow=cf_table,
        shareholding=shareholding,
        fetchedAt=fetched_at,
    )
