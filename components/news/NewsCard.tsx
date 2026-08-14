'use client';

import Link from 'next/link';
import { ExternalLink, Briefcase } from 'lucide-react';
import type { NewsArticle } from '@/types/news';
import { NewsSentimentBadge } from './NewsSentimentBadge';
import { NewsImpactBadge } from './NewsImpactBadge';
import { format } from 'date-fns';

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  const title = article.translatedTitle || article.originalTitle;
  const summary = article.summary || 
    (article.translatedContent ? article.translatedContent.slice(0, 150) + '...' : null) || 
    (article.originalContent ? article.originalContent.slice(0, 150) + '...' : '');
  
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/[0.07] transition-colors relative group">
      {/* Badges row */}
      <div className="flex items-center flex-wrap gap-2">
        {article.category && (
          <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
            {article.category}
          </span>
        )}
        

        <div className="ml-auto flex items-center gap-2">
          <NewsSentimentBadge sentiment={article.sentiment} />
          <NewsImpactBadge impact={article.impact} />
        </div>
      </div>
      
      {/* Title & Summary */}
      <Link href={`/news/${article.id}`} className="group-hover:text-blue-400 transition-colors">
        <h3 className="text-base font-semibold text-slate-200 leading-snug line-clamp-2">
          {title}
        </h3>
      </Link>
      
      <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
        {summary}
      </p>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{article.publishedAt ? format(new Date(article.publishedAt), "MMM d, yyyy, h:mm a") : 'Unknown date'}</span>
        </div>
        
        <a 
          href={article.sourceUrl} 
          target="_blank" 
          rel="noreferrer noopener"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Source <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
