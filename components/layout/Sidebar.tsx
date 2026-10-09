'use client';

import Link from 'next/link';
import Image from 'next/image';
import appLogo from '@/app/icon.png';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, TrendingUp, Building2,
  ArrowLeftRight, BarChart2, CalendarDays, FileText,
  Sparkles, ChevronLeft, ChevronRight, X, Newspaper, Compass,
} from 'lucide-react';
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/stocks', label: 'Stocks', icon: TrendingUp },
  { href: '/stock-analysis', label: 'Stock Research', icon: Compass },
  { href: '/bonds', label: 'Bonds', icon: Building2 },
  { href: '/cashflow', label: 'Cash Flow', icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/insights', label: 'AI Insights', icon: Sparkles },
];

interface NavContentProps {
  pathname: string;
  isCollapsed: boolean;
  forceExpanded?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

const NavContent = memo(function NavContent({
  pathname,
  isCollapsed,
  forceExpanded = false,
  onClose,
  onToggleCollapse,
}: NavContentProps) {
  const showLabels = !isCollapsed || forceExpanded;
  const activeHref = (() => {
    if (pathname === '/') return '/';
    const exact = NAV_ITEMS.find((item) => item.href === pathname);
    if (exact) return exact.href;
    const prefixMatches = NAV_ITEMS.filter(
      (item) => item.href !== '/' && pathname.startsWith(item.href + '/')
    ).sort((a, b) => b.href.length - a.href.length);
    return prefixMatches[0]?.href;
  })();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
          <Image
            src={appLogo}
            alt="Portfolio Tracker Logo"
            width={32}
            height={32}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight truncate">Portfolio</p>
            <p className="text-xs text-muted-foreground leading-tight">Dashboard</p>
          </div>
        )}
        {/* Mobile close button */}
        {forceExpanded && onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              onClick={forceExpanded ? onClose : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer relative group',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-r-full" />
              )}
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {showLabels && <span className="truncate">{label}</span>}
              {label === 'AI Insights' && showLabels && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      {!forceExpanded && onToggleCollapse && (
        <div className="flex-shrink-0 p-2 border-t border-white/5">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!isCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      )}
    </>
  );
});

export function Sidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobileSidebar, isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <>
      {/* ── Desktop Sidebar (Static & Persistent) ── */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col border-r border-white/5 overflow-hidden transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-60"
        )}
        style={{ background: 'hsl(222 47% 11% / 0.95)' }}
      >
        <NavContent
          pathname={pathname}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {/* ── Mobile Backdrop ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] flex flex-col border-r border-white/5 overflow-hidden"
            style={{ background: 'hsl(222 47% 11% / 0.98)' }}
          >
            <NavContent
              pathname={pathname}
              isCollapsed={false}
              forceExpanded
              onClose={closeMobileSidebar}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
