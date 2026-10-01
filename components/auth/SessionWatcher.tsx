'use client';

import React, { createContext, useContext } from 'react';

interface SessionWatcherContextType {
  remainingTime: number;
  totalTimeRemaining: number;
}

const SessionWatcherContext = createContext<SessionWatcherContextType>({
  remainingTime: Infinity,
  totalTimeRemaining: Infinity,
});

export function useSessionWatcher() {
  return useContext(SessionWatcherContext);
}

export function SessionWatcher({ children }: { children?: React.ReactNode }) {
  return (
    <SessionWatcherContext.Provider value={{ remainingTime: Infinity, totalTimeRemaining: Infinity }}>
      {children}
    </SessionWatcherContext.Provider>
  );
}
