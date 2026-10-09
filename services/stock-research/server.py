"""
services/stock-research/server.py

FastAPI internal microservice endpoint for financial data extraction.
Protected by internal Bearer token authentication.
"""

from fastapi import FastAPI, HTTPException, Header, Depends, status
from pydantic import BaseModel
import re

from config import settings
from models import ResearchExtractionResult
from openscreener_adapter import extract_stock_data, ScreenerScraperNotPermittedError

app = FastAPI(
    title="Stock Research Extraction Worker",
    version="1.0.0",
    docs_url=None,  # Disabled public documentation for internal microservice
    redoc_url=None,
)

SYMBOL_REGEX = re.compile(r"^[A-Za-z0-9_-]{1,30}$")


def verify_internal_auth(authorization: str = Header(None)):
    """Validates that requests are authenticated internal worker requests."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization format. Expected 'Bearer <token>'",
        )
        
    token = parts[1]
    if token != settings.internal_api_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal authorization token",
        )


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "scraper_enabled": settings.enable_screener_scraper,
    }


@app.post(
    "/api/research/extract/{symbol}",
    response_model=ResearchExtractionResult,
    dependencies=[Depends(verify_internal_auth)],
)
def extract_company_research(symbol: str):
    upper_symbol = symbol.upper().strip()
    if not SYMBOL_REGEX.match(upper_symbol):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticker symbol format",
        )

    try:
        result = extract_stock_data(upper_symbol)
        return result
    except ScreenerScraperNotPermittedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}",
        )
