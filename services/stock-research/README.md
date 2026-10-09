# Stock Research Python Extraction Service

Dedicated Python service for extracting, normalizing, and serving financial statement data from Indian markets.

## 1. Compliance and Access Guardrails

- **Scraping Disabled by Default:** Per the project compliance policy, automated browser extraction from Screener.in (`openscreener`) is disabled by default (`ENABLE_SCREENER_SCRAPER=false`).
- **Authorization Requirement:** Automated scraping must only be activated if permitted under the source site's Terms of Service and applicable policies.
- **Graceful Fallback:** When the live browser scraper is disabled or unavailable, the service serves verified normalized fixtures or delegates to the Yahoo Finance API.
- **Never Run in Vercel Serverless:** Playwright browser automation is isolated to this standalone worker service and is never executed inside Next.js serverless functions.

## 2. Directory Structure

```
services/stock-research/
├── README.md               # Architecture, compliance, and run instructions
├── config.py               # Pydantic settings & environment variables
├── models.py               # Pydantic data models matching normalized TypeScript schema
├── openscreener_adapter.py # Adapter for openscreener library with safety guardrails
├── server.py               # FastAPI internal worker endpoint
└── test_adapter.py         # Test suite for extraction and normalization
```

## 3. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ENABLE_SCREENER_SCRAPER` | `false` | Set to `true` to enable Playwright extraction when authorized |
| `INTERNAL_API_SECRET` | `secret-token` | Bearer token required for all worker API requests |
| `WORKER_PORT` | `8001` | Local port for FastAPI worker |
| `PLAYWRIGHT_HEADLESS` | `true` | Runs browser headless |

## 4. How to Run

### Install Dependencies

```bash
cd services/stock-research
pip install fastapi uvicorn pydantic
# Optional if enabling live Playwright extraction:
# pip install openscreener playwright
# python -m playwright install chromium
```

### Run the FastAPI Service

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Run Tests

```bash
python -m unittest test_adapter.py
```
