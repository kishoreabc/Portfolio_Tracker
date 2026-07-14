'use client';

import { memo, useState } from 'react';
import { ExternalLink, Globe, Users, MapPin, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanyProfileProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any> | null;
  isLoading: boolean;
}

export const CompanyProfile = memo(function CompanyProfile({ profile, isLoading }: CompanyProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const asset = profile?.assetProfile;
  const price = profile?.price;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 bg-white/5" />
        <Skeleton className="h-20 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!asset && !price) return null;

  const description = asset?.longBusinessSummary as string | undefined;
  const website = asset?.website as string | undefined;
  const employees = asset?.fullTimeEmployees as number | undefined;
  const city = asset?.city as string | undefined;
  const country = asset?.country as string | undefined;
  const promoterName = asset?.companyOfficers?.[0]?.name as string | undefined;

  if (!description && !website && !employees && !city && !country && !promoterName) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">About</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {promoterName && (
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-border/30 rounded-lg px-3 py-2 min-w-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground/50 uppercase text-[9px] tracking-wide">Promoter</p>
              <p className="font-medium text-foreground truncate">{promoterName}</p>
            </div>
          </div>
        )}
        {(city || country) && (
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-border/30 rounded-lg px-3 py-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground/50 uppercase text-[9px] tracking-wide">HQ</p>
              <p className="font-medium text-foreground truncate">{[city, country].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        )}
        {employees && (
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-border/30 rounded-lg px-3 py-2 min-w-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground/50 uppercase text-[9px] tracking-wide">Employees</p>
              <p className="font-medium text-foreground truncate">{employees.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </div>

      {description && (
        <div className="space-y-1">
          <p className={`text-xs text-muted-foreground/70 leading-relaxed ${isExpanded ? '' : 'line-clamp-4'}`}>
            {description}
          </p>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Show More <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        </div>
      )}

      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {website.replace(/^https?:\/\//, '')}
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
});
