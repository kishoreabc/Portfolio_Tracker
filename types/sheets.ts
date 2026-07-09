export type RawCellValue = string | number | null | undefined;
export type RawRow = RawCellValue[];
export type RawSheet = RawRow[];

export type CellType = 'string' | 'number' | 'currency' | 'percent' | 'date';

export interface SheetTab {
  title: string;
  sheetId: number;
  index: number;
}

export interface ColumnMeta {
  rawHeader: string;
  normalizedKey: string;
  type: CellType;
  index: number;
}

export interface ParsedSheet {
  tabName: string;
  headerRowIndex: number;
  columns: ColumnMeta[];
  rows: Record<string, RawCellValue>[];
  primaryKeyColumn?: string;
}

export interface SheetsApiResponse {
  equity: ParsedSheet | null;
  bonds: ParsedSheet | null;
  portfolio: ParsedSheet | null;
  transactions: ParsedSheet | null;
  meta: {
    lastFetched: string;
    tabs: SheetTab[];
    errors: string[];
  };
}
