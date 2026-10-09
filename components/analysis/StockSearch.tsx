'use client';

import { useState, useCallback } from 'react';
import { Search, X, TrendingUp, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
}

async function searchStocks(q: string): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}&limit=8`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    symbol: r.symbol,
    name: r.name || r.symbol,
    exchange: r.exchange || 'NSE',
    sector: r.sector,
  }));
}

interface StockSearchBarProps {
  initialValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function StockSearchBar({
  initialValue = '',
  placeholder = 'Search company by symbol or name...',
  autoFocus = false,
}: StockSearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['stock-search-research', query],
    queryFn: () => searchStocks(query),
    enabled: query.trim().length >= 1,
    staleTime: 30 * 1000,
    placeholderData: [],
  });

  const navigate = useCallback((symbol: string) => {
    setQuery('');
    setIsFocused(false);
    router.push(`/stock-analysis/${symbol}`);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(query.trim().toUpperCase());
    }
    if (e.key === 'Escape') {
      setQuery('');
      setIsFocused(false);
    }
  }, [query, navigate]);

  const showDropdown = isFocused && query.trim().length > 0;
  const showResults = query.trim().length >= 1 && results.length > 0;

  return (
    <div className="relative w-full max-w-xl">
      <div className={cn(
        'flex items-center gap-2 rounded-xl border bg-white/[0.04] px-3 py-2.5 transition-all',
        isFocused ? 'border-blue-500/40 bg-white/[0.06] shadow-lg shadow-blue-500/5' : 'border-white/10 hover:border-white/20'
      )}>
        {isLoading && query.trim().length > 0 ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <input
          type="text"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          id="research-stock-search"
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && isFocused && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-white/10 bg-[hsl(222_47%_13%)] shadow-xl shadow-black/30 overflow-hidden">
          {isLoading && query.trim().length >= 1 && results.length === 0 && (
            <div className="flex items-center justify-center p-4 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Searching companies...</span>
            </div>
          )}
          {showResults && (
            <div className="p-1">
              {results.map(r => (
                <button
                  key={r.symbol}
                  onMouseDown={() => navigate(r.symbol)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{r.symbol}</p>
                      <span className="text-[10px] text-muted-foreground/50 border border-white/10 px-1.5 py-0.5 rounded">
                        {r.exchange}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                    {r.sector && <p className="text-[10px] text-muted-foreground/50 truncate">{r.sector}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 1 && !isLoading && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
              <button
                onMouseDown={() => navigate(query.trim().toUpperCase())}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Open research for {query.trim().toUpperCase()} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
