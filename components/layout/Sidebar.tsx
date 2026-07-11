'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, TrendingUp, Building2,
  ArrowLeftRight, BarChart2, CalendarDays, FileText,
  Sparkles, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/stocks', label: 'Stocks', icon: TrendingUp },
  { href: '/bonds', label: 'Bonds', icon: Building2 },
  { href: '/cashflow', label: 'Cash Flow', icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/insights', label: 'AI Insights', icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobileSidebar, isCollapsed, toggleCollapsed } = useSidebar();

  const NavContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {(!isCollapsed || forceExpanded) && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="min-w-0 flex-1"
            >
              <p className="text-sm font-700 text-white leading-tight truncate">Portfolio</p>
              <p className="text-xs text-muted-foreground leading-tight">Dashboard</p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Mobile close button */}
        {forceExpanded && (
          <button
            onClick={closeMobileSidebar}
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
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={forceExpanded ? closeMobileSidebar : undefined}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer relative group',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={forceExpanded ? 'sidebar-active-mobile' : 'sidebar-active'}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <AnimatePresence>
                  {(!isCollapsed || forceExpanded) && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="truncate"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {label === 'AI Insights' && (!isCollapsed || forceExpanded) && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      {!forceExpanded && (
        <div className="flex-shrink-0 p-2 border-t border-white/5">
          <button
            onClick={toggleCollapsed}
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

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col border-r border-white/5 overflow-hidden transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-60"
        )}
        style={{ background: 'hsl(222 47% 11% / 0.95)' }}
      >
        <NavContent />
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
            <NavContent forceExpanded />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
