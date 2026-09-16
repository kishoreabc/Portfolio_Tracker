'use client';

import { createContext, useContext, useCallback, ReactNode, useSyncExternalStore } from 'react';

export const PRIVACY_MASK = '••••••';
const STORAGE_KEY = 'portfolio-privacy-mode';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('portfolio-privacy-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('portfolio-privacy-change', callback);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

interface PrivacyContextValue {
  isHidden: boolean;
  togglePrivacy: () => void;
  setHidden: (hidden: boolean) => void;
  maskAmount: (val: string | number, fallback?: string) => string;
  maskText: (text: string, context?: { holdingCounts?: number[] }) => string;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isHidden: false,
  togglePrivacy: () => {},
  setHidden: () => {},
  maskAmount: (val) => String(val),
  maskText: (text) => text,
});

/**
 * Masks sensitive portfolio monetary amounts, currency strings, and specific portfolio holding counts
 * in arbitrary text (such as AI-generated commentary, insights, descriptions, or rationale).
 */
export function maskSensitiveText(
  text: string,
  isHidden: boolean = true,
  context?: { holdingCounts?: number[] }
): string {
  if (!text || !isHidden || typeof text !== 'string') return text;

  let result = text;

  // 1. Currency amounts with symbols (₹, Rs., INR, $) and optional Indian/standard units (L, Lakh, Cr, Crore, K, etc.)
  result = result.replace(
    /(?:₹|Rs\.?|INR|\$)\s*[\d,]+(?:\.\d+)?(?:\s*(?:[Ll]akh(?:s)?|[Cc]rore(?:s)?|[Cc]r|[Ll]|[Kk]|[Mm]|[Bb]))?/g,
    PRIVACY_MASK
  );

  // 2. Standalone Indian denominations without currency symbols (e.g., "2.84L", "2.84 Lakh", "2.84 Cr")
  result = result.replace(
    /\b[\d,]+(?:\.\d+)?\s*(?:[Ll]akh(?:s)?|[Cc]rore(?:s)?|[Cc]r|[Ll])\b/g,
    PRIVACY_MASK
  );

  // 3. Numbers explicitly following financial keywords (e.g. "net worth of 2,84,000", "portfolio of 2,84,000")
  result = result.replace(
    /\b(net worth|portfolio value|portfolio|worth|valued at|invested|investment|expenses|savings|capital)(\s+(?:of|is|at)?\s*)(?:(?:₹|Rs\.?|INR|\$)\s*)?[\d,]+(?:\.\d+)?(?:\s*(?:[Ll]akh(?:s)?|[Cc]rore(?:s)?|[Cc]r|[Ll]|[Kk]|[Mm]|[Bb]))?/gi,
    `$1$2${PRIVACY_MASK}`
  );

  // 4. Specific user portfolio holding counts (e.g., 23 holdings, 18 stocks, 5 bonds)
  if (context?.holdingCounts?.length) {
    for (const count of context.holdingCounts) {
      if (typeof count === 'number' && count > 0) {
        const regex = new RegExp(`\\b${count}(\\s+(?:holdings|instruments|stocks|equities|bonds)\\b)`, 'gi');
        result = result.replace(regex, `${PRIVACY_MASK}$1`);
      }
    }
  }

  // 5. Contextual current portfolio holding counts (e.g. "has 23 holdings", "consolidating the 23 holdings", "Holding 23 instruments")
  result = result.replace(
    /\b(the|has|across|for a|holding)\s+(\d+)\s+(holdings|instruments)\b/gi,
    `$1 ${PRIVACY_MASK} $3`
  );

  return result;
}

/**
 * Deeply traverses an insights data structure (object, array, or string) and masks
 * any string containing sensitive portfolio numbers when isHidden is true.
 */
export function maskInsightsData<T>(
  data: T,
  isHidden: boolean = true,
  context?: { holdingCounts?: number[] }
): T {
  if (!data || !isHidden) return data;

  if (typeof data === 'string') {
    return maskSensitiveText(data, isHidden, context) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskInsightsData(item, isHidden, context)) as unknown as T;
  }

  if (typeof data === 'object' && data !== null) {
    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        cloned[key] = maskSensitiveText(value, isHidden, context);
      } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        cloned[key] = maskInsightsData(value, isHidden, context);
      } else {
        cloned[key] = value;
      }
    }
    return cloned as unknown as T;
  }

  return data;
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const isHidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePrivacy = useCallback(() => {
    const current = getSnapshot();
    const next = !current;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new Event('portfolio-privacy-change'));
    } catch {
      // ignore
    }
  }, []);

  const setHidden = useCallback((hidden: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hidden));
      window.dispatchEvent(new Event('portfolio-privacy-change'));
    } catch {
      // ignore
    }
  }, []);

  const maskAmount = useCallback(
    (val: string | number, fallback: string = PRIVACY_MASK): string => {
      if (isHidden) {
        return fallback;
      }
      return typeof val === 'number' ? String(val) : val;
    },
    [isHidden]
  );

  const maskText = useCallback(
    (text: string, context?: { holdingCounts?: number[] }): string => {
      return maskSensitiveText(text, isHidden, context);
    },
    [isHidden]
  );

  return (
    <PrivacyContext.Provider
      value={{
        isHidden,
        togglePrivacy,
        setHidden,
        maskAmount,
        maskText,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
