'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ResearchSection, EmptyState } from './ResearchSection';
import type { DocumentsData, DocumentType } from '@/types/research';
import { FileText, ExternalLink, Calendar, Filter, Download, ShieldCheck, Presentation, Megaphone } from 'lucide-react';

interface DocumentsSectionProps {
  documents: DocumentsData | null | undefined;
  isLoading?: boolean;
}

export function DocumentsSection({ documents, isLoading }: DocumentsSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const allDocs = documents?.documents ?? [];

  const filteredDocs = useMemo(() => {
    if (selectedFilter === 'all') return allDocs;
    return allDocs.filter((doc) => doc.type === selectedFilter);
  }, [allDocs, selectedFilter]);

  if (!documents || allDocs.length === 0) {
    return (
      <ResearchSection
        title="Documents & Filings"
        id="documents"
        description="Official company disclosures, annual reports, results, and presentations"
        meta={documents?.meta}
      >
        <EmptyState
          title="No documents available"
          description="Direct exchange filings and document metadata are not currently indexed for this ticker. Links to external official BSE/NSE sources will appear once indexed."
        />
      </ResearchSection>
    );
  }

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'annual_report':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'quarterly_result':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'investor_presentation':
        return <Presentation className="w-4 h-4 text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case 'credit_rating':
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'annual_report':
        return 'Annual Report';
      case 'quarterly_result':
        return 'Quarterly Results';
      case 'investor_presentation':
        return 'Presentation';
      case 'earnings_call':
        return 'Earnings Call';
      case 'announcement':
        return 'Announcement';
      case 'credit_rating':
        return 'Credit Rating';
      default:
        return 'Filing';
    }
  };

  return (
    <ResearchSection
      title="Documents & Disclosures"
      id="documents"
      description="Direct links to regulatory filings, annual reports, and investor presentations"
      meta={documents.meta}
    >
      <div className="space-y-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-xl w-fit">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'annual_report', label: 'Annual Reports' },
            { id: 'quarterly_result', label: 'Quarterly Results' },
            { id: 'investor_presentation', label: 'Presentations' },
            { id: 'credit_rating', label: 'Credit Ratings' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedFilter(btn.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                selectedFilter === btn.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getDocIcon(doc.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                      {getTypeLabel(doc.type)}
                    </span>
                    {doc.period && (
                      <span className="text-[10px] font-mono font-medium text-blue-400">
                        {doc.period}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-blue-400 transition-colors" title={doc.title}>
                    {doc.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mt-1.5">
                    {doc.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span>Source: {doc.source}</span>
                  </div>
                </div>
              </div>

              <a
                href={doc.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                title="Open official document"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </ResearchSection>
  );
}
