import { getSpreadsheetMetadata } from './client';
import type { SheetTab } from '@/types/sheets';

/** Known tab name synonyms — order matters (most specific first) */
const TAB_SYNONYMS: Record<string, string[]> = {
  equity: ['equity folio', 'equity', 'stocks', 'equities'],
  bonds: ['bond folio', 'bonds', 'bond', 'fixed income'],
  portfolio: ['portfolio', 'allocation', 'summary'],
  transactions: ['daily transaction', 'transactions', 'daily', 'cashflow', 'cash flow'],
};

export async function discoverTabs(): Promise<{
  tabs: SheetTab[];
  matched: Record<string, SheetTab>;
}> {
  const meta = await getSpreadsheetMetadata();
  const tabs: SheetTab[] = meta.sheets.map((s) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
    index: s.properties.index,
  }));

  const matched: Record<string, SheetTab> = {};

  for (const [key, synonyms] of Object.entries(TAB_SYNONYMS)) {
    const found = tabs.find((tab) =>
      synonyms.some((syn) => tab.title.toLowerCase().includes(syn))
    );
    if (found) matched[key] = found;
  }

  return { tabs, matched };
}
