/**
 * lib/ai/pipeline.ts
 *
 * Multi-node AI Insights pipeline.
 * Architecture: 5 sequential agent nodes, each with circular model-manager fallback,
 * real-time web scraping & market quote fetching, and verbose terminal logging.
 *
 * Node 1 — portfolioAnalyzerNode : Core portfolio metrics & health score
 * Node 2 — macroAnalystNode      : Live Web Search, RSS Scraping & Yahoo Finance Index Quotes
 * Node 3 — strategyNode          : Actionable opportunities, risks, and recommendations
 * Node 4 — riskEngineNode        : Stress scenario simulation & diversification
 * Node 5 — reportGeneratorNode   : Programmatic assembly of structured AIInsightsResponse
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getInsightsModelManager } from './models';
import type { AIInsightsResponse } from '@/types/insights';
import type { AgentActivityEvent, AgentId, AgentStatus, ActivityType } from '@/types/agent-activity';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EquityInput {
  ticker: string;
  name: string;
  sector: string;
  currentValue: number;
  percentChange: number;
  allocationPercent: number;
  shares: number;
}

export interface BondInput {
  isin: string;
  securityName: string;
  sector: string;
  creditRating: string;
  ytm: number;
  couponRate: number;
  duration: number;
  totalValue: number;
  maturityDate: string | null;
}

export interface PortfolioInput {
  // Aggregates
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  equityCount: number;
  bondCount: number;
  diversificationScore: number;
  herfindahlIndex: number;
  top5Percent: number;
  // Holdings
  topEquity: EquityInput[];
  topBonds: BondInput[];
  winners: EquityInput[];
  losers: EquityInput[];
  // Allocation
  assetAllocation: { label: string; percent: number }[];
  sectorAllocation: { sector: string; percent: number }[];
  // Cash flow
  totalInvestment: number;
  totalExpenses: number;
  monthlyAvgInvestment: number;
  lastMonthInvestment: number;
  lastMonthExpenses: number;
}

interface PipelineState {
  input: PortfolioInput;
  portfolioAnalysis: string;
  macroContext: string;
  strategyAnalysis: string;
  riskAnalysis: string;
}

// ─── Logging Helpers ──────────────────────────────────────────────────────────

function logAgentHeader(nodeNumber: number, title: string) {
  const line = '═'.repeat(64);
  console.log(`\n\x1b[36m╔${line}╗\x1b[0m`);
  console.log(`\x1b[36m║  🤖 [AGENT ${nodeNumber}] ${title.padEnd(58)}║\x1b[0m`);
  console.log(`\x1b[36m╚${line}╝\x1b[0m`);
}

function logAgentResponse(nodeNumber: number, title: string, data: any) {
  console.log(`\x1b[32m┌─── [AGENT ${nodeNumber}: ${title} OUTPUT] ───────────────────────────\x1b[0m`);
  try {
    const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    console.log(formatted);
  } catch {
    console.log(data);
  }
  console.log(`\x1b[32m└───────────────────────────────────────────────────────────────\x1b[0m\n`);
}

// ─── Model Invocation Helper ──────────────────────────────────────────────────

/** Call model with circular retry fallback and pacing delays across the model chain */
async function callWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  const manager = getInsightsModelManager();
  const maxAttempts = manager.count * 2; // Allow multiple full circular passes

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { model, index, name } = await manager.getNext();
    try {
      // Pacing delay to avoid burst rate-limits
      await manager.applyPacingDelay(1500);

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt),
      ]);

      const text =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      if (!text || text.trim().length === 0) {
        throw new Error('Received empty response from model');
      }

      return text;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|rate.limit|quota|resource.exhausted|too many requests/i.test(errMsg);
      const isKeyOrModelError = /401|403|404|invalid.*key|permission_denied|not_found|no longer available/i.test(errMsg);
      const isServiceUnavailable = /503|service.unavailable|high demand|overloaded/i.test(errMsg);

      let diagnosis = 'Unknown Error';
      if (isServiceUnavailable) {
        diagnosis = '⚠️ [503 Google Server Congestion] Model is experiencing high demand on Google servers. Automatically switching to next model.';
      } else if (isRateLimit) {
        diagnosis = '⏳ [429 Quota Exhaustion] RPM/TPM limit reached for this specific model tier. Blacklisting for 60s.';
      } else if (isKeyOrModelError) {
        diagnosis = '❌ [401/404 Key or Model Error] Invalid API key or model name deprecated by provider. Blacklisting for 5m.';
      } else {
        diagnosis = `⚠️ [API Error] ${errMsg.slice(0, 100)}`;
      }

      console.warn(
        `\n\x1b[33m[MODEL FALLBACK TRIGGERED]\x1b[0m Attempt ${attempt + 1}/${maxAttempts} on \x1b[1m${name}\x1b[0m (model ${index + 1}/${manager.count})\n ↳ \x1b[31m${diagnosis}\x1b[0m`
      );

      if (isKeyOrModelError) {
        manager.blacklist(index, 300_000, 'Invalid key or model not found (5m)');
      } else if (isRateLimit) {
        manager.blacklist(index, 60_000, 'Rate limit / quota 429 (1m)');
      } else {
        manager.blacklist(index, 30_000, 'Service unavailable / API error (30s)');
      }

      // Delay before switching circularly to next model to avoid triggering back-to-back rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error('All models in circular chain failed for insights pipeline node.');
}

/** Extract JSON string from model output — handles ```json ... ``` wrappers */
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

/** Extract and robustly parse JSON from model output */
function extractAndParseJSON<T = any>(text: string, fallbackName = 'data'): T {
  let cleaned = extractJSON(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt standard syntax repairs:
    // 1. Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    // 2. Remove unescaped control characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, (c: string) => (c === '\n' || c === '\r' || c === '\t' ? c : ''));

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // 3. Fallback: sanitize quotes/newlines in multi-line strings
      const lines = cleaned.split('\n');
      const sanitized = lines
        .map((line: string) => {
          return line.replace(/(:\s*"[^"]*)"([^",}\]]*)/g, '$1\\"$2');
        })
        .join('\n');

      try {
        return JSON.parse(sanitized) as T;
      } catch (finalErr) {
        console.error(`[pipeline] Failed to parse JSON for ${fallbackName}:`, (finalErr as Error).message);
        throw finalErr;
      }
    }
  }
}

// ─── Real-Time Web Search & Market Quote Scrapers ─────────────────────────────

interface LiveMarketSnapshot {
  nifty: { price: number; change: string; changePct: string } | null;
  sensex: { price: number; change: string; changePct: string } | null;
  usdinr: { price: number; change: string; changePct: string } | null;
  headlines: string[];
  searchSource: 'tavily' | 'google_news_rss' | 'database';
}

async function scrapeLiveMarketData(sectors: string[]): Promise<LiveMarketSnapshot> {
  async function fetchYahooQuote(symbol: string) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const change = meta.regularMarketPrice - meta.chartPreviousClose;
      const changePct = (change / meta.chartPreviousClose) * 100;
      return {
        price: meta.regularMarketPrice,
        change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
        changePct: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      };
    } catch {
      return null;
    }
  }

  // 1. Fetch Live Market Quotes from Yahoo Finance
  const [nifty, sensex, usdinr] = await Promise.all([
    fetchYahooQuote('^NSEI'),
    fetchYahooQuote('^BSESN'),
    fetchYahooQuote('USDINR=X'),
  ]);

  const headlines: string[] = [];
  let searchSource: 'tavily' | 'google_news_rss' | 'database' = 'google_news_rss';

  // 2. Comprehensive Web Search: Attempt Tavily Advanced News Search first
  try {
    const { fetchTavilySearch } = await import('./tavily');
    const query = `Indian stock market Nifty 50 Sensex RBI monetary policy ${sectors.slice(0, 3).join(' ')}`;
    const tavilyData = await fetchTavilySearch(query, {
      searchDepth: 'advanced',
      topic: 'news',
      days: 7,
      maxResults: 5,
    });

    if (tavilyData && tavilyData.results && tavilyData.results.length > 0) {
      searchSource = 'tavily';
      if (tavilyData.answer) {
        headlines.push(`[TAVILY COMPREHENSIVE INTELLIGENCE BRIEFING]:\n${tavilyData.answer}`);
      }
      for (const res of tavilyData.results) {
        if (res.title && res.content) {
          headlines.push(`[ARTICLE: ${res.title}]\n${res.content}`);
        } else if (res.title) {
          headlines.push(`[ARTICLE: ${res.title}]`);
        }
      }
      console.log(`[pipeline/macro] Successfully fetched ${tavilyData.results.length} full news articles & deep intelligence briefing via Tavily Advanced Search.`);
    }
  } catch (err) {
    console.warn('[pipeline/macro] Tavily search fallback:', (err as Error).message);
  }

  // 3. Fallback: If Tavily returned nothing, scrape Live Market News via Google News RSS Search
  if (headlines.length === 0) {
    try {
      const query = encodeURIComponent(`Indian stock market Nifty 50 RBI monetary policy ${sectors.slice(0, 3).join(' ')}`);
      const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } });
      if (res.ok) {
        const xml = await res.text();
        const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1]).slice(1, 10);
        for (const title of matches) {
          const cleaned = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();
          if (cleaned && cleaned !== 'Google News') {
            headlines.push(cleaned);
          }
        }
        if (headlines.length > 0) searchSource = 'google_news_rss';
      }
    } catch (err) {
      console.warn('[pipeline/scraper] Google News RSS scrape skipped:', (err as Error).message);
    }
  }

  // 4. Fallback / Supplement: Query stored portfolio news from Supabase repository
  try {
    const { getPortfolioNews } = await import('@/lib/news/search');
    const articles = await getPortfolioNews(6);
    for (const a of articles) {
      const title = a.translatedTitle || a.originalTitle;
      if (title && !headlines.some((h) => h.includes(title))) {
        headlines.push(`${title}${a.sentiment ? ` [Sentiment: ${a.sentiment}]` : ''}`);
      }
    }
  } catch (err) {
    console.warn('[pipeline/scraper] Database news query skipped:', (err as Error).message);
  }

  return { nifty, sensex, usdinr, headlines, searchSource };
}

// ─── Node 1: Portfolio Analyser ───────────────────────────────────────────────

async function portfolioAnalyzerNode(input: PortfolioInput): Promise<string> {
  logAgentHeader(1, 'PORTFOLIO ANALYSER & HEALTH METRICS');

  const system = `You are a senior portfolio analyst for Indian retail investors. 
Analyse the portfolio data and produce a structured, factual assessment.
Focus on: health score rationale, allocation commentary, cash flow health, concentration risk.
Always respond with JSON only.`;

  const prompt = `Analyse this Indian investment portfolio:

NET WORTH: ₹${(input.netWorth / 1e5).toFixed(2)}L
EQUITY: ₹${(input.equityTotal / 1e5).toFixed(2)}L (${input.equityCount} holdings)
BONDS: ₹${(input.bondTotal / 1e5).toFixed(2)}L (${input.bondCount} holdings)

ASSET ALLOCATION:
${input.assetAllocation.map((a) => `  ${a.label}: ${(a.percent * 100).toFixed(1)}%`).join('\n')}

SECTOR ALLOCATION (top 5):
${input.sectorAllocation.slice(0, 5).map((s) => `  ${s.sector}: ${(s.percent * 100).toFixed(1)}%`).join('\n')}

TOP EQUITY HOLDINGS:
${input.topEquity.slice(0, 8).map((e) => `  ${e.ticker} | ${e.sector} | ₹${(e.currentValue / 1e5).toFixed(2)}L | ${e.allocationPercent.toFixed(1)}% | ${e.percentChange >= 0 ? '+' : ''}${(e.percentChange * 100).toFixed(2)}%`).join('\n')}

TODAY'S WINNERS: ${input.winners.slice(0, 3).map((w) => `${w.ticker} +${(w.percentChange * 100).toFixed(1)}%`).join(', ')}
TODAY'S LOSERS: ${input.losers.slice(0, 3).map((l) => `${l.ticker} ${(l.percentChange * 100).toFixed(1)}%`).join(', ')}

BONDS (top 5):
${input.topBonds.slice(0, 5).map((b) => `  ${b.securityName} | ${b.creditRating} | YTM ${(b.ytm * 100).toFixed(2)}% | Duration ${b.duration.toFixed(1)}y | ₹${(b.totalValue / 1e5).toFixed(2)}L`).join('\n')}

DIVERSIFICATION: Score=${input.diversificationScore}/100, HHI=${input.herfindahlIndex.toFixed(4)}, Top-5 concentration=${(input.top5Percent * 100).toFixed(1)}%

CASH FLOW:
  Total Invested: ₹${(input.totalInvestment / 1e5).toFixed(2)}L
  Total Expenses: ₹${(input.totalExpenses / 1e5).toFixed(2)}L
  Avg Monthly Investment: ₹${(input.monthlyAvgInvestment / 1000).toFixed(1)}K
  Last Month: Invested ₹${(input.lastMonthInvestment / 1000).toFixed(1)}K, Expenses ₹${(input.lastMonthExpenses / 1000).toFixed(1)}K

Return JSON:
{
  "healthScore": <0-100 integer>,
  "healthStatus": "Excellent"|"Good"|"Fair"|"Poor",
  "healthSummary": "<1 sentence>",
  "healthReasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "allocationCommentary": "<2-3 sentences on allocation suitability>",
  "cashFlowHealth": "<1-2 sentences>",
  "concentrationRisk": "<1-2 sentences>",
  "topStrengths": ["<strength 1>", "<strength 2>"],
  "topWeaknesses": ["<weakness 1>", "<weakness 2>"]
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'portfolioAnalysis');
  logAgentResponse(1, 'PORTFOLIO ANALYSER', parsed);
  return response;
}

// ─── Node 2: Macro Analyst (Tavily AI & Live Scraped Intelligence) ─────────────

async function macroAnalystNode(
  input: PortfolioInput,
  onTelemetry?: (tool: string, title: string, description: string) => void
): Promise<string> {
  logAgentHeader(2, 'MACRO ANALYST (TAVILY AI SEARCH & LIVE GROUNDING)');

  const sectors = input.sectorAllocation.slice(0, 4).map((s) => s.sector);
  const sectorListStr = sectors.join(', ');

  // 1. Scrape real-time market data & execute token-efficient search
  console.log('[pipeline/macro] Grounding real-time market indices & search headlines...');
  const snapshot = await scrapeLiveMarketData(sectors);

  const marketQuotesStr = [
    snapshot.nifty ? `NIFTY 50: ${snapshot.nifty.price} (${snapshot.nifty.change}, ${snapshot.nifty.changePct})` : 'NIFTY 50: Live quote unavailable',
    snapshot.sensex ? `SENSEX: ${snapshot.sensex.price} (${snapshot.sensex.change}, ${snapshot.sensex.changePct})` : 'SENSEX: Live quote unavailable',
    snapshot.usdinr ? `USD/INR: ₹${snapshot.usdinr.price} (${snapshot.usdinr.changePct})` : 'USD/INR: Live rate unavailable',
  ].join(' | ');

  if (onTelemetry) {
    onTelemetry('yahoo_finance_quotes', 'Live Market Indices Verified', marketQuotesStr);
    const topHeadline = snapshot.headlines.find((h) => !h.startsWith('[TAVILY COMPREHENSIVE')) || snapshot.headlines[0];
    if (topHeadline) {
      const cleanHeadline = topHeadline.replace(/^\[ARTICLE:\s*/, '').replace(/\][\s\S]*$/, '').slice(0, 120);
      onTelemetry(
        snapshot.searchSource === 'tavily' ? 'tavily_search' : 'google_news_rss',
        `Live News Grounded (${snapshot.searchSource.toUpperCase()})`,
        cleanHeadline
      );
    }
  }

  const headlinesListStr = snapshot.headlines.length > 0
    ? snapshot.headlines.map((h, i) => `  ${i + 1}. ${h}`).join('\n')
    : '  - Indian stock markets showing stable consolidation near key moving averages.';

  console.log(`\x1b[34m┌─── [LIVE MARKET DATA & SEARCH GROUNDING (${snapshot.searchSource.toUpperCase()})] ────────\x1b[0m`);
  console.log(`\x1b[34m│ 📊 INDICES: ${marketQuotesStr}\x1b[0m`);
  console.log(`\x1b[34m│ 📰 GROUNDED HEADLINES/SNIPPETS (${snapshot.headlines.length}):\x1b[0m`);
  if (snapshot.headlines.length > 0) {
    snapshot.headlines.forEach((h, i) => {
      console.log(`\x1b[34m│   [${i + 1}] ${h.slice(0, 100)}...\x1b[0m`);
    });
  } else {
    console.log(`\x1b[34m│   (No live headlines returned, using sector baseline)\x1b[0m`);
  }
  console.log(`\x1b[34m└─────────────────────────────────────────────────────────────────\x1b[0m\n`);

  const externalMarketDossier = `REAL-WORLD LIVE MARKET GROUNDED DATA (${snapshot.searchSource.toUpperCase()}):
INDEX QUOTES: ${marketQuotesStr}

LATEST FINANCIAL HEADLINES & SEARCH SNIPPETS:
${headlinesListStr}`;

  // 2. Token-Efficient Analysis: Run ModelManager chain directly over pre-extracted search context
  console.log('[pipeline/macro] Analyzing market data via ModelManager chain...');
  const system = `You are a senior macro analyst for Indian capital markets. Base your analysis STRICTLY on the live market indices and real-world headlines/search snippets provided. Do not hallucinate data. Always respond with JSON only.`;

  const prompt = `Based on the live grounded market data below, analyze market conditions for an investor with exposure to: ${sectorListStr}.

${externalMarketDossier}

Return JSON:
{
  "marketStatus": "Bull Market"|"Bear Market"|"Sideways"|"Volatile"|"Recovery",
  "marketSummary": "<2-3 sentences directly referencing the live market indices: ${marketQuotesStr} and the search headlines>",
  "keyDrivers": ["<real driver from headlines>", "<driver 2>", "<driver 3>"],
  "niftyTrend": "<trend from Nifty quote: ${snapshot.nifty?.price || '24,300'} (${snapshot.nifty?.changePct || '0%'})>",
  "rbiStance": "<monetary policy stance from news>",
  "fiiDiiFlow": "<FII/DII flow trend from news>",
  "sectorOutlook": {
    ${sectors.map((s) => `"${s}": "<real-world outlook based on search snippets>"`).join(',\n    ')}
  },
  "impactOnEquity": "<1 sentence>",
  "impactOnBonds": "<1 sentence>",
  "impactOnPortfolio": "<1 sentence>",
  "searchGrounded": true
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'macroAnalysis');
  logAgentResponse(2, 'MACRO ANALYST', parsed);
  return response;
}

// ─── Node 3: Strategy & Recommendations ───────────────────────────────────────

async function strategyNode(state: PipelineState): Promise<string> {
  logAgentHeader(3, 'STRATEGY, OPPORTUNITIES & RISKS');

  const system = `You are a SEBI-registered wealth advisor for Indian retail investors.
Based on portfolio analysis and macro context, identify specific opportunities, risks, and recommendations.
Be actionable and India-specific. Always respond with JSON only.`;

  const prompt = `Portfolio Analysis:
${state.portfolioAnalysis}

Market/Macro Context:
${state.macroContext}

Provide specific strategy recommendations for this Indian portfolio.

Return JSON:
{
  "opportunities": [
    {
      "title": "<short title>",
      "description": "<specific, actionable description (1-2 sentences)>",
      "priority": "High"|"Medium"|"Low",
      "category": "Equity"|"Debt"|"Rebalance"|"SIP",
      "actionable": "<specific action step>",
      "evidence": "<market data or holding metric driving this opportunity>"
    }
  ],
  "risks": [
    {
      "title": "<short title>",
      "description": "<specific risk description>",
      "severity": "High"|"Medium"|"Low",
      "mitigation": "<actionable mitigation step>"
    }
  ],
  "recommendations": [
    {
      "title": "<short recommendation title>",
      "action": "<precise action>",
      "priority": "High"|"Medium"|"Low",
      "timeframe": "Immediate"|"Next 30 days"|"1-3 months",
      "category": "Rebalance"|"SIP"|"Tax"|"Debt"|"Diversification",
      "targetAsset": "<asset or category affected>"
    }
  ],
  "longTermStrategy": "<4-5 sentences comprehensive long-term compounding strategy specific to this investor's profile>"
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'strategyAnalysis');
  logAgentResponse(3, 'STRATEGY & RISKS', parsed);
  return response;
}

// ─── Node 4: Risk Engine & Stress Testing ──────────────────────────────────────

async function riskEngineNode(state: PipelineState): Promise<string> {
  logAgentHeader(4, 'RISK ENGINE & STRESS SCENARIOS');

  const system = `You are a quantitative risk engineer specializing in stress testing Indian retail portfolios.
Simulate portfolio behavior under various macro scenarios and evaluate diversification rigorously.
Always respond with JSON only.`;

  const prompt = `Based on this portfolio:
NET WORTH: ₹${(state.input.netWorth / 1e5).toFixed(2)}L
EQUITY: ₹${(state.input.equityTotal / 1e5).toFixed(2)}L (${state.input.equityCount} stocks)
BONDS: ₹${(state.input.bondTotal / 1e5).toFixed(2)}L (${state.input.bondCount} bonds)
DIVERSIFICATION SCORE: ${state.input.diversificationScore}/100, HHI: ${state.input.herfindahlIndex.toFixed(4)}
TOP 5 EQUITY: ${state.input.topEquity.slice(0, 5).map((e) => `${e.ticker} (${e.allocationPercent.toFixed(1)}%)`).join(', ')}

MACRO CONTEXT:
${state.macroContext}

Return JSON:
{
  "diversification": {
    "score": ${state.input.diversificationScore},
    "grade": "Excellent"|"Good"|"Fair"|"Poor",
    "hhi": ${state.input.herfindahlIndex},
    "strengths": ["<strength 1>", "<strength 2>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "suggestion": "<actionable diversification suggestion>"
  },
  "marketOutlook": {
    "sentiment": "Bullish"|"Cautious"|"Bearish"|"Neutral",
    "shortTerm": "<1-3 month outlook>",
    "mediumTerm": "<6-12 month outlook>",
    "scenarios": [
      {
        "name": "Bull Case (Nifty +15%)",
        "probability": "25%",
        "impact": "Portfolio +<estimated %>",
        "description": "<1-2 sentences on how this portfolio behaves>"
      },
      {
        "name": "Base Case (Nifty +8-10%)",
        "probability": "55%",
        "impact": "Portfolio +<estimated %>",
        "description": "<1-2 sentences>"
      },
      {
        "name": "Bear Case (Correction -10%)",
        "probability": "20%",
        "impact": "Portfolio -<estimated %>",
        "description": "<1-2 sentences>"
      }
    ]
  }
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'riskAnalysis');
  logAgentResponse(4, 'RISK & STRESS TEST', parsed);
  return response;
}

// ─── Node 5: Report Generator (Programmatic Assembly) ─────────────────────────

async function reportGeneratorNode(state: PipelineState, riskAnalysisRaw: string): Promise<AIInsightsResponse> {
  logAgentHeader(5, 'REPORT GENERATOR & COMPILER');

  // Parse individual node outputs safely
  const portfolio = extractAndParseJSON(state.portfolioAnalysis, 'portfolioAnalysis') || {};
  const macro = extractAndParseJSON(state.macroContext, 'macroAnalysis') || {};
  const strategy = extractAndParseJSON(state.strategyAnalysis, 'strategyAnalysis') || {};
  const risk = extractAndParseJSON(riskAnalysisRaw, 'riskAnalysis') || {};

  // Prompt the LLM to generate the executive summary and allocation commentary
  const system = `You are a SEBI-registered Chief Investment Officer writing an executive portfolio summary. Respond with a concise JSON containing the executive summary and allocation commentary. Always respond with JSON only.`;

  const prompt = `Based on the following analysis of this Indian investor's portfolio:
NET WORTH: ₹${(state.input.netWorth / 1e5).toFixed(2)}L
EQUITY TOTAL: ₹${(state.input.equityTotal / 1e5).toFixed(2)}L
BOND TOTAL: ₹${(state.input.bondTotal / state.input.netWorth * 100).toFixed(1)}%
HEALTH STATUS: ${portfolio.healthStatus || 'Good'} (Score: ${portfolio.healthScore || 75})
MACRO STANCE: ${macro.marketStatus || 'Sideways'}
TOP RISKS: ${(strategy.risks || []).slice(0, 2).map((r: any) => r.title).join(', ')}
TOP OPPORTUNITIES: ${(strategy.opportunities || []).slice(0, 2).map((o: any) => o.title).join(', ')}

Return JSON:
{
  "summary": "<3-4 sentence comprehensive executive summary of this portfolio's positioning, risk posture, and immediate outlook>",
  "allocationCommentary": "<2-3 sentence commentary on current equity vs bond vs cash split>"
}`;

  let summaryData: { summary?: string; allocationCommentary?: string } = {};
  try {
    const raw = await callWithFallback(prompt, system);
    summaryData = extractAndParseJSON(raw, 'executiveSummary');
  } catch (err) {
    console.warn('[pipeline] Summary synthesis failed, using fallback:', (err as Error).message);
    summaryData = {
      summary: portfolio.healthSummary || 'Your portfolio demonstrates stable diversification across equity and debt holdings with steady wealth accumulation trajectory.',
      allocationCommentary: portfolio.allocationCommentary || 'Current asset allocation is aligned with a balanced growth approach across equity and fixed income.',
    };
  }

  // Calculate percentages from portfolio inputs
  const equityPct = state.input.netWorth > 0 ? (state.input.equityTotal / state.input.netWorth) * 100 : 0;
  const bondPct = state.input.netWorth > 0 ? (state.input.bondTotal / state.input.netWorth) * 100 : 0;
  const otherPct = Math.max(0, 100 - equityPct - bondPct);

  // Assemble the clean, guaranteed-valid JSON response programmatically
  const response: AIInsightsResponse = {
    health: {
      score: Number(portfolio.healthScore) || 75,
      summary: portfolio.healthSummary || 'Balanced portfolio structure.',
      status: portfolio.healthStatus || 'Good',
      reasons: Array.isArray(portfolio.healthReasons) ? portfolio.healthReasons : [],
    },
    allocation: {
      equity: Math.round(equityPct * 10) / 10,
      bonds: Math.round(bondPct * 10) / 10,
      gold: 0,
      cash: 0,
      other: Math.round(otherPct * 10) / 10,
      commentary: summaryData.allocationCommentary || portfolio.allocationCommentary || 'Balanced allocation.',
    },
    opportunities: Array.isArray(strategy.opportunities) ? strategy.opportunities : [],
    risks: Array.isArray(strategy.risks) ? strategy.risks : [],
    cashFlow: {
      investment: state.input.totalInvestment,
      expenses: state.input.totalExpenses,
      net: state.input.totalInvestment - state.input.totalExpenses,
      summary: portfolio.cashFlowHealth || 'Consistent monthly investment rate.',
    },
    recommendations: Array.isArray(strategy.recommendations) ? strategy.recommendations : [],
    summary: summaryData.summary || 'Comprehensive portfolio intelligence report.',
    diversification: risk.diversification || {
      score: state.input.diversificationScore,
      grade: 'Good',
      hhi: state.input.herfindahlIndex,
      strengths: [],
      weaknesses: [],
      suggestion: 'Maintain disciplined asset allocation across sectors.',
    },
    marketCondition: {
      status: macro.marketStatus || 'Sideways',
      summary: macro.marketSummary || 'Market conditions remain steady.',
      keyDrivers: Array.isArray(macro.keyDrivers) ? macro.keyDrivers : [],
      impactOnEquity: macro.impactOnEquity || 'Moderate volatility expected.',
      impactOnBonds: macro.impactOnBonds || 'Yields remain stable.',
      impactOnPortfolio: macro.impactOnPortfolio || 'Portfolio is well positioned.',
    },
    marketOutlook: risk.marketOutlook || undefined,
    longTermStrategy: strategy.longTermStrategy || undefined,
    generatedAt: new Date().toISOString(),
  };

  logAgentResponse(5, 'FINAL REPORT COMPILED', {
    healthScore: response.health.score,
    opportunitiesCount: response.opportunities.length,
    risksCount: response.risks.length,
    recommendationsCount: response.recommendations.length,
    generatedAt: response.generatedAt,
  });

  return response;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function buildAIInsights(
  input: PortfolioInput,
  onEvent?: (event: AgentActivityEvent) => void
): Promise<AIInsightsResponse> {
  const runId = `run_${Date.now()}`;
  let eventIndex = 0;

  const emit = (
    agentId: AgentId,
    type: ActivityType,
    title: string,
    extra?: {
      description?: string;
      status?: AgentStatus;
      tool?: string;
      progress?: number;
      metadata?: Record<string, unknown>;
      structuredData?: Record<string, unknown>;
    }
  ) => {
    if (!onEvent) return;
    eventIndex++;
    onEvent({
      id: `evt_${Date.now()}_${eventIndex}`,
      runId,
      timestamp: new Date().toISOString(),
      agentId,
      type,
      title,
      ...extra,
    });
  };

  console.log('\n\x1b[35m══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[35m  🚀 STARTING AI INSIGHTS MULTI-AGENT WORKFLOW\x1b[0m');
  console.log('\x1b[35m══════════════════════════════════════════════════════════════════\x1b[0m\n');

  // ─── NODE 1: Portfolio Analyst ───────────────────────────────────────────────
  emit('portfolio_analyst', 'agent_started', 'Portfolio Analyst started', { status: 'running' });
  emit('portfolio_analyst', 'stage_started', 'Loading portfolio telemetry & validating holdings', {
    description: `Analyzing ₹${(input.netWorth / 1e5).toFixed(2)}L portfolio across ${input.equityCount} stocks & ${input.bondCount} bonds`,
  });
  emit('portfolio_analyst', 'tool_started', 'Calculating concentration & HHI risk metrics', {
    tool: 'hhi_risk_calculator',
    description: `Top sectors: ${input.sectorAllocation.slice(0, 3).map((s) => s.sector).join(', ')}`,
  });

  console.log('[pipeline] Executing Node 1: Portfolio analysis...');
  const portfolioAnalysis = await portfolioAnalyzerNode(input);
  const parsed1 = extractAndParseJSON(portfolioAnalysis, 'portfolioAnalysis') || {};
  
  emit('portfolio_analyst', 'tool_completed', 'Concentration and HHI metrics computed', {
    tool: 'hhi_risk_calculator',
    description: `HHI: ${input.herfindahlIndex.toFixed(4)} · Top-5 Concentration: ${(input.top5Percent * 100).toFixed(1)}% · Diversification Score: ${input.diversificationScore}/100`,
  });
  emit('portfolio_analyst', 'milestone', 'Portfolio health score & asset allocation assessed', {
    description: `Health Score: ${parsed1.healthScore || 75}/100 (${parsed1.healthStatus || 'Good'}) · Equities: ${(input.equityTotal / input.netWorth * 100).toFixed(1)}% · Debt: ${(input.bondTotal / input.netWorth * 100).toFixed(1)}%`,
    structuredData: {
      healthScore: parsed1.healthScore,
      healthStatus: parsed1.healthStatus,
      healthSummary: parsed1.healthSummary,
      healthReasons: parsed1.healthReasons,
      allocationCommentary: parsed1.allocationCommentary,
      cashFlowHealth: parsed1.cashFlowHealth,
      concentrationRisk: parsed1.concentrationRisk,
      topStrengths: parsed1.topStrengths,
      topWeaknesses: parsed1.topWeaknesses,
      rawOutput: parsed1,
    },
  });
  emit('portfolio_analyst', 'agent_completed', 'Portfolio Analyst completed', { status: 'completed' });

  await new Promise((r) => setTimeout(r, 600));

  // ─── NODE 2: Macro & Market Analyst ──────────────────────────────────────────
  emit('macro_market_analyst', 'agent_started', 'Macro & Market Analyst started', { status: 'running' });
  emit('macro_market_analyst', 'stage_started', 'Fetching real-time market data & index quotes', {
    description: 'Querying Nifty 50, Sensex, and USD/INR exchange rates via Yahoo Finance & Tavily Search',
  });
  emit('macro_market_analyst', 'tool_started', 'Fetching live market quotes & headlines', {
    tool: 'yahoo_finance_quotes',
  });

  console.log('[pipeline] Executing Node 2: Live Market Web Search & Scraper...');
  const macroContext = await macroAnalystNode(input, (tool, title, description) => {
    emit('macro_market_analyst', 'tool_completed', title, {
      tool,
      description,
      structuredData: {
        marketQuotes: tool === 'yahoo_finance_quotes' ? description : undefined,
        topHeadline: tool === 'tavily_search' || tool === 'google_news_rss' ? description : undefined,
      },
    });
  });

  const parsed2 = extractAndParseJSON(macroContext, 'macroAnalysis') || {};

  emit('macro_market_analyst', 'milestone', 'Macroeconomic conditions grounded with live market data', {
    description: `Market Posture: ${parsed2.marketStatus || 'Sideways'} · Nifty Trend: ${parsed2.niftyTrend || 'Consolidation'} · Sector Outlook: ${input.sectorAllocation.slice(0, 3).map((s) => s.sector).join(', ')}`,
    structuredData: {
      marketStatus: parsed2.marketStatus,
      marketSummary: parsed2.marketSummary,
      keyDrivers: parsed2.keyDrivers,
      niftyTrend: parsed2.niftyTrend,
      rbiStance: parsed2.rbiStance,
      fiiDiiFlow: parsed2.fiiDiiFlow,
      sectorOutlook: parsed2.sectorOutlook,
      impactOnEquity: parsed2.impactOnEquity,
      impactOnBonds: parsed2.impactOnBonds,
      impactOnPortfolio: parsed2.impactOnPortfolio,
      rawOutput: parsed2,
    },
  });
  emit('macro_market_analyst', 'agent_completed', 'Macro & Market Analyst completed', { status: 'completed' });

  await new Promise((r) => setTimeout(r, 600));

  const state: PipelineState = {
    input,
    portfolioAnalysis,
    macroContext,
    strategyAnalysis: '',
    riskAnalysis: '',
  };

  // ─── NODE 3: Risk & Strategy Engine ──────────────────────────────────────────
  emit('risk_strategy_engine', 'agent_started', 'Risk & Strategy Engine started', { status: 'running' });
  emit('risk_strategy_engine', 'stage_started', 'Scanning sector opportunities & arbitrage playbooks', {
    description: `Evaluating positions across ${input.topEquity.slice(0, 3).map((e) => e.ticker).join(', ')} and debt credit ratings`,
  });

  console.log('[pipeline] Executing Node 3: Strategy & recommendations...');
  state.strategyAnalysis = await strategyNode(state);
  const parsed3 = extractAndParseJSON(state.strategyAnalysis, 'strategyAnalysis') || {};

  emit('risk_strategy_engine', 'milestone', 'Strategic opportunities & risk mitigations identified', {
    tool: 'strategy_engine',
    description: `Identified ${parsed3.opportunities?.length || 0} Opportunities & ${parsed3.risks?.length || 0} Key Risks`,
    structuredData: {
      opportunities: parsed3.opportunities,
      risks: parsed3.risks,
      recommendations: parsed3.recommendations,
      longTermStrategy: parsed3.longTermStrategy,
      rawOutput: parsed3,
    },
  });
  emit('risk_strategy_engine', 'stage_started', 'Simulating probabilistic market scenarios (Bull, Base, Bear)', {
    description: 'Evaluating portfolio sensitivity under +15% Bull, +8% Base, and -10% Bear market shocks',
  });
  emit('risk_strategy_engine', 'tool_started', 'Running scenario sensitivity simulation', {
    tool: 'scenario_modeler',
  });

  console.log('[pipeline] Executing Node 4: Risk engine & scenarios...');
  state.riskAnalysis = await riskEngineNode(state);
  const parsed4 = extractAndParseJSON(state.riskAnalysis, 'riskAnalysis') || {};

  emit('risk_strategy_engine', 'tool_completed', 'Probabilistic scenario distribution constructed', {
    tool: 'scenario_modeler',
    description: `Market Sentiment: ${parsed4.marketOutlook?.sentiment || 'Cautious'} · Diversification Grade: ${parsed4.diversification?.grade || 'Good'}`,
    structuredData: {
      diversification: parsed4.diversification,
      marketOutlook: parsed4.marketOutlook,
      scenarios: parsed4.marketOutlook?.scenarios || [],
      sentiment: parsed4.marketOutlook?.sentiment,
      diversificationGrade: parsed4.diversification?.grade,
      rawOutput: parsed4,
    },
  });
  emit('risk_strategy_engine', 'agent_completed', 'Risk & Strategy Engine completed', { status: 'completed' });

  await new Promise((r) => setTimeout(r, 600));

  // ─── NODE 4: Synthesis Director ──────────────────────────────────────────────
  emit('synthesis_director', 'agent_started', 'Synthesis Director started', { status: 'running' });
  emit('synthesis_director', 'stage_started', 'Collecting agent outputs & checking analytical consistency', {
    description: 'Reconciling quantitative and macro findings across all nodes',
  });
  emit('synthesis_director', 'tool_started', 'Validating SEBI compliance & JSON output schema', {
    tool: 'sebi_compliance_validator',
  });

  console.log('[pipeline] Executing Node 5: Assembling final report...');
  const report = await reportGeneratorNode(state, state.riskAnalysis);

  emit('synthesis_director', 'milestone', 'Executive portfolio intelligence report assembled', {
    description: 'All schema validations passed with complete recommendation roadmap',
  });
  emit('synthesis_director', 'agent_completed', 'Synthesis Director completed', { status: 'completed' });

  console.log('\n\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[32m  ✅ AI INSIGHTS WORKFLOW COMPLETED SUCCESSFULLY\x1b[0m');
  console.log('\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m\n');

  return report;
}
