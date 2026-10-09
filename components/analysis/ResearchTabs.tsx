'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, useCallback } from 'react';

export const RESEARCH_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'shareholding', label: 'Shareholding' },
  { id: 'segments', label: 'Segments' },
  { id: 'peers', label: 'Peers' },
  { id: 'corporate-actions', label: 'Corp. Actions' },
  { id: 'documents', label: 'Documents' },
  { id: 'news', label: 'News' },
  { id: 'ai-research', label: 'AI Research' },
] as const;

export type ResearchTabId = (typeof RESEARCH_TABS)[number]['id'];

interface ResearchTabsProps {
  activeTab: ResearchTabId;
  onTabChange: (tab: ResearchTabId) => void;
}

export function ResearchTabs({ activeTab, onTabChange }: ResearchTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector(`[data-tab="${activeTab}"]`) as HTMLButtonElement | null;
    if (active) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = active.getBoundingClientRect();
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto scrollbar-none border-b border-white/5 pb-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm pt-2"
    >
      {RESEARCH_TABS.map(tab => (
        <button
          key={tab.id}
          data-tab={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex-shrink-0 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap',
            activeTab === tab.id
              ? 'text-blue-400 border-blue-400 bg-blue-500/5'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-white/20'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
