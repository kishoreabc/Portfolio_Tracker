'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Clock, Wifi, WifiOff, ALargeSmall, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useRefreshData } from '@/hooks/useRefreshData';
import { useSession, signOut } from 'next-auth/react';
import { useSessionWatcher } from '@/components/auth/SessionWatcher';
import { useSidebar } from '@/components/layout/SidebarContext';

interface TopbarProps {
  lastFetched?: string | null;
  pageTitle?: string;
  apiErrors?: string[];
}

const FONT_STEP = 1;     // px per click
const FONT_MIN  = 11;    // px minimum
const FONT_MAX  = 30;    // px maximum
const FONT_DEFAULT = 18; // px — body/content base
const FONT_DEFAULT_HEADER_REM = 36 / 18; // 2rem → 36px at default scale
const STORAGE_KEY = 'portfolio-font-size';

function applyFontSize(px: number) {
  document.documentElement.style.fontSize = `${px}px`;
}

export function Topbar({ lastFetched, pageTitle = 'Dashboard', apiErrors = [] }: TopbarProps) {
  const { refresh, isRefreshing } = useRefreshData();
  const { data: session } = useSession();
  const { totalTimeRemaining } = useSessionWatcher();
  const { toggleMobileSidebar, isCollapsed } = useSidebar();

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
    <header
      className="fixed top-0 right-0 left-0 h-[60px] z-30 flex items-center justify-between px-3 sm:px-6 border-b border-white/5 gap-2"
      style={{ background: 'hsl(222 47% 11% / 0.85)', backdropFilter: 'blur(12px)' }}
    >
      {/* Left: hamburger (mobile) + sidebar offset (desktop) + title */}
      <div
        className={[
          "flex items-center gap-2 min-w-0 transition-[padding-left] duration-300 ease-in-out",
          "pl-0", // mobile
          isCollapsed ? "md:pl-16" : "md:pl-60" // desktop
        ].join(' ')}
      >
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          onClick={toggleMobileSidebar}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-bold text-white leading-[1.2] truncate" style={{ fontSize: `${FONT_DEFAULT_HEADER_REM}rem` }}>
          {pageTitle}
        </h1>
        {apiErrors.length > 0 && (
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
            {apiErrors.length} warning{apiErrors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

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
                  <span className="hidden lg:inline">
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
                  <span className="hidden lg:inline">
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
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* ── Font size controls — hidden on mobile ── */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 ml-1"
          title="Adjust font size">

          <div className="flex items-center gap-1">
            <button
              id="font-decrease-btn"
              aria-label="Decrease font size"
              disabled={fontSize <= FONT_MIN}
              onClick={() => changeFontSize(-FONT_STEP)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/15 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors select-none"
            >
              A-
            </button>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums w-8 text-center">{fontSize}px</span>
            <button
              id="font-increase-btn"
              aria-label="Increase font size"
              disabled={fontSize >= FONT_MAX}
              onClick={() => changeFontSize(FONT_STEP)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/15 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors select-none"
            >
              A+
            </button>
          </div>
        </div>

        {/* ── User Profile ── */}
        {session?.user && (
          <div className="flex items-center gap-2 ml-1 border-l border-white/10 pl-2 sm:pl-4 py-1">
            {/* Name + email — hidden on mobile */}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-semibold text-foreground leading-tight">{session.user.name}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{session.user.email}</span>
            </div>

            {/* Avatar */}
            {session.user.image ? (
              <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs flex-shrink-0">
                {session.user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            {/* Logout + session timer */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  sessionStorage.removeItem('portfolio-session-start');
                  signOut({ callbackUrl: '/login' });
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] uppercase font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              >
                Logout
                <span className="text-[15px] text-slate-200 dark:text-white tabular-nums mt-0.5">
                  {Math.floor(totalTimeRemaining / 60000)}:
                  {Math.floor((totalTimeRemaining % 60000) / 1000).toString().padStart(2, '0')}
                </span>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
