/**
 * lib/analysis/providers/screener-notes.ts
 *
 * COMPLIANCE NOTES — openscreener / Screener.in Integration
 *
 * The openscreener library (https://github.com/Na1neeth/openscreener) uses
 * Playwright to extract data from Screener.in.
 *
 * IMPORTANT ASSESSMENT (as of October 2026):
 *
 * 1. TERMS OF SERVICE:
 *    Screener.in's Terms of Service prohibit automated data extraction without
 *    prior written authorization. Specifically, the ToS states users may not
 *    "use any robot, spider, site search/retrieval application, or other manual
 *    or automatic device or process to retrieve, index, 'data mine', or in any
 *    way reproduce or circumvent the navigational structure or presentation of
 *    the Service."
 *
 * 2. PLAYWRIGHT-BASED SCRAPING:
 *    The openscreener library uses browser automation (Playwright) which:
 *    - Cannot be deployed inside Vercel serverless functions (no Playwright runtime)
 *    - Requires a separate Python worker process
 *    - Requires explicit authorization from Screener.in before use
 *
 * 3. CURRENT STATUS:
 *    The scraper integration is DISABLED by default. The SCREENER_SCRAPER_ENABLED
 *    environment variable must be explicitly set to 'true' AND Screener.in
 *    authorization must be obtained before enabling.
 *
 * 4. AUTHORIZED ALTERNATIVE:
 *    Until authorization is obtained, the module uses:
 *    - Yahoo Finance (authorized, free-tier) for price, profile, fundamentals
 *    - Labeled fixtures for demonstration of data not available from Yahoo Finance
 *    - Clear "Data Unavailable" states for sections requiring Screener data
 *
 * 5. ENABLING LATER:
 *    If authorization is obtained, set SCREENER_SCRAPER_ENABLED=true and
 *    SCREENER_WORKER_URL=<your-python-worker-url> in environment variables.
 *    The screener adapter (when implemented) would replace fixture data
 *    without requiring any frontend changes.
 */

export const SCREENER_SCRAPER_ENABLED = process.env.SCREENER_SCRAPER_ENABLED === 'true';
export const SCREENER_WORKER_URL = process.env.SCREENER_WORKER_URL || '';

export function screenerDisabledNote(): string {
  return 'Detailed Indian financial statement data (quarterly results, shareholding patterns, ' +
    'corporate filings) requires an authorized data source. The automated scraper integration ' +
    'is disabled pending authorization from Screener.in. ' +
    'Showing available data from Yahoo Finance.';
}
