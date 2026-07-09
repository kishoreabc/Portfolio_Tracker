/**
 * Google Sheets API v4 low-level client.
 * All calls are server-side only — the API key never reaches the browser.
 */

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function getEnv() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID env var not set');
  if (!apiKey) throw new Error('GOOGLE_SHEETS_API_KEY env var not set');
  return { sheetId, apiKey };
}

/** Returns the spreadsheet metadata (including all sheet tab names/ids). */
export async function getSpreadsheetMetadata() {
  const { sheetId, apiKey } = getEnv();
  const url = `${BASE}/${sheetId}?key=${apiKey}&fields=sheets.properties`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets metadata fetch failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<{
    sheets: { properties: { title: string; sheetId: number; index: number } }[];
  }>;
}

/** Returns raw cell values for a named range / sheet tab. */
export async function getSheetValues(sheetName: string): Promise<string[][]> {
  const { sheetId, apiKey } = getEnv();
  const encodedRange = encodeURIComponent(sheetName);
  const url = `${BASE}/${sheetId}/values/${encodedRange}?key=${apiKey}&valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets values fetch failed for "${sheetName}" (${res.status}): ${err}`);
  }
  const json = await res.json() as { values?: string[][] };
  return json.values ?? [];
}
