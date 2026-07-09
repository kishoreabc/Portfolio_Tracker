'use client';

import { RefreshCw, Clock, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useRefreshData } from '@/hooks/useRefreshData';

interface TopbarProps {
  lastFetched?: string | null;
  pageTitle?: string;
  apiErrors?: string[];
}

export function Topbar({ lastFetched, pageTitle = 'Dashboard', apiErrors = [] }: TopbarProps) {
  const { refresh, isRefreshing } = useRefreshData();

  const lastFetchedDate = lastFetched ? new Date(lastFetched) : null;
  const isStale = lastFetchedDate
    ? Date.now() - lastFetchedDate.getTime() > 15 * 60 * 1000
    : true;

  return (
    <header className="fixed top-0 right-0 left-0 h-[60px] z-30 flex items-center justify-between px-6 border-b border-white/5"
      style={{ background: 'hsl(222 47% 11% / 0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-3" style={{ paddingLeft: 'var(--sidebar-width, 240px)' }}>
        <h1 className="text-base font-semibold text-white">{pageTitle}</h1>
        {apiErrors.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            {apiErrors.length} data warning{apiErrors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Last sync badge */}
        {lastFetchedDate ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <AnimatePresence mode="wait">
              {isStale ? (
                <motion.div key="stale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                </motion.div>
              ) : (
                <motion.div key="fresh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="animate-live-pulse">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="hidden sm:inline">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatDistanceToNow(lastFetchedDate, { addSuffix: true })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">No data</span>
        )}

        {/* Refresh button */}
        <motion.button
          onClick={refresh}
          disabled={isRefreshing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          aria-label="Refresh data"
          id="refresh-data-btn"
        >
          <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{ repeat: isRefreshing ? Infinity : 0, duration: 0.8, ease: 'linear' }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.div>
          <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
        </motion.button>
      </div>
    </header>
  );
}
