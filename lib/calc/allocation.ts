import type { EquityHolding, SectorAllocation, AssetClassSummary } from '@/types/holdings';
import type { BondHolding } from '@/types/bonds';

const GOLD_SECTOR_KEYWORDS = ['precious metal', 'gold', 'silver', 'bullion'];

function isGoldSector(sector: string): boolean {
  const s = sector.toLowerCase();
  return GOLD_SECTOR_KEYWORDS.some((kw) => s.includes(kw));
}

export function computeAssetAllocation(
  equity: EquityHolding[],
  bonds: BondHolding[]
): AssetClassSummary[] {
  const goldTotal = equity
    .filter((h) => isGoldSector(h.sector))
    .reduce((s, h) => s + h.currentValue, 0);

  const equityTotal = equity
    .filter((h) => !isGoldSector(h.sector))
    .reduce((s, h) => s + h.currentValue, 0);

  const bondTotal = bonds.reduce((s, b) => s + b.totalValue, 0);
  const total = equityTotal + bondTotal + goldTotal;

  if (total === 0) return [];

  const result: AssetClassSummary[] = [
    {
      label: 'Equity',
      value: equityTotal,
      percent: equityTotal / total,
      color: 'hsl(221, 83%, 53%)',
    },
    {
      label: 'Bonds',
      value: bondTotal,
      percent: bondTotal / total,
      color: 'hsl(142, 71%, 45%)',
    },
  ];

  if (goldTotal > 0) {
    result.push({
      label: 'Gold',
      value: goldTotal,
      percent: goldTotal / total,
      color: 'hsl(43, 96%, 56%)',
    });
  }

  return result;
}

export function computeSectorAllocation(
  equity: EquityHolding[],
  bonds: BondHolding[]
): SectorAllocation[] {
  const sectorMap = new Map<string, SectorAllocation>();

  for (const h of equity) {
    const s = h.sector || 'Unknown';
    const existing = sectorMap.get(s) ?? {
      sector: s, equityValue: 0, bondValue: 0, totalValue: 0, percent: 0
    };
    existing.equityValue += h.currentValue;
    sectorMap.set(s, existing);
  }

  for (const b of bonds) {
    const s = b.sector || 'Unknown';
    const existing = sectorMap.get(s) ?? {
      sector: s, equityValue: 0, bondValue: 0, totalValue: 0, percent: 0
    };
    existing.bondValue += b.totalValue;
    sectorMap.set(s, existing);
  }

  const total = Array.from(sectorMap.values()).reduce(
    (s, a) => s + a.equityValue + a.bondValue, 0
  );

  return Array.from(sectorMap.values())
    .map((a) => ({
      ...a,
      totalValue: a.equityValue + a.bondValue,
      percent: total > 0 ? (a.equityValue + a.bondValue) / total : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
}

export function computeOverallAllocation(
  equity: EquityHolding[],
  bonds: BondHolding[]
): AssetClassSummary[] {
  let bondTotal = 0;
  let goldTotal = 0;
  const sectors = new Map<string, number>();

  bonds.forEach((b) => {
    bondTotal += b.totalValue;
  });

  equity.forEach((h) => {
    if (isGoldSector(h.sector)) {
      goldTotal += h.currentValue;
    } else {
      const s = h.sector || 'Others';
      sectors.set(s, (sectors.get(s) || 0) + h.currentValue);
    }
  });

  const total =
    bondTotal +
    goldTotal +
    Array.from(sectors.values()).reduce((a, b) => a + b, 0);

  if (total === 0) return [];

  const result: AssetClassSummary[] = [];

  // Use similar colors to the user's screenshot
  const sectorColors: Record<string, string> = {
    Finance: 'hsl(217, 91%, 60%)', // Blue
    Pharmaceuticals: 'hsl(8, 76%, 53%)', // Red
    Automotive: 'hsl(45, 93%, 47%)', // Yellow
    FMCG: 'hsl(142, 71%, 45%)', // Green
    IT: 'hsl(24, 98%, 50%)', // Orange
    Others: 'hsl(190, 90%, 50%)', // Light blue
  };

  if (bondTotal > 0) {
    // In screenshot, Bonds are light red/salmon
    result.push({
      label: 'Bonds',
      value: bondTotal,
      percent: bondTotal / total,
      color: 'hsl(3, 85%, 65%)',
    });
  }
  
  let colorIndex = 0;
  const fallbackColors = [
    'hsl(280, 65%, 60%)',
    'hsl(340, 82%, 52%)',
    'hsl(160, 84%, 39%)',
    'hsl(20, 90%, 60%)',
  ];

  Array.from(sectors.entries()).forEach(([sector, value]) => {
    let c = sectorColors[sector];
    if (!c) {
      c = fallbackColors[colorIndex % fallbackColors.length];
      colorIndex++;
    }
    result.push({
      label: sector,
      value,
      percent: value / total,
      color: c,
    });
  });

  if (goldTotal > 0) {
    // Gold color
    result.push({
      label: 'Gold',
      value: goldTotal,
      percent: goldTotal / total,
      color: 'hsl(43, 40%, 60%)',
    });
  }

  return result.sort((a, b) => b.value - a.value);
}
