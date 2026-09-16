'use client';

import { BarChart3, TrendingUp, PieChart, ShieldAlert, Layers, Globe, CheckSquare, Grid } from 'lucide-react';

export type IntelligenceSection =
  | 'overview'
  | 'fundamental'
  | 'technical'
  | 'valuation'
  | 'risk'
  | 'portfolio'
  | 'macro'
  | 'matrix_thesis';

interface SectionNavProps {
  activeSection: IntelligenceSection;
  onSelectSection: (section: IntelligenceSection) => void;
}

export function SectionNav({ activeSection, onSelectSection }: SectionNavProps) {
  const sections: { id: IntelligenceSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Executive Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'fundamental', label: '1. Fundamental', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'technical', label: '2. Technical', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'valuation', label: '3. Valuation', icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: 'risk', label: '4. Risk', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: 'portfolio', label: '5. Portfolio', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'macro', label: '6. Macro', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'matrix_thesis', label: 'Thesis & Matrix', icon: <Grid className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full overflow-x-auto no-scrollbar border-b border-border/40 pb-2">
      <div className="flex items-center gap-1.5 min-w-max p-1 rounded-xl bg-card/60 border border-border/40">
        {sections.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {sec.icon}
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
