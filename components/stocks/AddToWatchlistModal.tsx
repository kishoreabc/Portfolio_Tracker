'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check, X, Sparkles, Building2, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { EquityHolding } from '@/types/holdings';

interface SearchResultItem {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
}

interface AddToWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings?: EquityHolding[];
}

export function AddToWatchlistModal({ isOpen, onClose, holdings = [] }: AddToWatchlistModalProps) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentAction, setRecentAction] = useState<{ symbol: string; action: 'added' | 'removed' } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuery('');
      setRecentAction(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  // Popular benchmark stock suggestions fetched dynamically from official API
  const [popularBenchmarkStocks, setPopularBenchmarkStocks] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    if (isOpen && popularBenchmarkStocks.length === 0) {
      fetch('/api/stocks/search')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.results)) {
            setPopularBenchmarkStocks(data.results.slice(0, 12));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, popularBenchmarkStocks.length]);

  // Holdings not yet in watchlist
  const unmonitoredHoldings = useMemo(() => {
    return holdings.filter((h) => !isInWatchlist(h.ticker)).slice(0, 6);
  }, [holdings, isInWatchlist]);

  const handleToggle = useCallback(
    (symbol: string, name?: string) => {
      const inWatch = isInWatchlist(symbol);
      if (inWatch) {
        removeFromWatchlist(symbol);
        setRecentAction({ symbol, action: 'removed' });
      } else {
        addToWatchlist(symbol);
        setRecentAction({ symbol, action: 'added' });
      }
      setTimeout(() => setRecentAction(null), 2500);
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-[#0f172a] border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-5 pb-3 border-b border-border/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Add to Watchlist</h3>
                  <p className="text-xs text-muted-foreground">Search and track any stock with live market quotes</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-border/30 bg-card/40 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="watchlist-search-input"
                  autoFocus
                  placeholder="Search by stock symbol or company name (e.g. RELIANCE, TCS)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-9 h-11 text-sm bg-surface-200/50 border-border/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-xl placeholder:text-muted-foreground/70"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    aria-label="Clear input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Notification Toast */}
            {recentAction && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`px-4 py-2 text-xs font-medium flex items-center gap-2 shrink-0 ${
                  recentAction.action === 'added'
                    ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-300 border-b border-amber-500/20'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {recentAction.action === 'added' ? 'Added' : 'Removed'}{' '}
                <span className="font-bold">{recentAction.symbol}</span>{' '}
                {recentAction.action === 'added' ? 'to your watchlist' : 'from your watchlist'}
              </motion.div>
            )}

            {/* Modal Body / Scrollable Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* If user is typing query */}
              {query.trim().length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Search Results ({searchResults.length})
                  </p>

                  {isSearching && (
                    <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
                      <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
                      Searching market tickers…
                    </div>
                  )}

                  {!isSearching && searchResults.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground bg-card/30 rounded-xl border border-dashed border-border/40 p-4">
                      <p>No matches found for &ldquo;{query}&rdquo;.</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">Try searching by company name or NSE/BSE symbol</p>
                    </div>
                  )}

                  {searchResults.map((item) => {
                    const inWatch = isInWatchlist(item.symbol);
                    return (
                      <div
                        key={item.symbol}
                        className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/40 hover:border-border/80 hover:bg-card/90 transition-all"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">
                              {item.symbol}
                            </span>
                            <span className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>{item.exchange || 'NSE'}</span>
                            {item.sector && (
                              <>
                                <span>·</span>
                                <span>{item.sector}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleToggle(item.symbol, item.name)}
                          className={`h-8 text-xs font-medium shrink-0 ${
                            inWatch
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {inWatch ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1" /> Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* Holdings suggestions */}
                  {unmonitoredHoldings.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        From Your Portfolio
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unmonitoredHoldings.map((h) => (
                          <div
                            key={h.ticker}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-card/60 border border-border/40 hover:border-border/80 transition-all"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-mono text-xs font-bold text-blue-400 truncate">{h.ticker}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{h.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggle(h.ticker, h.name)}
                              className="h-7 px-2 text-xs bg-white/5 hover:bg-blue-600 hover:text-white border-border/60 shrink-0"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Indian Equities */}
                  {popularBenchmarkStocks.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Popular Market Equities (NIFTY 50)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {popularBenchmarkStocks.map((stock) => {
                          const inWatch = isInWatchlist(stock.symbol);
                          return (
                            <button
                              key={stock.symbol}
                              onClick={() => handleToggle(stock.symbol, stock.name)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                inWatch
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                                  : 'bg-surface-200/60 hover:bg-surface-200 text-muted-foreground hover:text-foreground border border-border/40'
                              }`}
                            >
                              {inWatch ? (
                                <Check className="w-3 h-3 text-amber-400" />
                              ) : (
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="font-mono font-semibold">{stock.symbol}</span>
                              {stock.sector && (
                                <span className="text-[10px] opacity-75 hidden sm:inline">({stock.sector})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-5 border-t border-border/40 bg-card/30 flex items-center justify-between text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Live prices fetch automatically from NSE/BSE
              </span>
              <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-xs">
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
