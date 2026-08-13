'use client';

import { useNewsArticle } from '@/hooks/useNews';
import { OriginalTamilDialog } from '@/components/news/OriginalTamilDialog';
import { RelatedNews } from '@/components/news/RelatedNews';
import { NewsSentimentBadge } from '@/components/news/NewsSentimentBadge';
import { NewsImpactBadge } from '@/components/news/NewsImpactBadge';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Briefcase, ArrowLeft, Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { use } from 'react';

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idString } = use(params);
  const { data: article, isLoading, error } = useNewsArticle(parseInt(idString, 10));

  if (error) {
    return (
      <div className="p-8 text-center mt-20 max-w-2xl mx-auto border border-red-500/20 rounded-xl bg-red-500/5 text-red-400">
        <h3 className="font-semibold mb-1">Failed to load article</h3>
        <p className="text-sm opacity-80">{error.message}</p>
        <Link href="/news" className="inline-block mt-4 text-sm text-blue-400 hover:underline">
          Return to News
        </Link>
      </div>
    );
  }

  if (isLoading || !article) {
    return (
      <div className="min-h-screen p-4 md:p-8 pt-20 max-w-6xl mx-auto flex gap-8">
        <div className="flex-1 space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-white/5 rounded" />
          <div className="h-10 w-3/4 bg-white/5 rounded" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="space-y-4">
            <div className="h-4 bg-white/5 rounded" />
            <div className="h-4 bg-white/5 rounded" />
            <div className="h-4 w-5/6 bg-white/5 rounded" />
          </div>
        </div>
        <div className="hidden lg:block w-80 shrink-0 space-y-4">
          <div className="h-4 w-32 bg-white/5 rounded mb-6" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const title = article.translatedTitle || article.originalTitle;
  const content = article.translatedContent || article.originalContent || '';
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-8 w-full max-w-[1600px] mx-auto pb-24">
      
      {/* Back button */}
      <Link 
        href="/news"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to News Feed
      </Link>
      
      <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
        
        {/* Main Content */}
        <article className="flex-1 max-w-4xl">
          
          {/* Header */}
          <header className="mb-8 space-y-4">
            <div className="flex items-center flex-wrap gap-3">
              {article.category && (
                <span className="text-xs font-bold tracking-wider uppercase text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md">
                  {article.category}
                </span>
              )}
              {article.portfolioRelevant && (
                <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                  <Briefcase className="w-3.5 h-3.5" />
                  Portfolio Relevant
                </span>
              )}
            </div>
            
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight md:leading-snug">
              {title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400 pt-2 pb-4 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-300">{article.source}</span>
                {article.author && <span>• {article.author}</span>}
              </div>
              
              <span>
                {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : 'Unknown date'}
              </span>
              
              <div className="flex items-center gap-3 ml-auto">
                <NewsSentimentBadge sentiment={article.sentiment} />
                <NewsImpactBadge impact={article.impact} />
              </div>
            </div>
          </header>
          
          {/* AI Summary */}
          {article.summary && (
            <div className="mb-10 p-5 md:p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-blue-400" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Summary
              </h3>
              <p className="text-base md:text-lg text-slate-200 font-medium leading-relaxed relative z-10">
                {article.summary}
              </p>
            </div>
          )}
          
          {/* Companies Mentioned */}
          {article.companies && article.companies.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Companies Mentioned
              </h3>
              <div className="flex flex-wrap gap-2">
                {article.companies.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-sm font-medium text-slate-200">{c.name}</span>
                    {c.symbol && (
                      <span className="text-xs font-mono text-slate-400 bg-black/20 px-1.5 py-0.5 rounded">
                        {c.symbol}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <a 
              href={article.sourceUrl} 
              target="_blank" 
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
              Read Full Article on {article.source} <ExternalLink className="w-4 h-4" />
            </a>
            
            {article.originalLanguage === 'ta' && (
              <OriginalTamilDialog 
                originalTitle={article.originalTitle} 
                originalContent={article.originalContent} 
              />
            )}
          </div>
          
          {/* Article Content */}
          <div className="prose prose-invert prose-slate prose-lg md:prose-xl max-w-none">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-slate-300 leading-relaxed mb-6">
                {p}
              </p>
            ))}
          </div>

        </article>
        
        {/* Sidebar */}
        <aside className="w-full lg:w-80 xl:w-96 shrink-0 mt-12 lg:mt-0 space-y-8">
          <RelatedNews article={article} />
        </aside>
        
      </div>
    </div>
  );
}
