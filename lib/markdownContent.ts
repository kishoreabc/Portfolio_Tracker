/**
 * Structured markdown content for acceptmarkdown.com negotiation and agent consumption.
 */

export const MARKDOWN_PAGES: Record<string, string> = {
  '/': `# Portfolio Dashboard — Real-time Investment & Asset Tracking

Personal investment portfolio dashboard with real-time equity and bond tracking, asset allocation, cash flow analysis, and AI insights.

## Overview
Portfolio Dashboard provides unified tracking across Indian equities (NSE/BSE), fixed-income bond ladders, transaction ledgers, and Gemini-powered portfolio intelligence.

## Core Features
- **Equities & Stock Analysis**: Real-time price quotes, P&L tracking, sector allocations, and historical performance metrics.
- **Fixed Income & Bond Ladder**: Bond maturity schedules, coupon payment dates, yield to maturity (YTM), and issuer ratings.
- **Cash Flow Ledger**: Daily transaction tracking, monthly expense breakdown, and investment pacing.
- **AI Market & Portfolio Insights**: Automated portfolio risk analysis, market sentiment integration, and anomaly detection.
- **Developer Platform & MCP**: Public REST APIs, OpenAPI 3.1.0 specifications, and Model Context Protocol (MCP) server integration.

## Developer & Machine-Readable Resources
- **Developer Portal**: [/developers](/developers)
- **API Documentation**: [/docs](/docs)
- **OpenAPI 3.1.0 Spec**: [/openapi.json](/openapi.json)
- **Model Context Protocol (MCP)**: [/.well-known/mcp](/.well-known/mcp)
- **Agent Instructions**: [/llms.txt](/llms.txt)
- **Sitemap**: [/sitemap.xml](/sitemap.xml)

## Trust & Verification
- **About**: [/about](/about)
- **Contact**: [/contact](/contact)
- **Privacy Policy**: [/privacy](/privacy)
`,

  '/about': `# About Portfolio Dashboard

Portfolio Dashboard is a personal wealth and investment management platform engineered to bring institutional-grade portfolio tracking, asset allocation, and market intelligence to individual investors.

## Mission
Our mission is to empower investors with real-time transparency across complex multi-asset portfolios. We believe individual investors should have access to the same analytics, cash flow forecasting, and automated risk synthesis tools utilized by professional wealth managers.

## Key Capabilities
1. **Multi-Asset Allocation**: Unified tracking of NSE/BSE equities, corporate bonds, sovereign debt securities, and cash equivalents.
2. **Real-time Valuation**: Live market feeds and price tracking for Indian equities and benchmark indices (NIFTY 50, NIFTY BANK, etc.).
3. **Fixed-Income Analytics**: Bond ladders, coupon schedules, duration analysis, and yield-to-maturity (YTM) calculations.
4. **AI-Powered Insights**: Semantic search, financial news sentiment classification, and portfolio health checks powered by Google Gemini.
5. **Agentic & Developer First**: Native Model Context Protocol (MCP) support, OpenAPI 3.1.0 specifications, and public programmatic APIs.

## Architecture & Data Protection
- **Zero-Storage of Financial Credentials**: We never store brokerage passwords or banking credentials.
- **Read-Only Integration**: Data synchronization uses read-only Google Sheets integrations.
- **Privacy Mode**: Built-in balance masking prevents sensitive figures from displaying in public environments.
- **Session Protection**: Automatic inactivity detection and session timeouts guard your session.

## Organization
- **Entity**: Portfolio Dashboard
- **Headquarters**: 100 Financial Way, Bengaluru, Karnataka 560001, India
- **Contact**: support@portfolio-tracker.example.com | +1-800-555-0199
- **Repository & Docs**: [/developers](/developers)
`,

  '/contact': `# Contact Portfolio Dashboard

We welcome inquiries, feedback, integration requests, and security disclosures.

## Support & General Inquiries
- **Email**: support@portfolio-tracker.example.com
- **Technical Support**: tech@portfolio-tracker.example.com
- **Phone**: +1-800-555-0199
- **Hours**: Monday – Friday, 9:00 AM – 6:00 PM IST

## Headquarters & Postal Address
**Portfolio Dashboard**
100 Financial Way
Bengaluru, Karnataka 560001
India

## Developer & Agent Support
- **Developer Portal**: [/developers](/developers)
- **API Documentation**: [/docs](/docs)
- **MCP Server Handshake**: [/.well-known/mcp](/.well-known/mcp)
- **OpenAPI Specification**: [/openapi.json](/openapi.json)
- **Agent Instructions**: [/llms.txt](/llms.txt)

## Security & Responsible Disclosure
If you discover a security vulnerability, please report it directly to security@portfolio-tracker.example.com. We investigate all valid submissions promptly.
`,

  '/privacy': `# Privacy Policy — Portfolio Dashboard

Last updated: September 2026

Portfolio Dashboard is committed to protecting your privacy and ensuring the security of your financial data. This Privacy Policy details our practices regarding information collection, processing, and storage.

## 1. Information Collection & Read-Only Access
- **Portfolio Data**: All portfolio information (equities, bonds, transaction logs) is retrieved exclusively via read-only Google Sheets connections configured by you. We do not require, collect, or store brokerage account passwords or financial transaction credentials.
- **Authentication Credentials**: We support Google OAuth and password authentication. Passwords are securely hashed.
- **Session Data**: Sessions are managed with encrypted JWT tokens stored in secure, HttpOnly cookies with strict expiration limits.

## 2. In-Memory Processing & Privacy Masking
- Market data and portfolio valuations are computed transiently in server memory and client-side state.
- **Privacy Mode**: The application includes a client-side privacy toggle that masks financial figures and balances (displaying asterisks) to protect confidentiality during screen sharing or in public environments.

## 3. Third-Party Services
- **Yahoo Finance**: Used to fetch publicly available market prices and index changes for NSE/BSE securities. No user identities or personal portfolios are transmitted to Yahoo Finance.
- **Google Gemini**: AI synthesis routes process anonymized portfolio statistics (asset counts, sector weightings, and percentage changes) to generate insights. No personal names or account identifiers are shared.

## 4. Cookies & Local Storage
- We use essential cookies strictly for session authentication and security verification.
- Local storage is used solely for non-sensitive UI preferences (such as theme selection, font size, and privacy toggle states).

## 5. Your Rights & Contact Information
You maintain full ownership of your data. You may revoke sheet access or terminate your account at any time.
For privacy questions or data requests:
- **Email**: privacy@portfolio-tracker.example.com
- **Address**: Portfolio Dashboard, 100 Financial Way, Bengaluru, Karnataka 560001, India
`,

  '/developers': `# Portfolio Dashboard Developer Portal

Welcome to the Portfolio Dashboard Developer Portal. Build automated integrations, AI agent workflows, and financial analytics tools using our public REST APIs and Model Context Protocol (MCP) server.

## Quickstart

### 1. Fetch Real-time Market Quotes
\`\`\`bash
curl -s https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/market-data
\`\`\`

### 2. Fetch System Summary & Status
\`\`\`bash
curl -s https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/v1/summary
\`\`\`

### 3. Python Integration
\`\`\`python
import requests

response = requests.get("https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/market-data")
quotes = response.json()
for item in quotes[:5]:
    print(f"{item['symbol']}: {item['value']}")
\`\`\`

### 4. TypeScript Integration
\`\`\`typescript
const res = await fetch("https://portfolio-tracker-kishoreabcs-projects.vercel.app/api/market-data");
const quotes = await res.json();
console.log("Market snapshot:", quotes);
\`\`\`

## Model Context Protocol (MCP) Integration
Connect Claude, ChatGPT, Cursor, or Antigravity to Portfolio Dashboard via MCP:
- **MCP Endpoint**: \`https://portfolio-tracker-kishoreabcs-projects.vercel.app/.well-known/mcp\`
- **Transport**: Streamable HTTP / Server-Sent Events (SSE) & JSON-RPC 2.0
- **Exposed Tools**:
  - \`get_market_quotes\`: Live quotes for Indian indices and equities.
  - \`get_portfolio_summary\`: Platform summary, asset classes, and system status.
  - \`calculate_asset_allocation\`: Computes allocation percentages across equities and bonds.

## Developer Resources
- [Interactive API Documentation](/docs)
- [OpenAPI 3.1.0 Specification](/openapi.json)
- [YAML OpenAPI Specification](/api/openapi.yaml)
- [Agent Instructions (llms.txt)](/llms.txt)
- [XML Sitemap](/sitemap.xml)
`,

  '/docs': `# Portfolio Dashboard API Reference

Comprehensive reference for public and authenticated Portfolio Dashboard API endpoints.

## Base URL
\`https://portfolio-tracker-kishoreabcs-projects.vercel.app\`

## Authentication
- **Public Endpoints**: Do not require authentication. Free for AI agents and developers.
- **Authenticated Endpoints**: Require a valid session cookie or Authorization header.

## Public Endpoints

### 1. \`GET /api/market-data\`
Returns real-time prices and percentage changes for Indian stock market indices (NIFTY 50, NIFTY BANK, NIFTY IT, etc.) and selected equities.
- **Rate Limit**: 60 requests / minute per IP.
- **Response**: Array of objects with \`symbol\` and \`value\`.

### 2. \`GET /api/v1/summary\`
Returns system operational summary, supported asset classes, index coverage, and API status.
- **Response**:
  \`\`\`json
  {
    "platform": "Portfolio Dashboard",
    "version": "1.0.0",
    "status": "operational",
    "asset_classes": ["Equities", "Corporate Bonds", "Government Bonds", "Cash Flow"],
    "indices_supported": ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY PHARMA", "INDIA VIX"],
    "endpoints": {
      "market_data": "/api/market-data",
      "openapi": "/openapi.json",
      "mcp": "/.well-known/mcp",
      "docs": "/docs"
    }
  }
  \`\`\`

### 3. \`GET /api/v1/health\`
Returns API health status and server timestamp.

### 4. \`POST /.well-known/mcp\`
Model Context Protocol (MCP) JSON-RPC 2.0 endpoint for AI agents.

## Error Response Format
All error responses adhere to standard JSON error formatting:
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "resolution_hint": "Actionable guidance to resolve the error"
  },
  "code": "ERROR_CODE",
  "message": "Human-readable error description",
  "resolution_hint": "Actionable guidance to resolve the error"
}
\`\`\`
`,

  '404': `# 404 Not Found

The requested resource was not found on Portfolio Dashboard.

## Available Resources
- [Home](/)
- [Developer Portal](/developers)
- [API Documentation](/docs)
- [OpenAPI 3.1.0 Specification](/openapi.json)
- [Model Context Protocol (MCP)](/.well-known/mcp)
- [Agent Instructions (llms.txt)](/llms.txt)
- [XML Sitemap](/sitemap.xml)
- [About](/about)
- [Contact](/contact)
- [Privacy Policy](/privacy)
`
};

export function getMarkdownForPath(path: string): string | null {
  const normalized = path.replace(/\/$/, '') || '/';
  if (MARKDOWN_PAGES[normalized]) {
    return MARKDOWN_PAGES[normalized];
  }
  return null;
}
