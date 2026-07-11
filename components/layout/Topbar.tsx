'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Clock, Wifi, WifiOff, ALargeSmall } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useRefreshData } from '@/hooks/useRefreshData';

interface TopbarProps {
  lastFetched?: string | null;
  pageTitle?: string;
  apiErrors?: string[];
}

const FONT_STEP = 1;     // px per click
const FONT_MIN  = 11;    // px minimum
const FONT_MAX  = 30;    // px maximum
const FONT_DEFAULT = 18; // px — body/content base
const FONT_DEFAULT_HEADER_REM = 25 / 18; // ≈1.222rem → 22px at default scale
const STORAGE_KEY = 'portfolio-font-size';

function applyFontSize(px: number) {
  document.documentElement.style.fontSize = `${px}px`;
}

export function Topbar({ lastFetched, pageTitle = 'Dashboard', apiErrors = [] }: TopbarProps) {
  const { refresh, isRefreshing } = useRefreshData();

  // ── Online status ──────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initialise from navigator on client
    setIsOnline(navigator.onLine);
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Font size ──────────────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState(FONT_DEFAULT);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const px = saved ? parseInt(saved, 10) : FONT_DEFAULT;
    const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, px));
    setFontSize(clamped);
    applyFontSize(clamped);
  }, []);

  const changeFontSize = useCallback((delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, prev + delta));
      applyFontSize(next);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // ── Staleness ──────────────────────────────────────────────────────────────
  const lastFetchedDate = lastFetched ? new Date(lastFetched) : null;
  const isStale = lastFetchedDate
    ? Date.now() - lastFetchedDate.getTime() > 15 * 60 * 1000
    : true;

  return (
    <header className="fixed top-0 right-0 left-0 h-[60px] z-30 flex items-center justify-between px-6 border-b border-white/5"
      style={{ background: 'hsl(222 47% 11% / 0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-3" style={{ paddingLeft: 'var(--sidebar-width, 240px)' }}>
        <h1 className="font-semibold text-white" style={{ fontSize: `${FONT_DEFAULT_HEADER_REM}rem` }}>{pageTitle}</h1>
        {apiErrors.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            {apiErrors.length} data warning{apiErrors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">

        {/* ── Online / Wifi status ── */}
        <div className="flex items-center gap-1.5 text-xs">
          <AnimatePresence mode="wait">
            {!isOnline ? (
              <motion.div key="offline"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30"
                title="You are offline"
              >
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline text-red-400 font-medium">Offline</span>
              </motion.div>
            ) : isStale ? (
              <motion.div key="stale"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 text-slate-400"
                title="Data may be stale"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                {lastFetchedDate && (
                  <span className="hidden sm:inline">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatDistanceToNow(lastFetchedDate, { addSuffix: true })}
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div key="online"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 text-slate-400 animate-live-pulse"
                title="Data is fresh"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                {lastFetchedDate && (
                  <span className="hidden sm:inline">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatDistanceToNow(lastFetchedDate, { addSuffix: true })}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Refresh button ── disabled when offline ── */}
        <motion.button
          onClick={refresh}
          disabled={isRefreshing || !isOnline}
          whileHover={isOnline ? { scale: 1.05 } : {}}
          whileTap={isOnline ? { scale: 0.95 } : {}}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={!isOnline ? 'Refresh unavailable — you are offline' : 'Refresh data'}
          title={!isOnline ? 'Refresh unavailable while offline' : 'Refresh data from Google Sheets'}
          id="refresh-data-btn"
        >
          <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{ repeat: isRefreshing ? Infinity : 0, duration: 0.8, ease: 'linear' }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.div>
          <span className="hidden sm:inline">
            {!isOnline ? 'Offline' : isRefreshing ? 'Refreshing…' : 'Refresh'}
          </span>
        </motion.button>

        {/* ── Font size controls (right end) ── */}
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-1 py-1"
          title="Adjust font size">
          <ALargeSmall className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <button
            id="font-decrease-btn"
            aria-label="Decrease font size"
            disabled={fontSize <= FONT_MIN}
            onClick={() => changeFontSize(-FONT_STEP)}
            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors select-none"
          >
            A<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>−</sup>
          </button>
          <span className="text-[10px] text-slate-500 tabular-nums w-6 text-center">{fontSize}px</span>
          <button
            id="font-increase-btn"
            aria-label="Increase font size"
            disabled={fontSize >= FONT_MAX}
            onClick={() => changeFontSize(FONT_STEP)}
            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors select-none"
          >
            A<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>+</sup>
          </button>
        </div>

      </div>
    </header>
  );
}
