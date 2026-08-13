/**
 * Language detection for Tamil vs English.
 *
 * Tamil Unicode block: U+0B80 – U+0BFF
 * Detection: if > 10% of characters are Tamil script, classify as Tamil.
 */

const TAMIL_RANGE_START = 0x0b80;
const TAMIL_RANGE_END = 0x0bff;
const TAMIL_THRESHOLD = 0.1; // 10% Tamil chars → classify as Tamil

export type DetectedLanguage = 'ta' | 'en' | 'unknown';

function countTamilChars(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= TAMIL_RANGE_START && code <= TAMIL_RANGE_END) {
      count++;
    }
  }
  return count;
}

/**
 * Detect whether text is Tamil, English, or unknown.
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) return 'unknown';

  const stripped = text.replace(/\s+/g, '');
  if (stripped.length === 0) return 'unknown';

  const tamilCount = countTamilChars(stripped);
  const ratio = tamilCount / stripped.length;

  if (ratio >= TAMIL_THRESHOLD) return 'ta';
  return 'en';
}

/**
 * Returns true if the text is Tamil
 */
export function isTamil(text: string): boolean {
  return detectLanguage(text) === 'ta';
}
