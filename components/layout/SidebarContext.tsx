'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const EXPANDED_W = 240;
const COLLAPSED_W = 64;
const MD_BREAKPOINT = 768;

interface SidebarContextType {
  isMobileOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  /** Target left-padding in px for content/topbar to keep in sync with the sidebar */
  sidebarPx: number;
}

const SidebarContext = createContext<SidebarContextType>({
  isMobileOpen: false,
  toggleMobileSidebar: () => {},
  closeMobileSidebar: () => {},
  isCollapsed: false,
  toggleCollapsed: () => {},
  sidebarPx: EXPANDED_W,
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track breakpoint on client only to avoid SSR mismatch
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleMobileSidebar = () => setIsMobileOpen((prev) => !prev);
  const closeMobileSidebar = () => setIsMobileOpen(false);
  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  // 0 on mobile (drawer), correct width on desktop
  const sidebarPx = isDesktop ? (isCollapsed ? COLLAPSED_W : EXPANDED_W) : 0;

  return (
    <SidebarContext.Provider value={{ isMobileOpen, toggleMobileSidebar, closeMobileSidebar, isCollapsed, toggleCollapsed, sidebarPx }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

