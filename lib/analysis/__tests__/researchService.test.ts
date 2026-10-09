import test from 'node:test';
import assert from 'node:assert/strict';

import { STOCK_FIXTURES } from '../fixtures/stockData.ts';

test('STOCK_FIXTURES contains reference companies', () => {
  const expectedSymbols = ['TITAN', 'TCS', 'ITC', 'RELIANCE', 'HDFCBANK'];
  for (const sym of expectedSymbols) {
    assert.ok(STOCK_FIXTURES[sym], `Fixture should contain ${sym}`);
    const data = STOCK_FIXTURES[sym];
    
    // Check company profile
    assert.ok(data.company, `${sym} should have company profile`);
    assert.equal(data.company.symbol, sym);
    assert.ok(data.company.name);
    assert.ok(data.company.sector);

    // Check financial statements
    assert.ok(data.quarterlyFinancials, `${sym} should have quarterlyFinancials`);
    assert.ok(data.quarterlyFinancials.periods.length > 0, `${sym} quarterly periods should not be empty`);
    assert.ok(data.quarterlyFinancials.rows.length > 0, `${sym} quarterly rows should not be empty`);

    assert.ok(data.annualFinancials, `${sym} should have annualFinancials`);
    assert.ok(data.annualFinancials.periods.length > 0, `${sym} annual periods should not be empty`);

    assert.ok(data.balanceSheet, `${sym} should have balanceSheet`);
    assert.ok(data.balanceSheet.rows.length > 0, `${sym} balance sheet rows should not be empty`);

    assert.ok(data.cashFlow, `${sym} should have cashFlow`);
    assert.ok(data.cashFlow.rows.length > 0, `${sym} cash flow rows should not be empty`);

    // Check shareholding
    assert.ok(data.shareholding, `${sym} should have shareholding`);
    assert.ok(data.shareholding.history.length > 0, `${sym} shareholding history should not be empty`);
    assert.ok(data.shareholding.latest, `${sym} should have latest shareholding`);

    // Check key metrics & ratios
    assert.ok(data.keyMetrics, `${sym} should have keyMetrics`);
    assert.ok(data.valuation, `${sym} should have valuation`);
    assert.ok(data.profitability, `${sym} should have profitability`);
    assert.ok(data.solvency, `${sym} should have solvency`);

    // Check corporate actions & documents
    assert.ok(data.corporateActions, `${sym} should have corporateActions`);
    assert.ok(data.documents, `${sym} should have documents`);
    assert.ok(data.peers, `${sym} should have peers`);
  }
});

test('TITAN shareholding sums to 100%', () => {
  const titan = STOCK_FIXTURES['TITAN'];
  const latest = titan.shareholding!.latest!;
  const sum = (latest.promoters ?? 0) + (latest.fii ?? 0) + (latest.dii ?? 0) + (latest.public ?? 0) + (latest.others ?? 0);
  assert.ok(Math.abs(sum - 100) < 0.1, `Shareholding sum should be approximately 100, got ${sum}`);
});

test('scrapeScreenerData fetches live data including 2025/2026 for TITAN', async () => {
  const { scrapeScreenerData } = await import('../providers/screenerScraper');
  const titan = await scrapeScreenerData('TITAN');
  
  assert.ok(titan.annualFinancials, 'Should have annual financials');
  const periods = titan.annualFinancials.periods.map(p => p.period);
  assert.ok(periods.includes('Mar 2025'), 'Should include Mar 2025');
  assert.ok(periods.includes('Mar 2026'), 'Should include Mar 2026');
  assert.ok(periods.includes('TTM'), 'Should include TTM');

  const netProfitRow = titan.annualFinancials.rows.find(r => r.metric.includes('Net Profit'));
  assert.ok(netProfitRow, 'Should have Net Profit row');
  // Check that values are numbers
  const mar2026Idx = periods.indexOf('Mar 2026');
  assert.equal(typeof netProfitRow.values[mar2026Idx], 'number');

  // Check shareholding
  assert.ok(titan.shareholding?.history.length, 'Should have shareholding history');
  const shQuarters = titan.shareholding!.history.map(q => q.quarter);
  assert.ok(shQuarters.includes('Jun 2026') || shQuarters.includes('Mar 2026'), 'Should include 2026 shareholding');
});

test('scrapeScreenerData scrapes 26+ extra ratios, key points, citations, and fixed P/B for ITC', async () => {
  const { scrapeScreenerData } = await import('../providers/screenerScraper');
  const itc = await scrapeScreenerData('ITC');

  // 1. Extra Ratios Check
  assert.ok(itc.extraRatios, 'ITC should have extraRatios');
  const er = itc.extraRatios;
  assert.ok(er.marketCap && er.marketCap > 100000, 'Market cap should be > 100,000 Cr');
  assert.ok(er.currentPrice && er.currentPrice > 200, 'Current price should be > 200');
  assert.ok(er.stockPe && er.stockPe > 10, 'Stock PE should be > 10');
  assert.ok(er.bookValue && er.bookValue > 40, 'Book value should be > 40');
  assert.ok(er.roce && er.roce > 30, 'ROCE should be > 30%');
  assert.ok(er.roe && er.roe > 20, 'ROE should be > 20%');
  assert.ok(er.faceValue === 1.0 || er.faceValue === 1, 'Face value should be 1');
  assert.ok(er.reserves && er.reserves > 50000, 'Reserves should be > 50,000 Cr');
  assert.ok(er.debtToEquity != null && er.debtToEquity < 0.1, 'Debt to equity should be ~0.03');
  assert.ok(er.downFrom52wHigh && er.downFrom52wHigh > 30, 'Down from 52w high should be > 30%');
  assert.ok(er.pegRatio && er.pegRatio > 3, 'PEG ratio should be > 3');
  assert.ok(er.cmpToFcf && er.cmpToFcf > 15, 'CMP/FCF should be > 15');
  assert.ok(er.interestCoverage && er.interestCoverage > 100, 'Interest coverage should be > 100');

  // 2. Correct P/B Check (Price / Book Value, NOT Book Value itself)
  assert.ok(er.priceToBook && er.priceToBook < 10, `P/B should be ~4.6x, got ${er.priceToBook}`);
  assert.equal(itc.valuation?.pb, er.priceToBook, 'Valuation pb should match priceToBook');

  // 3. Key Points & Citations Check
  assert.ok(itc.keyPoints, 'Should have keyPoints');
  assert.ok(itc.keyPoints.text.includes('Business Segments'), 'Key points should mention Business Segments');
  assert.ok(itc.keyPoints.text.includes('Geographical Split'), 'Key points should include Geographical Split');
  assert.ok(itc.keyPoints.text.includes('Distribution Network'), 'Key points should include Distribution Network');
  assert.ok(itc.keyPoints.citations.length >= 20, `Key points should have at least 20 citations, got ${itc.keyPoints.citations.length}`);
  assert.ok(itc.keyPoints.citations[0].url.includes('bseindia.com'), 'Citation should link to official BSE filing');

  // 4. Quick Links Check
  assert.ok(itc.quickLinks && itc.quickLinks.length >= 3, 'Should have quickLinks (Website, BSE, NSE, F&O)');
  const linkLabels = itc.quickLinks.map(l => l.label);
  assert.ok(linkLabels.includes('BSE'), 'Quick links should include BSE');
  assert.ok(linkLabels.includes('NSE'), 'Quick links should include NSE');

  // 5. Solvency and Profitability Ratios Check (ROA, Net Debt/EBITDA, Current Ratio, Quick Ratio)
  assert.ok(itc.profitability?.roa && itc.profitability.roa > 15, `ROA should be > 15%, got ${itc.profitability?.roa}`);
  assert.ok(itc.solvency?.currentRatio && itc.solvency.currentRatio > 1.0, `Current ratio should be > 1.0x, got ${itc.solvency?.currentRatio}`);
  assert.ok(itc.solvency?.quickRatio && itc.solvency.quickRatio > 0.4, `Quick ratio should be > 0.4x, got ${itc.solvency?.quickRatio}`);
  assert.ok(itc.solvency?.netDebtToEbitda != null, 'Net Debt / EBITDA should not be null');

  // 6. Cash Flow Statement CFO/OP unit check
  assert.ok(itc.cashFlow?.rows, 'Cash flow rows should be defined');
  const cfoRow = itc.cashFlow.rows.find(r => r.metric.includes('CFO/OP'));
  assert.ok(cfoRow, 'Cash Flow should contain CFO/OP row');
  assert.equal(cfoRow?.unit, '%', 'CFO/OP unit should be %');

  // 7. Multi-Period Segment Mentions Check (FY24, FY25, FY26)
  assert.ok(itc.keyPoints.text.includes('Business Segments FY26'), 'Key points should explicitly mention Business Segments FY26');
  assert.ok(itc.keyPoints.text.includes('82% in FY25 vs 84% in FY24'), 'Key points should explicitly mention FY25 vs FY24 geographical split');

  // 8. Peer Comparison Ratios Check (P/B, ROE%, ROCE%, D/E)
  assert.ok(itc.peers && itc.peers.peers.length >= 3, 'Should have at least 3 peers');
  const hul = itc.peers.peers.find(p => p.symbol === 'HINDUNILVR');
  assert.ok(hul, 'Peers should include HINDUNILVR');
  assert.ok(hul?.pb != null && hul.pb > 5, `HUL P/B should be > 5, got ${hul?.pb}`);
  assert.ok(hul?.roe != null && hul.roe > 20, `HUL ROE should be > 20%, got ${hul?.roe}`);
  assert.ok(hul?.roce != null && hul.roce > 20, `HUL ROCE should be > 20%, got ${hul?.roce}`);
  assert.ok(hul?.debtToEquity != null && hul.debtToEquity < 0.1, `HUL D/E should be < 0.1, got ${hul?.debtToEquity}`);

  // 9. Financial Statement Expandable Schedules & Sub-Rows Check (+ / − breakdown)
  assert.ok(itc.quarterlyFinancials?.rows, 'Quarterly financials rows should be defined');
  const qSales = itc.quarterlyFinancials.rows.find(r => r.metric.toLowerCase().includes('sales'));
  assert.ok(qSales?.isExpandable, 'Quarterly Sales should be expandable');
  assert.ok(qSales?.subRows && qSales.subRows.length >= 1, 'Quarterly Sales should have subRows');
  assert.equal(qSales.subRows[0].metric, 'YOY Sales Growth %', 'First subRow of Sales should be YOY Sales Growth %');
  assert.equal(qSales.subRows[0].unit, '%', 'YOY Sales Growth % unit should be %');

  const qExpenses = itc.quarterlyFinancials.rows.find(r => r.metric.toLowerCase().includes('expenses'));
  assert.ok(qExpenses?.isExpandable, 'Quarterly Expenses should be expandable');
  assert.ok(qExpenses?.subRows && qExpenses.subRows.length >= 2, 'Quarterly Expenses should have Material Cost % and Employee Cost %');
  const qMaterial = qExpenses?.subRows?.find(sr => sr.metric.toLowerCase().includes('material cost'));
  const qEmployee = qExpenses?.subRows?.find(sr => sr.metric.toLowerCase().includes('employee cost'));
  assert.ok(qMaterial, 'Quarterly Expenses should contain Material Cost %');
  assert.ok(qEmployee, 'Quarterly Expenses should contain Employee Cost %');

  const qOtherInc = itc.quarterlyFinancials.rows.find(r => r.metric.toLowerCase().includes('other income'));
  assert.ok(qOtherInc?.isExpandable, 'Other Income should be expandable');
  assert.ok(qOtherInc?.subRows && qOtherInc.subRows.length >= 1, 'Other Income should have subRows');

  const qNetProf = itc.quarterlyFinancials.rows.find(r => r.metric.toLowerCase().includes('net profit'));
  assert.ok(qNetProf?.isExpandable, 'Net Profit should be expandable');
  assert.ok(qNetProf?.subRows && qNetProf.subRows.length >= 1, 'Net Profit should have subRows');

  const bsFixedAssets = itc.balanceSheet?.rows?.find(r => r.metric.toLowerCase().includes('fixed assets'));
  assert.ok(bsFixedAssets?.isExpandable && bsFixedAssets?.subRows && bsFixedAssets.subRows.length >= 3, 'Fixed Assets should have schedule breakdown subRows');

  const cfOperating = itc.cashFlow?.rows?.find(r => r.metric.toLowerCase().includes('cash from operating activity'));
  assert.ok(cfOperating?.isExpandable && cfOperating?.subRows && cfOperating.subRows.length >= 2, 'Operating Cash Flow should have schedule breakdown subRows');
});
