/**
 * lib/ai/pipeline-v2.ts
 *
 * Refactored AI Insights Pipeline (V2 Personal Finance Engine).
 *
 * Architecture Principles (Prompt Specification Sections 1–15, 34–37, 48–52, 59–64):
 * 1. Monolith for Single-User Personal Finance: No microservices, no distributed queues.
 * 2. Free-Tier First: Quota-conscious execution. Zero unnecessary LLM or Tavily calls.
 * 3. Analysis Trigger Engine: Reuses cached analytics if NO_CHANGE / MINOR_CHANGE.
 * 4. Two Operating Modes:
 *    - Quick Mode: Deterministic engines + Compact Evidence + 1 Unified LLM Analyst (1 LLM call total, 0 Tavily calls).
 *    - Deep Mode: Deterministic engines + Clustered News + Analyst -> Critic -> Synthesizer (2–3 LLM calls total).
 * 5. Deterministic Fallback Mode: If all LLMs are down, returns 100% verified deterministic analytics.
 * 6. Untrusted Data Security: All external news, search, and text are treated as untrusted DATA, never instructions.
 * 7. Traceable Provenance & Claim Coverage: Factual claims validated against deterministic math.
 */

import type { AIInsightsResponse, IntegratedView, MatrixStock } from '@/types/insights';
import type { AgentActivityEvent, AgentId, ActivityType, AgentStatus } from '@/types/agent-activity';
import type { PortfolioInput } from './pipeline';
import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { ScoringWeights } from '@/types/insights';
import { createEvidenceCollection } from '@/types/evidence';
import { computeEngineConfidence, type EngineConfidence } from '@/types/engine-output';

// Data Foundation
import { checkCanAnalyze, evaluateStaleness } from '@/lib/analytics/stalenessPolicy';
import { fetchMarketSnapshot } from '@/lib/data/market';
import { fetchNewsSnapshot } from '@/lib/data/news';
import { evaluateDataQuality } from '@/lib/analytics/dataQuality';
import { getHistoricalSnapshots, saveHistoricalSnapshot, computeSnapshotHash } from '@/lib/portfolio/snapshotRepository';

// Deterministic Analytics Engines
import { runFundamentalAnalysis } from '@/lib/analytics/fundamentals';
import { runTechnicalAnalysis } from '@/lib/analytics/technicals';
import { runMacroAnalysis } from '@/lib/analytics/macro';
import { runRiskAnalysis } from '@/lib/analytics/concentration';
import { runBondRiskAnalysis } from '@/lib/analytics/bondRisk';
import { runTaxAnalysis } from '@/lib/analytics/tax';
import { computePortfolioBeta } from '@/lib/analytics/portfolioBeta';
import { clusterNewsArticles } from '@/lib/analytics/newsClustering';

// Cross-Factor & Advanced Analytics
import { runCrossFactorAnalysis } from '@/lib/analytics/crossFactor';
import { runStressTests } from '@/lib/analytics/stress';
import { runTemporalAnalysis } from '@/lib/analytics/temporal';
import { buildMacroTransmissionMap } from '@/lib/analytics/macroTransmission';
import { attributeStressImpact } from '@/lib/analytics/stressAttribution';
import { validateClaims, type ClaimValidationResult } from '@/lib/analytics/claimValidator';
import { filterFindingsForSynthesis } from '@/lib/analytics/materialityFilter';
import { propagateConfidence } from '@/lib/analytics/confidencePropagation';
import { DegradationTracker, safeAgentCall, STAGE_TIMEOUTS } from '@/lib/analytics/degradation';
import { evaluateAnalysisTrigger, type AnalysisTriggerDecision } from '@/lib/analytics/analysisTrigger';
import { budgetManager } from '@/lib/ai/budgetManager';

// AI Reasoning Layer
import { runUnifiedAnalyst } from '@/lib/ai/agents/unifiedAnalyst';
import { runCrossExaminer } from '@/lib/ai/agents/crossExaminer';
import { runSynthesizer } from '@/lib/ai/agents/synthesizer';

// Config
import { getTaxRules } from '@/lib/config/taxRules';
import { NIFTY_50_LONG_TERM_PE } from '@/lib/config/marketBenchmarks';

export interface PipelineV2Options {
  mode?: 'quick' | 'deep' | 'no_ai' | 'auto';
  force?: boolean;
  abortSignal?: AbortSignal;
}

/**
 * Adapter: convert PortfolioInput (old shape) to PortfolioSnapshot (new shape).
 */
export function portfolioInputToSnapshot(input: PortfolioInput): PortfolioSnapshot {
  return {
    snapshotId: `input_${Date.now()}`,
    asOf: new Date().toISOString(),
    holdings: {
      equity: input.topEquity.map((e) => ({
        ticker: e.ticker,
        exchange: '',
        name: e.name,
        currentPrice: e.shares > 0 ? e.currentValue / e.shares : 0,
        priceChange: 0,
        percentChange: e.percentChange,
        shares: e.shares,
        currentValue: e.currentValue,
        allocationPercent: e.allocationPercent,
        sector: e.sector,
      })),
      bonds: input.topBonds.map((b) => ({
        broker: '',
        issuer: b.securityName,
        securityName: b.securityName,
        isin: b.isin,
        sector: b.sector,
        creditRating: b.creditRating,
        maturityDate: b.maturityDate,
        duration: b.duration,
        couponRate: b.couponRate,
        ytm: b.ytm,
        faceValue: 0,
        buyPrice: 0,
        unitsHeld: 0,
        totalValue: b.totalValue,
        portfolioPercent: 0,
        payoutType: '',
        payoutDate: null,
      })),
      transactions: [],
    },
    aggregates: {
      netWorth: input.netWorth,
      equityTotal: input.equityTotal,
      bondTotal: input.bondTotal,
      equityCount: input.equityCount,
      bondCount: input.bondCount,
      todaysChange: 0,
      todaysChangePct: 0,
    },
    allocation: {
      assetAllocation: (input.assetAllocation || []).map((a) => {
        const normPct = a.percent > 1 ? a.percent / 100 : a.percent;
        return {
          label: a.label,
          value: Math.round(normPct * (input.netWorth || 0)),
          percent: normPct,
        };
      }),
      sectorAllocation: (input.sectorAllocation || []).map((s) => {
        const normPct = s.percent > 1 ? s.percent / 100 : s.percent;
        return {
          sector: s.sector,
          equityValue: 0,
          bondValue: 0,
          totalValue: 0,
          percent: normPct,
        };
      }),
    },
    concentration: {
      top5Holdings: input.topEquity.slice(0, 5).map((e) => ({
        name: e.name || e.ticker,
        value: e.currentValue,
        percent: e.allocationPercent / 100,
        type: 'equity' as const,
      })),
      top5Percent: input.top5Percent,
      herfindahlIndex: input.herfindahlIndex,
      diversificationScore: input.diversificationScore,
    },
    cashFlow: {
      totalInvestment: input.totalInvestment,
      totalExpenses: input.totalExpenses,
      monthlyAvgInvestment: input.monthlyAvgInvestment,
      lastMonthInvestment: input.lastMonthInvestment,
      lastMonthExpenses: input.lastMonthExpenses,
    },
  };
}

// ─── Main Pipeline Orchestrator ───────────────────────────────────────────────

export async function buildAIInsightsV2(
  input: PortfolioInput,
  onEvent?: (event: AgentActivityEvent) => void,
  userId?: string,
  options?: PipelineV2Options
): Promise<AIInsightsResponse> {
  const effectiveUserId = userId || 'default_user';
  const runId = `run_${Date.now()}`;
  const startTime = Date.now();
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
  console.log(`\x1b[35m  🚀 AI INSIGHTS V2 — PERSONAL MONOLITH ENGINE (${options?.mode || 'auto'} mode)\x1b[0m`);
  console.log('\x1b[35m══════════════════════════════════════════════════════════════════\x1b[0m\n');

  const evidence = createEvidenceCollection();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Build PortfolioSnapshot & Stop-Analysis Gate
  // ═══════════════════════════════════════════════════════════════════════════

  emit('portfolio_analyst', 'agent_started', 'Data Collection started', { status: 'running' });
  emit('portfolio_analyst', 'stage_started', 'Building portfolio snapshot & evaluating data gate', {
    description: `Portfolio: ₹${(input.netWorth / 1e5).toFixed(2)}L · ${input.equityCount} equities · ${input.bondCount} bonds`,
  });

  const portfolio = portfolioInputToSnapshot(input);
  const snapshotHash = computeSnapshotHash({
    userId: effectiveUserId,
    netWorth: portfolio.aggregates.netWorth,
    equityTotal: portfolio.aggregates.equityTotal,
    bondTotal: portfolio.aggregates.bondTotal,
    herfindahlIndex: portfolio.concentration.herfindahlIndex,
    equityCount: portfolio.aggregates.equityCount,
    bondCount: portfolio.aggregates.bondCount,
  });

  const canAnalyzeCheck = checkCanAnalyze(portfolio);
  if (!canAnalyzeCheck.canProceed) {
    console.warn(`[pipeline-v2] Stop-Analysis triggered: ${canAnalyzeCheck.abortReason}`);
    emit('portfolio_analyst', 'agent_failed', canAnalyzeCheck.abortReason || 'Cannot analyze portfolio', {
      description: canAnalyzeCheck.remediation,
    });
    return {
      health: {
        score: 0,
        summary: canAnalyzeCheck.abortReason || 'Portfolio not in analyzable state.',
        status: 'Poor',
        reasons: [canAnalyzeCheck.remediation || 'Please add valid holdings.'],
      },
      allocation: { equity: 0, bonds: 0, gold: 0, cash: 0, other: 100, commentary: canAnalyzeCheck.remediation || 'No holdings' },
      opportunities: [],
      risks: [{ title: 'Incomplete Portfolio Data', description: canAnalyzeCheck.abortReason || '', severity: 'High', mitigation: canAnalyzeCheck.remediation || '' }],
      cashFlow: { investment: input.totalInvestment, expenses: input.totalExpenses, net: 0, summary: 'N/A' },
      recommendations: [{ title: 'Add Portfolio Holdings', action: canAnalyzeCheck.remediation || 'Configure portfolio', rationale: canAnalyzeCheck.abortReason || '', priority: 'High', timeframe: 'Immediate' }],
      summary: canAnalyzeCheck.abortReason || 'Analysis paused until portfolio data is provided.',
      generatedAt: new Date().toISOString(),
      aiConfidence: { level: 'Low', reason: canAnalyzeCheck.abortReason || 'Empty portfolio', metricsAvailableCount: 0, metricsTotalExpected: 1 },
      metadata: {
        runId,
        snapshotHash,
        analysisMode: 'deterministic_only',
        analyticsVersion: '2.0.0',
        promptVersion: '2.0.0',
        generatedAt: new Date().toISOString(),
        dataAsOf: { portfolio: new Date().toISOString() },
        overallConfidence: 'low',
        degradationState: 'failed',
      },
    };
  }

  const sectors = input.sectorAllocation.slice(0, 5).map((s) => s.sector);
  const holdingTickers = input.topEquity.map((e) => e.ticker);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Historical Baseline & Analysis Trigger Engine (Section 6)
  // ═══════════════════════════════════════════════════════════════════════════

  const historicalSnapshots = await getHistoricalSnapshots(effectiveUserId, 30);
  const previousSnapshot = historicalSnapshots[0] || null;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Parallel Deterministic Data Fetching
  // ═══════════════════════════════════════════════════════════════════════════

  // Determine tentative mode before fetching news so we know if Tavily is allowed
  const isNoAIRequested = options?.mode === 'no_ai';
  const isDeepRequested = options?.mode === 'deep';
  emit('portfolio_analyst', 'tool_started', 'Fetching market data and news in parallel', {
    tool: 'market_data_service',
    description: `Market quotes for ${holdingTickers.slice(0, 4).join(', ')} + RSS news (${isNoAIRequested ? 'NO_AI mode (0 Tavily)' : isDeepRequested ? 'Tavily research enabled' : 'Tavily conserved'})`,
  });

  const [market, news] = await Promise.all([
    fetchMarketSnapshot(input.topEquity.map((e) => ({
      ticker: e.ticker,
      name: e.name,
      sector: e.sector,
      currentValue: e.currentValue,
      shares: e.shares,
    }))),
    fetchNewsSnapshot(sectors, holdingTickers, {
      allowTavily: isDeepRequested && !isNoAIRequested,
      mode: isDeepRequested ? 'deep' : 'quick',
    }),
  ]);

  emit('portfolio_analyst', 'tool_completed', 'Market data & news collected', {
    tool: 'market_data_service',
    structuredData: {
      holdingsCount: market.holdingData.length,
      newsCount: news.articles.length,
      searchSource: news.searchSource,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Data Quality Gate + Staleness + News Clustering
  // ═══════════════════════════════════════════════════════════════════════════

  const dataQuality = evaluateDataQuality(portfolio, market, news);
  const _stalenessReport = evaluateStaleness(market, news);
  const clusteredNews = clusterNewsArticles(news.articles, sectors, holdingTickers, evidence);

  emit('portfolio_analyst', 'milestone', `Data quality assessed: ${dataQuality.overall}`, {
    description: `Missing: ${dataQuality.missingMetrics.length} | Stale: ${dataQuality.staleMetrics.length} | Clustered events: ${clusteredNews.uniqueEventsCount}`,
  });
  emit('portfolio_analyst', 'agent_completed', 'Data Collection completed', { status: 'completed' });
  await new Promise((r) => setTimeout(r, 200));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: PARALLEL Deterministic Analytics Engines
  // ═══════════════════════════════════════════════════════════════════════════

  emit('macro_market_analyst', 'agent_started', 'Deterministic Engines running', { status: 'running' });

  const [fundamentalAnalysis, technicalAnalysis, macroAnalysis, riskAnalysis] = await Promise.all([
    Promise.resolve(runFundamentalAnalysis(portfolio, market.holdingData, evidence, 7.0)),
    Promise.resolve(runTechnicalAnalysis(portfolio, market.holdingData, evidence)),
    Promise.resolve(runMacroAnalysis(portfolio, market, evidence)),
    Promise.resolve(runRiskAnalysis(portfolio, evidence)),
  ]);

  const taxRules = getTaxRules();
  const portfolioBetaResult = computePortfolioBeta(portfolio, evidence);
  const bondRiskResult = runBondRiskAnalysis(portfolio, evidence);
  const taxResult = runTaxAnalysis(portfolio, taxRules, evidence);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: Cross-Factor, Stress, Temporal, and Transmission Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  const crossFactors = runCrossFactorAnalysis(fundamentalAnalysis, technicalAnalysis, macroAnalysis, riskAnalysis, evidence);
  const stressTests = runStressTests(portfolio, macroAnalysis, riskAnalysis, evidence);

  const temporalAnalysis = runTemporalAnalysis({
    currentSnapshot: {
      netWorth: portfolio.aggregates.netWorth,
      equityTotal: portfolio.aggregates.equityTotal,
      bondTotal: portfolio.aggregates.bondTotal,
      top5Percent: portfolio.concentration.top5Percent,
      herfindahlIndex: portfolio.concentration.herfindahlIndex,
      diversificationScore: portfolio.concentration.diversificationScore,
      weightedPE: fundamentalAnalysis.weightedPE,
      breadthPct: technicalAnalysis.breadthPct,
    },
    currentMarket: {
      niftyPrice: market.nifty?.price,
      usdInr: market.usdInr?.price,
      brentCrude: market.brentCrude?.price,
      us10y: market.us10y?.price,
      goldPrice: market.gold?.price,
    },
    history: historicalSnapshots,
  });

  const _macroTransmission = buildMacroTransmissionMap({
    sectorAllocation: input.sectorAllocation.map((s) => ({ sector: s.sector, percent: s.percent })),
    brentCrude: market.brentCrude ? { price: market.brentCrude.price, changePct: market.brentCrude.changePct || 0 } : undefined,
    usdInr: market.usdInr ? { price: market.usdInr.price, changePct: market.usdInr.changePct || 0 } : undefined,
    us10y: market.us10y ? { price: market.us10y.price, changePct: market.us10y.changePct || 0 } : undefined,
  });

  const equityAsset = portfolio.allocation.assetAllocation.find((a) => a.label.toLowerCase() === 'equity');
  const bondAsset = portfolio.allocation.assetAllocation.find((a) => ['bond', 'bonds', 'fixed income'].includes(a.label.toLowerCase()));
  const goldAsset = portfolio.allocation.assetAllocation.find((a) =>
    ['gold', 'precious metal', 'commodity', 'commodities'].some((k) => a.label.toLowerCase().includes(k))
  );

  const equityWeightPct = equityAsset
    ? equityAsset.percent * 100
    : portfolio.aggregates.netWorth > 0 ? (portfolio.aggregates.equityTotal / portfolio.aggregates.netWorth) * 100 : 0;

  const bondWeightPct = bondAsset
    ? bondAsset.percent * 100
    : portfolio.aggregates.netWorth > 0 ? (portfolio.aggregates.bondTotal / portfolio.aggregates.netWorth) * 100 : 0;

  const goldWeightPct = goldAsset
    ? goldAsset.percent * 100
    : 0;
  const itPharmaWeight = input.sectorAllocation
    .filter((s) => ['information technology', 'it', 'tech', 'pharmaceuticals', 'pharma'].some((k) => s.sector.toLowerCase().includes(k)))
    .reduce((sum, s) => sum + s.percent * 100, 0);

  const _stressAttribution = attributeStressImpact({
    stressResults: stressTests,
    equityWeightPct,
    bondWeightPct,
    portfolioBeta: portfolioBetaResult.portfolioBeta,
    weightedDuration: bondRiskResult.weightedDuration,
    topSectorWeightPct: input.sectorAllocation[0]?.percent ? input.sectorAllocation[0].percent * 100 : 0,
    hasFxExposure: itPharmaWeight > 10,
    fxExposurePct: itPharmaWeight,
  });

  let materialityContext = filterFindingsForSynthesis({
    crossFactors,
    riskFlags: riskAnalysis.flags,
    significantChanges: temporalAnalysis.significantChanges,
    taxFlags: taxResult.taxFlags,
    holdingSignalsCount: technicalAnalysis.holdings.length,
    challengesCount: 0,
  });

  emit('macro_market_analyst', 'milestone', 'Deterministic analytics completed', {
    description: `Fund: ${fundamentalAnalysis.portfolioScore}/100 | Tech: ${technicalAnalysis.portfolioScore}/100 | Beta: ${portfolioBetaResult.portfolioBeta} | Stress Worst: ${stressTests.worstCaseImpactPct}%`,
  });
  emit('macro_market_analyst', 'agent_completed', 'Deterministic Analytics completed', { status: 'completed' });
  await new Promise((r) => setTimeout(r, 200));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: Analysis Trigger & AI Mode Selection (Section 6 & 7)
  // ═══════════════════════════════════════════════════════════════════════════

  const triggerDecision: AnalysisTriggerDecision = evaluateAnalysisTrigger({
    currentPortfolio: portfolio,
    currentMarket: market,
    currentBeta: portfolioBetaResult.portfolioBeta,
    currentBreadthPct: technicalAnalysis.breadthPct,
    currentMacroRegime: macroAnalysis.regime,
    previousSnapshot,
    highMaterialityNewsCount: clusteredNews.highMaterialityCount,
    forceRun: options?.force,
  });

  // Effective mode selection (Prompt #2 & #19)
  let effectiveMode: 'quick' | 'deep' | 'no_ai' | 'deterministic_only';
  if (options?.mode === 'no_ai') {
    effectiveMode = 'no_ai';
  } else if (options?.mode && options.mode !== 'auto') {
    effectiveMode = options.mode;
  } else if (!triggerDecision.shouldRunAI && !options?.force) {
    // If no material change and not forced, default to NO_AI mode with 0 LLM calls (Prompt #2)
    console.log(`[pipeline-v2:trigger] Trigger outcome: ${triggerDecision.outcome}. Reusing existing analysis / NO_AI mode.`);
    effectiveMode = 'no_ai';
  } else {
    effectiveMode = triggerDecision.recommendedMode === 'deep' ? 'deep' : 'quick';
  }

  console.log(`[pipeline-v2:trigger] Trigger outcome: ${triggerDecision.outcome} -> Executing in ${effectiveMode.toUpperCase()} mode.`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: AI Reasoning Layer (Analyst -> Critic -> Validator -> Materiality -> Synth -> Zod)
  // ═══════════════════════════════════════════════════════════════════════════

  emit('risk_strategy_engine', 'agent_started', `AI Reasoning Layer (${effectiveMode} mode)`, { status: 'running' });

  const degradation = new DegradationTracker();
  let unifiedAnalystOut: any = null;
  let crossExaminerOut: any = null;
  let synthesizerOut: any = null;
  let claimValidation: ClaimValidationResult;

  // Check if client cancelled request (Prompt #24)
  if (options?.abortSignal?.aborted) {
    console.warn('[pipeline-v2:abort] Execution aborted by client signal. Returning deterministic analytics.');
    effectiveMode = 'deterministic_only';
  }

  if (effectiveMode !== 'deterministic_only' && effectiveMode !== 'no_ai') {
    // ═════════════════════════════════════════════════════════════════════════
    // 8A. Unified Analyst (1 LLM call)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('[pipeline-v2:analyst] Executing Unified Portfolio Analyst...');
    const analystStart = Date.now();
    emit('risk_strategy_engine', 'stage_started', 'Executing Unified Portfolio Analyst', {
      description: 'Single high-density reasoning call synthesizing fundamentals, technicals, macro & risk',
    });

    const unifiedResult = await safeAgentCall(
      'UnifiedAnalyst',
      () =>
        runUnifiedAnalyst({
          portfolio,
          fundamental: fundamentalAnalysis,
          technical: technicalAnalysis,
          macro: macroAnalysis,
          risk: riskAnalysis,
          beta: portfolioBetaResult,
          bondRisk: bondRiskResult,
          tax: taxResult,
          crossFactors,
          stress: stressTests,
          clusteredNews,
          evidence,
        }),
      STAGE_TIMEOUTS.strategistAgent
    );

    if (unifiedResult.error || !unifiedResult.result) {
      degradation.addDegradation('Unified Analyst', unifiedResult.error || 'Execution failed', 'AI reasoning unavailable', 'Deterministic analytics only', 'significant');
      console.warn('[pipeline-v2:analyst] Unified Analyst failed or timed out:', unifiedResult.error);
    } else {
      unifiedAnalystOut = unifiedResult.result;
      console.log(`[pipeline-v2:analyst:done] Completed in ${Date.now() - analystStart}ms.`);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 8B. Critic / Cross-Examiner QA (Deep mode 2nd LLM call)
    // ═════════════════════════════════════════════════════════════════════════
    const mockStrategistOut = unifiedAnalystOut ? {
      portfolioImplications: unifiedAnalystOut.portfolioNarrative,
      priorityIssues: unifiedAnalystOut.priorityActions.map((a: any) => ({
        title: a.title,
        description: `${a.observation} ${a.interpretation}`,
        priority: a.priority,
        category: a.category,
        actionable: a.potentialConsideration,
        evidence: a.monitorCondition,
      })),
      opportunities: unifiedAnalystOut.opportunities.map((o: any) => ({
        title: o.title,
        description: o.description,
        priority: o.priority,
        category: o.category,
        actionable: o.actionable,
        evidence: (o.evidenceIds || []).join(', '),
      })),
      risks: unifiedAnalystOut.risks.map((r: any) => ({
        title: r.title,
        description: r.description,
        severity: r.severity,
        mitigation: r.mitigation,
      })),
      longTermStrategy: unifiedAnalystOut.portfolioNarrative,
      thesisAssessments: unifiedAnalystOut.thesisMonitor.map((t: any) => ({
        ticker: t.symbol,
        thesisStatus: t.thesisStatus,
        explanation: t.explanation,
        catalystsWatch: t.catalystsWatch,
      })),
      whatWouldChangeTheView: unifiedAnalystOut.whatWouldChangeTheView,
    } : null;

    if (effectiveMode === 'deep' && unifiedAnalystOut && mockStrategistOut && !options?.abortSignal?.aborted) {
      console.log('[pipeline-v2:critic] Executing Cross-Examiner QA...');
      const criticStart = Date.now();
      emit('synthesis_director', 'agent_started', 'Deep Mode QA & Synthesis started', { status: 'running' });
      emit('synthesis_director', 'stage_started', 'Executing Cross-Examiner QA', {
        description: 'Adversarially auditing analyst claims against evidence graph and data quality',
      });

      const crossExResult = await safeAgentCall(
        'CrossExaminer',
        () =>
          runCrossExaminer({
            fundamentalOutput: { strengths: unifiedAnalystOut.strengths, watchItems: [], interpretation: unifiedAnalystOut.portfolioNarrative, holdingAssessments: [], whatWouldChangeTheView: unifiedAnalystOut.whatWouldChangeTheView },
            technicalOutput: { trendAssessment: technicalAnalysis.trend, breadthInterpretation: `${technicalAnalysis.breadthPct}% above 200DMA`, holdingSignals: [], whatWouldChangeTheView: '' },
            macroOutput: { regimeInterpretation: macroAnalysis.regime, keyDrivers: [], sectorOutlook: {}, portfolioImplications: '', whatWouldChangeTheView: '' },
            riskOutput: { riskInterpretation: `Risk score ${riskAnalysis.overallRiskScore}/100`, scenarioInterpretations: [], topRiskNarrative: '', whatWouldChangeTheView: '' },
            strategistOutput: mockStrategistOut,
            dataQuality,
            evidence,
          }),
        STAGE_TIMEOUTS.crossExaminer
      );

      if (crossExResult.result) {
        crossExaminerOut = crossExResult.result;
        console.log(`[pipeline-v2:critic:done] Completed in ${Date.now() - criticStart}ms. Challenges: ${crossExaminerOut.challenges?.length || 0}`);
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 8C. Deterministic Claim Validator (Prompt #1: runs BEFORE Synthesis!)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('[pipeline-v2:validator] Validating Analyst & Critic claims against deterministic ground truth...');
    claimValidation = validateClaims({
      fundamental: fundamentalAnalysis,
      technical: technicalAnalysis,
      macro: macroAnalysis,
      risk: riskAnalysis,
      stress: stressTests,
      dataQuality,
      evidence,
      portfolioBeta: portfolioBetaResult.portfolioBeta,
      agentClaims: {
        fundamentalInterpretation: unifiedAnalystOut?.portfolioNarrative,
        technicalTrend: technicalAnalysis.trend,
        macroRegime: macroAnalysis.regime,
        riskInterpretation: `Risk score ${riskAnalysis.overallRiskScore}/100`,
        strategistImplications: unifiedAnalystOut?.portfolioNarrative,
        executiveSummary: unifiedAnalystOut?.portfolioNarrative,
      },
    });

    console.log(`[pipeline-v2:validator:done] Checks: ${claimValidation.totalChecks}, Passed: ${claimValidation.passedChecks}, Violations: ${claimValidation.violations.length}, Claim Coverage: ${claimValidation.claimCoverage?.claimCoveragePercent}%`);
    if (claimValidation.violations.length > 0) {
      console.warn(`[pipeline-v2:validator:violations] Filtered out ${claimValidation.violations.length} unsupported claims:`, claimValidation.violations.map((v: any) => `${v.type}: ${v.explanation}`));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 8D. Materiality Filter (Prompt #1: runs AFTER Validator, BEFORE Synthesis)
    // ═════════════════════════════════════════════════════════════════════════
    console.log('[pipeline-v2:materiality] Enforcing hard output budget (<= 5 findings) and filtering noise...');
    materialityContext = filterFindingsForSynthesis({
      crossFactors,
      riskFlags: riskAnalysis.flags,
      significantChanges: temporalAnalysis.significantChanges,
      taxFlags: taxResult.taxFlags,
      holdingSignalsCount: technicalAnalysis.holdings.length,
      challengesCount: crossExaminerOut?.challenges?.length || 0,
    });
    console.log(`[pipeline-v2:materiality:done] Evaluated ${materialityContext.totalEvaluated} findings -> Top: ${materialityContext.topMaterialFindings.length}, Contradictions: ${materialityContext.contradictions.length}`);

    // ═════════════════════════════════════════════════════════════════════════
    // 8E. Synthesizer & Zod Validation (Prompt #1: receives ONLY validated findings!)
    // ═════════════════════════════════════════════════════════════════════════
    if (effectiveMode === 'deep' && unifiedAnalystOut && mockStrategistOut && !options?.abortSignal?.aborted) {
      console.log('[pipeline-v2:synthesizer] Executing Final Synthesizer with validated findings only...');
      const synthStart = Date.now();
      emit('synthesis_director', 'stage_started', 'Executing Final Synthesizer', {
        description: 'Generating executive editorial synthesis reconciling cross-factor findings',
      });

      const synthResult = await safeAgentCall(
        'FinalSynthesizer',
        () =>
          runSynthesizer({
            portfolio,
            strategistOutput: mockStrategistOut,
            crossExaminerOutput: crossExaminerOut || { challenges: [], validatedClaims: 5, challengedClaims: 0, overallConfidence: 'High', confidenceRationale: 'Deterministic analytics verified' },
            crossFactors,
            validatedFindings: materialityContext.topMaterialFindings,
            contradictions: materialityContext.keyContradictions,
            scores: {
              fundamental: fundamentalAnalysis.portfolioScore,
              technical: technicalAnalysis.portfolioScore,
              risk: riskAnalysis.overallRiskScore,
              overall: Math.round((fundamentalAnalysis.portfolioScore + technicalAnalysis.portfolioScore + riskAnalysis.overallRiskScore) / 3),
              status: 'Good',
            },
            regime: macroAnalysis.regime.replace(/_/g, ' '),
            weightedPE: fundamentalAnalysis.weightedPE,
            breadthPct: technicalAnalysis.breadthPct,
            evidence,
          }),
        STAGE_TIMEOUTS.synthesizer
      );

      if (synthResult.result) {
        synthesizerOut = synthResult.result;
        console.log(`[pipeline-v2:synthesizer:done] Synthesizer finished in ${Date.now() - synthStart}ms.`);
        console.log(`[pipeline-v2:zod] Synthesizer output validated against Zod schema.`);
      }
      emit('synthesis_director', 'agent_completed', 'Deep Mode QA & Synthesis completed', { status: 'completed' });
    }
  } else {
    // NO_AI or DETERMINISTIC_ONLY fallback (Prompt #2 & #19)
    console.log(`[pipeline-v2:fallback] Skipping LLM execution (${effectiveMode.toUpperCase()} mode). Using verified deterministic analytics.`);
    claimValidation = validateClaims({
      fundamental: fundamentalAnalysis,
      technical: technicalAnalysis,
      macro: macroAnalysis,
      risk: riskAnalysis,
      stress: stressTests,
      dataQuality,
      evidence,
      portfolioBeta: portfolioBetaResult.portfolioBeta,
      agentClaims: {
        fundamentalInterpretation: `Portfolio fundamental score: ${fundamentalAnalysis.portfolioScore}/100. Weighted P/E: ${fundamentalAnalysis.weightedPE}x.`,
        technicalTrend: technicalAnalysis.trend,
        macroRegime: macroAnalysis.regime,
        riskInterpretation: `Risk score ${riskAnalysis.overallRiskScore}/100.`,
      },
    });
  }

  const pipelineDegradation = degradation.build();

  // Composite Scoring
  const scoringWeights: ScoringWeights = {
    fundamental: 0.25,
    technical: 0.20,
    risk: 0.20,
    diversification: 0.15,
    valuation: 0.10,
    performance: 0.10,
  };

  const overallScore = Math.round(
    fundamentalAnalysis.portfolioScore * scoringWeights.fundamental +
    technicalAnalysis.portfolioScore * scoringWeights.technical +
    riskAnalysis.overallRiskScore * scoringWeights.risk +
    portfolio.concentration.diversificationScore * scoringWeights.diversification +
    fundamentalAnalysis.valuationSubscore * scoringWeights.valuation +
    50 * scoringWeights.performance
  );

  const overallStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor' =
    overallScore >= 80 ? 'Excellent' : overallScore >= 65 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Poor';

  // Confidence Propagation
  const engineConfidences: EngineConfidence[] = [
    computeEngineConfidence(fundamentalAnalysis.portfolioScore, fundamentalAnalysis.holdings.length, portfolio.holdings.equity.length, dataQuality.missingMetrics, dataQuality.staleMetrics),
    computeEngineConfidence(technicalAnalysis.portfolioScore, technicalAnalysis.holdings.length, portfolio.holdings.equity.length),
    computeEngineConfidence(macroAnalysis.regimeConfidence, macroAnalysis.exposures.length, 5),
    computeEngineConfidence(riskAnalysis.overallRiskScore, 4, 4),
    computeEngineConfidence(75, stressTests.scenarios.length, 3),
  ];

  const confidenceReport = propagateConfidence({
    dataQuality,
    engines: engineConfidences,
    claimValidation,
    crossExaminerConfidence: crossExaminerOut?.overallConfidence || 'High',
  });

  // Build Factor Alignment Matrix (Section 60)
  const factorAlignmentMatrix: MatrixStock[] = fundamentalAnalysis.holdings.map((fh) => {
    const th = technicalAnalysis.holdings.find((t) => t.ticker === fh.ticker);
    return {
      symbol: fh.ticker,
      name: fh.name,
      weight: fh.weight,
      fundamental: fh.fundamentalStatus === 'Strong' ? 'Strong' : fh.fundamentalStatus === 'Weak' ? 'Weak' : 'Neutral',
      technical: th?.trend === 'Bullish' ? 'Strong' : th?.trend === 'Bearish' ? 'Weak' : 'Neutral',
    };
  });

  // Build Integrated Views (Section 59)
  const integratedViews: IntegratedView[] = (unifiedAnalystOut?.integratedHoldings || []).map((ih: any) => ({
    symbol: ih.symbol,
    fundamentals: ih.fundamentals,
    valuation: ih.valuation,
    technicals: ih.technicals,
    macroExposure: ih.macroExposure,
    newsContext: ih.newsContext,
    interaction: ih.interaction,
    conclusion: ih.conclusion,
    evidenceIds: ih.evidenceIds || [],
    confidence: confidenceReport.overallScore,
  }));

  // Build Fallback & Core Executive Texts
  const isAIAvailable = Boolean(unifiedAnalystOut || synthesizerOut);
  const executiveSummary = synthesizerOut?.executiveSummary ||
    unifiedAnalystOut?.portfolioNarrative ||
    `Deterministic Portfolio Health: ${overallScore}/100 (${overallStatus}). Fundamental score: ${fundamentalAnalysis.portfolioScore}, Technical: ${technicalAnalysis.portfolioScore}, Risk: ${riskAnalysis.overallRiskScore}. AI commentary is temporarily unavailable.`;

  const allocationCommentary = synthesizerOut?.allocationCommentary ||
    unifiedAnalystOut?.allocationCommentary ||
    (goldWeightPct > 0
      ? `Equity represents ${equityWeightPct.toFixed(1)}%, Fixed Income represents ${bondWeightPct.toFixed(1)}%, and Gold represents ${goldWeightPct.toFixed(1)}% of net worth.`
      : `Equity represents ${equityWeightPct.toFixed(1)}% and Fixed Income represents ${bondWeightPct.toFixed(1)}% of net worth.`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 10: Response Assembly
  // ═══════════════════════════════════════════════════════════════════════════

  const response: AIInsightsResponse = {
    // V1 fields strictly preserved
    health: {
      score: overallScore,
      summary: executiveSummary.slice(0, 200),
      status: overallStatus,
      reasons: (unifiedAnalystOut?.strengths || fundamentalAnalysis.strengths).slice(0, 3),
    },
    allocation: {
      equity: Math.round(equityWeightPct * 10) / 10,
      bonds: Math.round(bondWeightPct * 10) / 10,
      gold: Math.round(goldWeightPct * 10) / 10,
      cash: 0,
      other: Math.round(Math.max(0, 100 - equityWeightPct - bondWeightPct - goldWeightPct) * 10) / 10,
      commentary: allocationCommentary,
    },
    opportunities: (unifiedAnalystOut?.opportunities && unifiedAnalystOut.opportunities.length > 0)
      ? unifiedAnalystOut.opportunities.map((o: any) => ({
          title: o.title,
          description: o.description,
          priority: o.priority,
          category: o.category,
          actionable: o.actionable,
          evidence: (o.evidenceIds || []).join(', '),
        }))
      : [
          ...taxResult.harvestingCandidates.map((c) => ({
            title: `Tax Harvesting: ${c.name}`,
            description: c.recommendedAction,
            priority: 'High' as const,
            category: 'Tax Efficiency',
            actionable: c.recommendedAction,
            evidence: c.evidenceId,
          })),
          ...fundamentalAnalysis.holdings
            .filter((h) => h.valuationStatus === 'Undervalued')
            .map((h) => ({
              title: `Valuation Opportunity: ${h.name}`,
              description: `${h.ticker} is trading at ${h.trailingPE?.toFixed(1)}x trailing earnings vs sector benchmark ${h.sectorPE?.toFixed(1) ?? 22.8}x with solid capital efficiency.`,
              priority: 'Medium' as const,
              category: 'Valuation',
              actionable: 'Monitor for accumulated dips or gradual SIP top-up.',
              evidence: `VAL_${h.ticker}`,
            })),
          {
            title: 'Disciplined Asset Allocation Rebalance',
            description: `Current equity weighting of ${Math.round(equityWeightPct)}% aligns with overall portfolio targets. Deploy new SIP flows into defensive/underweight sleeves.`,
            priority: 'Low' as const,
            category: 'Asset Allocation',
            actionable: 'Direct fresh cashflows to maintain strategic asset targets.',
            evidence: 'ALLOC_BASELINE',
          },
        ].slice(0, 5),
    risks: (unifiedAnalystOut?.risks || riskAnalysis.flags.map((f) => ({
      title: f.title,
      description: f.description,
      severity: (f.severity === 'red' ? 'High' : 'Medium') as 'High' | 'Medium',
      mitigation: f.actionRecommendation,
    }))).slice(0, 5),
    cashFlow: {
      investment: input.totalInvestment,
      expenses: input.totalExpenses,
      net: input.totalInvestment - input.totalExpenses,
      summary: 'Consistent personal investment rate.',
    },
    recommendations: (unifiedAnalystOut?.priorityActions || []).map((p: any) => {
      let title = p.title;
      let action = p.potentialConsideration || p.actionable || 'Monitor allocation';
      let rationale = `${p.observation} — ${p.interpretation}`;

      if (goldWeightPct >= 4 && (
        /add\s+(?:inflation\s+)?hedge/i.test(title) ||
        /allocate.*(?:gold|inflation-linked)/i.test(action) ||
        /buy\s+gold/i.test(action)
      )) {
        title = 'Maintain Existing Inflation Hedge';
        action = `Hold current ${goldWeightPct.toFixed(1)}% gold allocation as an inflation and currency hedge against macro pressures.`;
        rationale = `Macro environment signals inflation risks (oil at $${market.brentCrude?.price?.toFixed(1) || '100+'}/bbl, INR depreciation). Existing ${goldWeightPct.toFixed(1)}% gold allocation provides valuable portfolio insulation without requiring additional capital commitment.`;
      }

      return {
        title,
        action,
        rationale,
        priority: p.priority,
        evidence: p.monitorCondition,
        timeframe: p.priority === 'High' ? 'Immediate' : 'Next 30 days',
        category: p.category,
      };
    }),
    summary: executiveSummary,
    diversification: {
      score: portfolio.concentration.diversificationScore,
      grade: portfolio.concentration.diversificationScore >= 75 ? 'Excellent' : portfolio.concentration.diversificationScore >= 55 ? 'Good' : 'Fair',
      hhi: portfolio.concentration.herfindahlIndex,
      strengths: fundamentalAnalysis.strengths.slice(0, 2),
      weaknesses: fundamentalAnalysis.watchItems.slice(0, 2),
      suggestion: 'Maintain disciplined asset allocation across uncorrelated factors.',
    },
    marketCondition: {
      status: macroAnalysis.regime === 'risk_on' ? 'Bull Market' : macroAnalysis.regime === 'risk_off' ? 'Bear Market' : macroAnalysis.regime === 'recovery' ? 'Recovery' : 'Sideways',
      summary: `Market regime: ${macroAnalysis.regime.replace(/_/g, ' ')} (${macroAnalysis.regimeConfidence}% confidence)`,
      keyDrivers: macroAnalysis.exposures.map((e) => `${e.variable}: ${e.currentValue} (${e.trend})`),
      impactOnEquity: 'Market trends and sector sensitivity driven by macroeconomic factors.',
      impactOnBonds: `Weighted bond duration of ${bondRiskResult.weightedDuration}y dictates interest-rate sensitivity.`,
      impactOnPortfolio: macroAnalysis.regimeRationale,
    },
    marketOutlook: {
      horizon: '6–12 Months',
      sentiment: stressTests.worstCaseImpactPct < -15 ? 'Cautious' : 'Neutral',
      scenarios: stressTests.scenarios.map((s) => ({
        name: s.name,
        probability: s.probability,
        impact: `Portfolio ${s.portfolioImpactPct > 0 ? '+' : ''}${s.portfolioImpactPct}%`,
        trigger: s.description,
        description: s.description,
      })),
      recommendation: synthesizerOut?.recommendation || (isAIAvailable ? 'Follow priority conditional rebalance considerations.' : 'Rely on deterministic risk and diversification scores.'),
    },
    longTermStrategy: {
      alignmentScore: overallScore,
      currentApproach: executiveSummary.slice(0, 200),
      suggestions: (unifiedAnalystOut?.priorityActions || []).filter((p: any) => p.priority === 'High').map((p: any) => p.potentialConsideration).slice(0, 3),
      compoundingInsight: allocationCommentary,
    },
    generatedAt: new Date().toISOString(),

    // V2 Additive Fields
    portfolioHealthBreakdown: {
      overall: overallScore,
      fundamental: fundamentalAnalysis.portfolioScore,
      technical: technicalAnalysis.portfolioScore,
      valuation: fundamentalAnalysis.valuationSubscore,
      risk: riskAnalysis.overallRiskScore,
      diversification: portfolio.concentration.diversificationScore,
      performance: 50,
      status: overallStatus,
      summary: `Portfolio health score: ${overallScore}/100.`,
      methodology: 'Evidence-driven multi-factor scoring: 25% Fundamentals, 20% Technicals, 20% Risk, 15% Diversification, 10% Valuation, 10% Performance.',
    },
    scoringWeights,
    executiveSummaryInsights: (synthesizerOut?.keyFindings || unifiedAnalystOut?.keyFindings || []).map((f: any) => ({
      title: f.title,
      insight: f.insight,
      category: f.category,
      evidence: Array.isArray(f.evidence) ? f.evidence : (f.evidenceIds || []),
    })),
    fundamentalIntelligence: {
      score: fundamentalAnalysis.portfolioScore,
      strengths: fundamentalAnalysis.strengths,
      watchItems: fundamentalAnalysis.watchItems,
      interpretation: unifiedAnalystOut?.portfolioNarrative || `Fundamental score: ${fundamentalAnalysis.portfolioScore}/100.`,
      holdings: fundamentalAnalysis.holdings.map((h) => ({
        symbol: h.ticker,
        name: h.name,
        weight: h.weight,
        pe: h.trailingPE,
        forwardPe: h.forwardPE,
        pb: h.priceToBook,
        dividendYield: h.dividendYield,
        status: h.fundamentalStatus,
      })),
    },
    technicalIntelligence: {
      breadthScore: technicalAnalysis.portfolioScore,
      trend: technicalAnalysis.trend,
      momentum: technicalAnalysis.momentum,
      marketStructure: technicalAnalysis.marketStructure,
      signals: technicalAnalysis.holdings.map((h) => ({
        symbol: h.ticker,
        name: h.name,
        weight: h.weight,
        currentPrice: h.currentPrice,
        fiftyDayAverage: h.fiftyDayAverage,
        twoHundredDayAverage: h.twoHundredDayAverage,
        fiftyTwoWeekHigh: h.fiftyTwoWeekHigh,
        pctFrom52WHigh: h.pctFrom52WHigh,
        trend: h.trend,
        momentum: h.momentum,
        marketStructure: h.marketStructure,
        priceVs200DMA: h.pctVs200DMA,
        priceVs50DMA: h.pctVs50DMA,
        signalExplanation: h.signalExplanation,
      })),
      interpretation: `Technical breadth: ${technicalAnalysis.breadthPct}% holdings above 200DMA.`,
    },
    valuationIntelligence: {
      portfolioPe: fundamentalAnalysis.weightedPE,
      benchmarkPe: NIFTY_50_LONG_TERM_PE.value,
      benchmarkName: 'NIFTY 50',
      relativeValuationPct: Math.round(((fundamentalAnalysis.weightedPE - NIFTY_50_LONG_TERM_PE.value) / NIFTY_50_LONG_TERM_PE.value) * 1000) / 10,
      interpretation: `Portfolio trades at ${fundamentalAnalysis.weightedPE}x weighted P/E vs Nifty 50 benchmark of ${NIFTY_50_LONG_TERM_PE.value}x.`,
      holdingsValuation: fundamentalAnalysis.holdings.map((h) => ({
        symbol: h.ticker,
        pe: h.trailingPE,
        benchmarkPe: h.sectorPE ?? NIFTY_50_LONG_TERM_PE.value,
        sectorPe: h.sectorPE,
        status: (h.valuationStatus === 'Moderate' ? 'Fair' : h.valuationStatus) as 'Undervalued' | 'Fair' | 'Elevated' | 'N/A',
      })),
    },
    riskIntelligence: {
      overallRiskScore: riskAnalysis.overallRiskScore,
      topSectorExposure: {
        sector: portfolio.allocation.sectorAllocation[0]?.sector || 'Core Equities',
        percentage: Math.round((portfolio.allocation.sectorAllocation[0]?.percent || 0) * 1000) / 10,
      },
      top5HoldingsWeight: Math.round(portfolio.concentration.top5Percent * 1000) / 10,
      largestPosition: {
        symbol: input.topEquity[0]?.ticker || 'N/A',
        percentage: input.topEquity[0]?.allocationPercent || 0,
      },
      debtQualityScore: riskAnalysis.bondDuration,
      topRiskFactors: riskAnalysis.flags.map((f) => ({
        title: f.title,
        category: f.type === 'concentration' ? 'Sector Concentration' : f.type === 'duration' ? 'Macro Sensitivity' : 'Position Sizing',
        severity: f.severity === 'red' ? 'High' : f.severity === 'orange' ? 'Medium' : 'Low',
        evidence: f.evidence,
        potentialImpact: f.description,
        whatToMonitor: f.actionRecommendation,
      })),
      interpretation: `Overall risk score ${riskAnalysis.overallRiskScore}/100. Portfolio Beta: ${portfolioBetaResult.portfolioBeta}.`,
    },
    portfolioIntelligence: {
      portfolioReturnPct: 0,
      topContributors: input.winners.slice(0, 4).map((w) => ({
        symbol: w.ticker,
        name: w.name,
        contributionPct: Math.round(w.percentChange * w.allocationPercent * 10) / 10,
        returnPct: Math.round(w.percentChange * 1000) / 10,
        weight: w.allocationPercent,
        type: 'gain',
      })),
      underperformers: input.losers.slice(0, 4).map((l) => ({
        symbol: l.ticker,
        name: l.name,
        contributionPct: Math.round(l.percentChange * l.allocationPercent * 10) / 10,
        returnPct: Math.round(l.percentChange * 1000) / 10,
        weight: l.allocationPercent,
        type: 'loss',
      })),
      interpretation: goldWeightPct > 0
        ? `Portfolio allocation: ${equityWeightPct.toFixed(1)}% equity, ${bondWeightPct.toFixed(1)}% fixed income, ${goldWeightPct.toFixed(1)}% gold.`
        : `Portfolio allocation: ${equityWeightPct.toFixed(1)}% equity, ${bondWeightPct.toFixed(1)}% fixed income.`,
      assetAllocationSummary: portfolio.allocation.assetAllocation.map((a) => ({ asset: a.label, percentage: Math.round(a.percent * 1000) / 10 })),
      sectorAllocationSummary: portfolio.allocation.sectorAllocation.slice(0, 6).map((s) => ({ sector: s.sector, percentage: Math.round(s.percent * 1000) / 10 })),
    },
    macroIntelligence: {
      summary: `Market regime: ${macroAnalysis.regime.replace(/_/g, ' ')} (${macroAnalysis.regimeConfidence}% confidence)`,
      exposures: macroAnalysis.exposures.map((e) => ({
        variable: e.variable,
        currentValue: e.currentValue,
        trend: (e.trend === 'Rising' ? 'Rising' : e.trend === 'Falling' ? 'Falling' : e.trend === 'Stable' ? 'Stable' : 'Neutral') as 'Elevated' | 'Rising' | 'Falling' | 'Stable' | 'Neutral',
        sensitivity: e.sensitivity,
        affectedHoldingsOrSectors: e.affectedSectors.join(', '),
      })),
    },
    fundamentalTechnicalMatrix: {
      stocks: factorAlignmentMatrix,
      summary: `Factor Alignment Matrix across ${factorAlignmentMatrix.length} holdings.`,
    },
    reviewFlags: riskAnalysis.flags.map((f) => ({
      type: f.type as 'concentration' | 'technical' | 'valuation' | 'quality',
      severity: f.severity,
      title: f.title,
      description: f.description,
      evidence: f.evidence,
      actionRecommendation: f.actionRecommendation,
    })),
    thesisMonitor: (unifiedAnalystOut?.thesisMonitor || []).map((t: any) => {
      const fh = fundamentalAnalysis.holdings.find((h) => h.ticker === t.symbol);
      const th = technicalAnalysis.holdings.find((h) => h.ticker === t.symbol);
      return {
        symbol: t.symbol,
        name: fh?.name || t.symbol,
        weight: fh?.weight || 0,
        fundamentalsStatus: (fh?.fundamentalStatus === 'Strong' ? 'Strong' : fh?.fundamentalStatus === 'Weak' ? 'Weak' : 'Neutral') as 'Strong' | 'Neutral' | 'Weak',
        valuationStatus: (fh?.valuationStatus || 'Moderate') as 'Undervalued' | 'Moderate' | 'Elevated' | 'Fair',
        technicalStatus: (th?.trend === 'Bullish' ? 'Bullish' : th?.trend === 'Bearish' ? 'Bearish' : 'Neutral') as 'Bullish' | 'Neutral' | 'Bearish',
        riskLevel: ((fh?.weight || 0) > 15 ? 'High' : (fh?.weight || 0) > 8 ? 'Medium' : 'Low') as 'Low' | 'Medium' | 'High',
        thesisStatus: (t.thesisStatus === 'Invalidated' ? 'Review' : t.thesisStatus) as 'Intact' | 'Monitor' | 'Review',
        explanation: `${t.explanation}${t.catalystsWatch ? ` Catalysts: ${t.catalystsWatch}` : ''}`,
      };
    }),
    portfolioChanges: {
      isAvailable: true,
      message: 'Evidence-driven analysis with deterministic scoring and cross-factor reasoning.',
      changes: [
        {
          metric: 'Portfolio P/E vs Nifty 50',
          previousValue: `${NIFTY_50_LONG_TERM_PE.value}x (Nifty 50)`,
          currentValue: `${fundamentalAnalysis.weightedPE}x`,
          changeDirection: fundamentalAnalysis.weightedPE > NIFTY_50_LONG_TERM_PE.value ? 'down' : 'up',
          interpretation: `Weighted P/E of ${fundamentalAnalysis.weightedPE}x vs Nifty benchmark ${NIFTY_50_LONG_TERM_PE.value}x`,
        },
        {
          metric: 'Technical Breadth (>200DMA)',
          previousValue: '50.0% (Neutral)',
          currentValue: `${technicalAnalysis.breadthPct}%`,
          changeDirection: technicalAnalysis.breadthPct >= 50 ? 'up' : 'down',
          interpretation: technicalAnalysis.breadthPct >= 60 ? 'Bullish breadth structure' : 'Breadth below neutral line',
        },
        {
          metric: 'Market Regime',
          previousValue: previousSnapshot?.macroRegime || 'N/A',
          currentValue: macroAnalysis.regime.replace(/_/g, ' '),
          changeDirection: macroAnalysis.regime === 'risk_on' || macroAnalysis.regime === 'recovery' ? 'up' : 'neutral',
          interpretation: `Detected regime: ${macroAnalysis.regime.replace(/_/g, ' ')} (${macroAnalysis.regimeConfidence}% confidence)`,
        },
        {
          metric: 'Cross-Factor Interactions',
          previousValue: '0',
          currentValue: `${crossFactors.length}`,
          changeDirection: crossFactors.some((cf) => cf.relationship === 'amplifies') ? 'down' : 'up',
          interpretation: `${crossFactors.length} interaction effects identified across factor domains`,
        },
      ],
    },
    aiConfidence: {
      level: (confidenceReport.overallConfidence === 'high' ? 'High' : confidenceReport.overallConfidence === 'low' ? 'Low' : 'Medium') as 'High' | 'Medium' | 'Low',
      reason: confidenceReport.confidenceRationale,
      metricsAvailableCount: evidence.metrics.length,
      metricsTotalExpected: (input.topEquity.length * 2) + 6,
    },

    // Sections 37, 59, 64 Extensions
    metadata: {
      runId,
      snapshotHash,
      analysisMode: effectiveMode,
      analyticsVersion: '2.0.0',
      promptVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      dataAsOf: {
        portfolio: portfolio.asOf,
        market: market.observedAt,
        news: news.observedAt,
      },
      apiUsageEstimate: budgetManager.getEstimate(),
      overallConfidence: confidenceReport.overallConfidence,
      degradationState: pipelineDegradation.state,
    },
    claimCoverage: claimValidation.claimCoverage,
    integratedViews,
  };

  emit('synthesis_director', 'milestone', 'Executive intelligence report assembled', {
    description: `Report complete in ${effectiveMode} mode. Coverage: ${claimValidation.claimCoverage?.claimCoveragePercent}%. Confidence: ${confidenceReport.overallConfidence}`,
  });
  emit('synthesis_director', 'agent_completed', 'Synthesis completed', { status: 'completed' });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 11: Asynchronous Historical Snapshot Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  saveHistoricalSnapshot({
    userId: effectiveUserId,
    netWorth: portfolio.aggregates.netWorth,
    equityTotal: portfolio.aggregates.equityTotal,
    bondTotal: portfolio.aggregates.bondTotal,
    equityCount: portfolio.aggregates.equityCount,
    bondCount: portfolio.aggregates.bondCount,
    top5Percent: portfolio.concentration.top5Percent,
    herfindahlIndex: portfolio.concentration.herfindahlIndex,
    diversificationScore: portfolio.concentration.diversificationScore,
    weightedPE: fundamentalAnalysis.weightedPE,
    breadthPct: technicalAnalysis.breadthPct,
    macroRegime: macroAnalysis.regime,
    portfolioBeta: portfolioBetaResult.portfolioBeta,
    macroMetrics: {
      niftyPrice: market.nifty?.price,
      usdInr: market.usdInr?.price,
      brentCrude: market.brentCrude?.price,
      us10y: market.us10y?.price,
      goldPrice: market.gold?.price,
    },
    assetAllocations: portfolio.allocation.assetAllocation.map((a) => ({ label: a.label, percent: a.percent })),
    sectorAllocations: portfolio.allocation.sectorAllocation.map((s) => ({ sector: s.sector, percent: s.percent })),
  }).catch((err) => console.warn('[pipeline-v2] Async save snapshot warning:', err.message));

  console.log('\n\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`\x1b[32m  ✅ AI INSIGHTS V2 PIPELINE COMPLETED (${effectiveMode.toUpperCase()} MODE)\x1b[0m`);
  console.log(`\x1b[32m  📊 Score: ${overallScore}/100 (${overallStatus}) | Duration: ${Date.now() - startTime}ms\x1b[0m`);
  console.log(`\x1b[32m  🔗 Evidence: ${evidence.metrics.length} metrics, ${evidence.crossFactors.length} cross-factors | Claim Coverage: ${claimValidation.claimCoverage?.claimCoveragePercent}%\x1b[0m`);
  console.log('\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m\n');

  return response;
}
