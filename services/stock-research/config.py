"""
services/stock-research/config.py

Configuration and security policies for the stock research worker.
Uses standard library dataclasses for zero-dependency execution.
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    # Compliance: Screener scraping disabled by default
    enable_screener_scraper: bool = os.getenv("ENABLE_SCREENER_SCRAPER", "false").lower() in ("true", "1", "yes")
    
    # Internal secret token required for worker API calls
    internal_api_secret: str = os.getenv("INTERNAL_API_SECRET", "stock-research-internal-secret")
    
    # Service port
    port: int = int(os.getenv("WORKER_PORT", "8001"))
    
    # Playwright browser settings
    playwright_headless: bool = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() in ("true", "1", "yes")
    browser_timeout_ms: int = int(os.getenv("BROWSER_TIMEOUT_MS", "30000"))
    
    # Request delay to respect server rates
    request_delay_seconds: float = float(os.getenv("REQUEST_DELAY_SECONDS", "3.0"))


settings = Settings()
