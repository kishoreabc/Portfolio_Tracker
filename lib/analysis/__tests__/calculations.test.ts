import test from 'node:test';
import assert from 'node:assert/strict';

import {
  safeDivide,
  safeRound,
  percentageChange,
  cagr,
  formatIndianCurrency,
  formatPct,
  formatRatio,
  formatMarketCap,
  formatPrice,
  calcRoe,
  calcRoce,
  calcFcf,
  clampPct,
} from '../calculations.ts';

test('safeDivide handles valid and edge cases', () => {
  assert.equal(safeDivide(10, 2), 5);
  assert.equal(safeDivide(10, 0), null);
  assert.equal(safeDivide(null, 5), null);
  assert.equal(safeDivide(5, null), null);
  assert.equal(safeDivide(NaN, 5), null);
  assert.equal(safeDivide(5, Infinity), null);
});

test('safeRound rounds properly and handles invalid inputs', () => {
  assert.equal(safeRound(12.3456, 2), 12.35);
  assert.equal(safeRound(12.3, 2), 12.3);
  assert.equal(safeRound(null), null);
  assert.equal(safeRound(NaN), null);
});

test('percentageChange computes delta and avoids division by zero', () => {
  assert.equal(percentageChange(120, 100), 20);
  assert.equal(percentageChange(80, 100), -20);
  assert.equal(percentageChange(100, 0), null);
  assert.equal(percentageChange(null, 100), null);
});

test('cagr computes compound growth rates accurately', () => {
  // 100 to 200 in 3 years => (2^(1/3) - 1) * 100 ≈ 25.99%
  const result = cagr(100, 200, 3);
  assert.ok(result !== null);
  assert.ok(Math.abs(result - 25.99) < 0.1);

  // Invalid cases
  assert.equal(cagr(0, 100, 3), null);
  assert.equal(cagr(-10, 100, 3), null);
  assert.equal(cagr(100, -10, 3), null);
  assert.equal(cagr(100, 200, 0), null);
});

test('formatting functions render Indian market figures properly', () => {
  assert.equal(formatPrice(3391.5), '₹3,391.50');
  assert.equal(formatPrice(null), 'N/A');

  // ₹3,01,154 Cr
  assert.equal(formatMarketCap(301154e7), '₹3.01L Cr');
  assert.equal(formatMarketCap(5000e7), '₹5K Cr');
  assert.equal(formatMarketCap(null), 'N/A');

  assert.equal(formatPct(29.5), '29.5%');
  assert.equal(formatPct(null), 'N/A');

  assert.equal(formatRatio(86.8), '86.8x');
  assert.equal(formatRatio(null), 'N/A');
});

test('calcRoe and calcRoce compute return ratios safely', () => {
  assert.equal(calcRoe(3496, 11802), 29.62);
  assert.equal(calcRoe(100, 0), null);
  assert.equal(calcRoe(100, -50), null);

  assert.equal(calcRoce(5229, 22350), 23.4);
  assert.equal(calcRoce(null, 100), null);
});

test('calcFcf computes free cash flow', () => {
  assert.equal(calcFcf(1824, 600), 1224);
  assert.equal(calcFcf(1824, -600), 1224);
  assert.equal(calcFcf(null, 600), null);
});

test('clampPct confines percentage values to [0, 100]', () => {
  assert.equal(clampPct(52.9), 52.9);
  assert.equal(clampPct(-5), 0);
  assert.equal(clampPct(120), 100);
  assert.equal(clampPct(null), null);
});
