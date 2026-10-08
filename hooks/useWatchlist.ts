'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'portfolio_watchlist_symbols';
const DEFAULT_WATCHLIST = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ITC'];
const EVENT_NAME = 'portfolio-watchlist-change';

let memoryWatchlist: string[] | null = null;

function getStoredWatchlist(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First time initialization
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WATCHLIST));
      return DEFAULT_WATCHLIST;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).replace(/\.(NS|BO)$/i, '').toUpperCase());
    }
    return DEFAULT_WATCHLIST;
  } catch (e) {
    console.warn('[useWatchlist] Failed to read from localStorage:', e);
    return DEFAULT_WATCHLIST;
  }
}

function saveWatchlist(symbols: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const clean = Array.from(new Set(symbols.map((s) => s.replace(/\.(NS|BO)$/i, '').toUpperCase())));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clean }));
  } catch (e) {
    console.warn('[useWatchlist] Failed to save to localStorage:', e);
  }
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
  };
}

export function useWatchlist() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const rawList = useSyncExternalStore(
    subscribe,
    () => {
      const stored = getStoredWatchlist();
      return JSON.stringify(stored);
    },
    () => JSON.stringify(DEFAULT_WATCHLIST)
  );

  const watchlist: string[] = isClient ? JSON.parse(rawList) : DEFAULT_WATCHLIST;

  const isInWatchlist = useCallback(
    (symbol: string) => {
      if (!symbol) return false;
      const clean = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
      return watchlist.includes(clean);
    },
    [watchlist]
  );

  const addToWatchlist = useCallback(
    (symbol: string): boolean => {
      if (!symbol) return false;
      const clean = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
      if (watchlist.includes(clean)) return false;
      const updated = [clean, ...watchlist];
      saveWatchlist(updated);
      return true;
    },
    [watchlist]
  );

  const removeFromWatchlist = useCallback(
    (symbol: string) => {
      if (!symbol) return;
      const clean = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
      const updated = watchlist.filter((s) => s !== clean);
      saveWatchlist(updated);
    },
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    (symbol: string): boolean => {
      if (!symbol) return false;
      const clean = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
      if (watchlist.includes(clean)) {
        removeFromWatchlist(clean);
        return false;
      } else {
        addToWatchlist(clean);
        return true;
      }
    },
    [watchlist, addToWatchlist, removeFromWatchlist]
  );

  const clearWatchlist = useCallback(() => {
    saveWatchlist([]);
  }, []);

  const resetToDefault = useCallback(() => {
    saveWatchlist(DEFAULT_WATCHLIST);
  }, []);

  return {
    watchlist,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
    resetToDefault,
    count: watchlist.length,
    isClient,
  };
}
