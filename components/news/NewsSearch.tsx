'use client';

import { Sparkles, X } from 'lucide-react';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function NewsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If query matches URL precisely, do nothing (initial load)
    if (query === (searchParams.get('q') || '')) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (!query.trim()) {
        router.push('/news');
      } else {
        const params = new URLSearchParams();
        params.set('q', query.trim());
        params.set('semantic', 'true');
        router.push(`/news?${params.toString()}`);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, router, searchParams]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (!query.trim()) {
      router.push('/news');
      return;
    }
    
    const params = new URLSearchParams();
    params.set('q', query.trim());
    params.set('semantic', 'true');
    
    router.push(`/news?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative max-w-2xl w-full">
      <div className="relative flex items-center w-full group">
        <Sparkles className="absolute left-4 w-5 h-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Semantic search (e.g. 'companies facing leadership changes')..."
          className="w-full h-12 pl-12 pr-10 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
        />
        {query && (
          <button 
            type="button" 
            onClick={() => setQuery('')}
            className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
