"""
services/stock-research/test_adapter.py

Unit tests for openscreener adapter and normalization logic.
"""

import unittest
from unittest.mock import patch

from openscreener_adapter import (
    normalize_financial_dict_to_table,
    extract_stock_data,
    ScreenerScraperNotPermittedError,
)
from config import settings


class TestOpenScreenerAdapter(unittest.TestCase):

    def test_compliance_guardrail_raises_when_disabled(self):
        """Verifies that automated extraction is blocked by default."""
        with patch.object(settings, "enable_screener_scraper", False):
            with self.assertRaises(ScreenerScraperNotPermittedError):
                extract_stock_data("TITAN")

    def test_normalize_financial_dict_to_table(self):
        """Tests that raw period dictionaries map correctly to FinancialTable."""
        sample_raw = {
            "Sep 2023": {"Sales": 12529.0, "Operating Profit": 1355.0},
            "Dec 2023": {"Sales": 14163.0, "Operating Profit": 1561.0},
        }

        table = normalize_financial_dict_to_table(sample_raw, "quarterly")

        self.assertEqual(len(table.periods), 2)
        self.assertEqual(table.periods[0].period, "Sep 2023")
        self.assertEqual(table.periods[1].period, "Dec 2023")

        self.assertEqual(len(table.rows), 2)
        sales_row = next(r for r in table.rows if r.metric == "Sales")
        self.assertEqual(sales_row.values, [12529.0, 14163.0])

        op_row = next(r for r in table.rows if r.metric == "Operating Profit")
        self.assertEqual(op_row.values, [1355.0, 1561.0])

    def test_normalize_handles_missing_keys_gracefully(self):
        """Tests handling when one quarter has a metric and another quarter does not."""
        sample_raw = {
            "Q1": {"Sales": 1000.0, "NewMetric": 50.0},
            "Q2": {"Sales": 1200.0},  # Missing NewMetric
        }

        table = normalize_financial_dict_to_table(sample_raw, "quarterly")
        new_metric_row = next(r for r in table.rows if r.metric == "NewMetric")
        self.assertEqual(new_metric_row.values, [50.0, None])

    def test_empty_raw_dict_returns_empty_table(self):
        """Tests that an empty raw input returns an empty FinancialTable with unavailable status."""
        table = normalize_financial_dict_to_table({}, "quarterly")
        self.assertEqual(len(table.periods), 0)
        self.assertEqual(len(table.rows), 0)
        self.assertEqual(table.meta.status, "unavailable")


if __name__ == "__main__":
    unittest.main()
