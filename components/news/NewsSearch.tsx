'use client';

import { Search, Sparkles } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

export function NewsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isSemantic, setIsSemantic] = useState(searchParams.get('semantic') === 'true');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      router.push('/news');
      return;
    }
    
    const params = new URLSearchParams();
    params.set('q', query.trim());
    if (isSemantic) params.set('semantic', 'true');
    
    router.push(`/news?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative max-w-2xl w-full">
      <div className="relative flex items-center w-full">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isSemantic ? "Semantic search (e.g. 'companies facing leadership changes')" : "Search financial news..."}
          className="w-full h-12 pl-12 pr-32 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
        />
        
        <div className="absolute right-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSemantic(!isSemantic)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors border",
              isSemantic 
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300"
            )}
            title="Toggle Semantic AI Search"
          >
            <Sparkles className="w-3 h-3" />
            AI Search
          </button>
        </div>
      </div>
    </form>
  );
}
