import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import {
  methodNotAllowed,
  privateNoStoreHeaders,
  safeErrorResponse,
  unauthorizedResponse,
} from '@/lib/server/apiHelpers';
import type { ImportResult } from '@/types/orders';

interface NormalizedOrderRow {
  symbol: string;
  order_type: 'BUY' | 'SELL';
  quantity: number;
  value: number;
  executed_at: string;
}

/**
 * Parses execution date from orderbook formats:
 * - "2025-07-25T12:03:47" (ISO timestamp)
 * - "18-11-2024 09:00 AM" (DD-MM-YYYY HH:mm A)
 * - Excel numeric date codes
 * - Standard ISO or Date objects
 */
function parseExecutionDate(val: unknown): string | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString();
  }

  if (typeof val === 'number') {
    try {
      const d = xlsx.SSF.parse_date_code(val);
      if (d) {
        return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.round(d.S || 0))).toISOString();
      }
    } catch {}
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Match "DD-MM-YYYY HH:mm A"
    const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      const [, dd, mm, yyyy, hh, min, ap] = match;
      let hours = parseInt(hh, 10);
      if (ap.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ap.toUpperCase() === 'AM' && hours === 12) hours = 0;
      const d = new Date(Date.UTC(
        parseInt(yyyy, 10),
        parseInt(mm, 10) - 1,
        parseInt(dd, 10),
        hours,
        parseInt(min, 10)
      ));
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

/**
 * Extracts and normalizes order rows from a workbook (e.g. tradebook-IAZ967-EQ.xlsx)
 * Expects the 5 essential columns:
 * - Symbol
 * - Type (BUY/SELL)
 * - Quantity
 * - Value
 * - Execution date and time
 */
function extractOrdersFromWorkbook(wb: xlsx.WorkBook): { rows: NormalizedOrderRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: NormalizedOrderRow[] = [];

  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    errors.push('The uploaded Excel workbook contains no sheets.');
    return { rows, errors };
  }

  const sheet = wb.Sheets[firstSheetName];
  const sheetRows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  // Locate header row by looking for Symbol and Type
  const headerIdx = sheetRows.findIndex(
    (r) =>
      Array.isArray(r) &&
      r.some((c) => typeof c === 'string' && /symbol/i.test(c)) &&
      r.some((c) => typeof c === 'string' && /type/i.test(c))
  );

  if (headerIdx === -1) {
    errors.push('Could not find header row with "Symbol" and "Type" columns in the sheet.');
    return { rows, errors };
  }

  const header = (sheetRows[headerIdx] as unknown[]).map((c) => String(c ?? '').trim().toLowerCase());

  // Find column indices
  const colSymbol = header.findIndex((c) => c === 'symbol' || c.includes('ticker'));
  const colType = header.findIndex((c) => c === 'type' || c.includes('order type') || c.includes('trade type'));
  const colQty = header.findIndex((c) => c === 'quantity' || c === 'qty');
  const colValue = header.findIndex((c) => c === 'value' || c.includes('order value') || c.includes('amount'));
  const colDate = header.findIndex((c) => c.includes('execution') || c.includes('date') || c.includes('time'));

  if (colSymbol === -1 || colType === -1 || colQty === -1 || colValue === -1) {
    errors.push('Missing essential columns (Symbol, Type, Quantity, or Value) in header row.');
    return { rows, errors };
  }

  const dataRows = sheetRows.slice(headerIdx + 1);

  dataRows.forEach((r, idx) => {
    if (!Array.isArray(r) || r.length === 0) return;

    const symbolRaw = colSymbol !== -1 ? r[colSymbol] : null;
    if (!symbolRaw) return; // Skip empty rows

    const symbol = String(symbolRaw).trim().toUpperCase();
    const typeRaw = colType !== -1 ? String(r[colType]).trim().toUpperCase() : '';
    const orderType: 'BUY' | 'SELL' = typeRaw === 'SELL' ? 'SELL' : 'BUY';

    const quantity = colQty !== -1 ? Number(r[colQty]) : 0;
    const value = colValue !== -1 ? Number(r[colValue]) : 0;
    const executedAt = colDate !== -1 ? parseExecutionDate(r[colDate]) : null;

    if (!executedAt) {
      errors.push(`Row ${idx + 1} (${symbol}): Invalid or missing execution date "${r[colDate]}".`);
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Row ${idx + 1} (${symbol}): Invalid quantity ${quantity}.`);
      return;
    }

    if (isNaN(value) || value < 0) {
      errors.push(`Row ${idx + 1} (${symbol}): Invalid value ${value}.`);
      return;
    }

    rows.push({
      symbol,
      order_type: orderType,
      quantity,
      value,
      executed_at: executedAt,
    });
  });

  return { rows, errors };
}

/**
 * POST /api/orders/import
 * Imports order history from an uploaded Excel (.xlsx/.xls) or CSV file or a local filepath.
 * Deduplicates against existing records using composite key (symbol, order_type, quantity, value, executed_at).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  try {
    let fileBuffer: Buffer | null = null;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: 'No file uploaded. Expected multipart form-data with "file" key.' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      const targetPath = body.filePath || '../tradebook-IAZ967-EQ.xlsx';
      const resolvedPath = path.resolve(targetPath);

      if (!fs.existsSync(resolvedPath)) {
        // Fallback check in parent or current dir
        const fallback1 = path.resolve('../tradebook-IAZ967-EQ.xlsx');
        const fallback2 = path.resolve('tradebook-IAZ967-EQ.xlsx');
        if (fs.existsSync(fallback1)) {
          fileBuffer = fs.readFileSync(fallback1);
        } else if (fs.existsSync(fallback2)) {
          fileBuffer = fs.readFileSync(fallback2);
        } else {
          return NextResponse.json(
            { error: `Orderbook file not found at: ${targetPath}` },
            { status: 404 }
          );
        }
      } else {
        fileBuffer = fs.readFileSync(resolvedPath);
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 400 }
      );
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: 'File content is empty.' }, { status: 400 });
    }

    // Parse workbook
    const wb = xlsx.read(fileBuffer, { type: 'buffer' });
    const { rows: candidateRows, errors: parseErrors } = extractOrdersFromWorkbook(wb);

    if (candidateRows.length === 0) {
      return NextResponse.json<ImportResult>(
        {
          imported: 0,
          skipped: 0,
          errors: parseErrors.length ? parseErrors : ['No valid order rows found in the sheet.'],
        },
        { status: 400 }
      );
    }

    // Deduplication check using Supabase
    // Fetch composite 5-tuple columns to detect existing orders
    const { data: existingRecords, error: fetchErr } = await supabase
      .from('orders')
      .select('symbol, order_type, quantity, value, executed_at');

    if (fetchErr) {
      throw new Error(`Failed to query existing orders: ${fetchErr.message}`);
    }

    const existingCompositeSet = new Set<string>();
    (existingRecords ?? []).forEach((r) => {
      if (r.symbol && r.executed_at) {
        const iso = new Date(r.executed_at).toISOString();
        existingCompositeSet.add(`${r.symbol}|${r.order_type}|${Number(r.quantity)}|${Number(r.value)}|${iso}`);
      }
    });

    // Filter out already imported orders and in-file duplicates
    const seenInBatch = new Set<string>();
    const rowsToInsert: NormalizedOrderRow[] = [];
    let duplicateCount = 0;

    for (const row of candidateRows) {
      const compKey = `${row.symbol}|${row.order_type}|${Number(row.quantity)}|${Number(row.value)}|${row.executed_at}`;
      if (existingCompositeSet.has(compKey) || seenInBatch.has(compKey)) {
        duplicateCount++;
      } else {
        seenInBatch.add(compKey);
        rowsToInsert.push(row);
      }
    }

    // Batch insert new records (chunked by 100 to avoid payload size limits)
    let importedCount = 0;
    const chunkSize = 100;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase
        .from('orders')
        .insert(chunk);

      if (insertErr) {
        throw new Error(`Failed to insert order batch (${i}-${i + chunk.length}): ${insertErr.message}`);
      }
      importedCount += chunk.length;
    }

    const result: ImportResult = {
      imported: importedCount,
      skipped: duplicateCount,
      errors: parseErrors,
    };

    return NextResponse.json(result, {
      status: 200,
      headers: privateNoStoreHeaders,
    });
  } catch (err) {
    return safeErrorResponse('api/orders/import', err, 'Failed to import order history');
  }
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
