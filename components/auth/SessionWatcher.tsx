'use client';

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';

const TIMEOUT_MS = 5 * 60 * 1000; // Inactivity timeout
const TOTAL_SESSION_MS = 31 * 60 * 1000; // 11 minutes total active session limit

interface SessionWatcherContextType {
  remainingTime: number; // in milliseconds
  totalTimeRemaining: number;
}

const SessionWatcherContext = createContext<SessionWatcherContextType>({ remainingTime: TIMEOUT_MS, totalTimeRemaining: TOTAL_SESSION_MS });

export function useSessionWatcher() {
  return useContext(SessionWatcherContext);
}

export function SessionWatcher({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession();
  const [remainingTime, setRemainingTime] = useState(TIMEOUT_MS);
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(TOTAL_SESSION_MS);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track absolute session start time across page reloads
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let start = sessionStorage.getItem('portfolio-session-start');
      if (!start) {
        start = Date.now().toString();
        sessionStorage.setItem('portfolio-session-start', start);
      }
      sessionStartRef.current = parseInt(start, 10);
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    const checkTimeout = () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      const timeRemaining = Math.max(0, TIMEOUT_MS - idleTime);
      
      const totalSessionTime = now - sessionStartRef.current;
      const totalRemaining = Math.max(0, TOTAL_SESSION_MS - totalSessionTime);

      const actualRemaining = Math.min(timeRemaining, totalRemaining);

      setRemainingTime(actualRemaining);
      setTotalTimeRemaining(totalRemaining);

      if (actualRemaining === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        sessionStorage.removeItem('portfolio-session-start');
        // Redirect to login page with expired flag
        signOut({ callbackUrl: '/login?expired=true' });
      }
    };

    // Update time remaining every second
    intervalRef.current = setInterval(checkTimeout, 1000);
    // Initial check
    checkTimeout();

    // Event listeners for activity
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Throttle the reset to avoid performance issues
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) { // Reset at most once a second
        lastActivityRef.current = now;
        setRemainingTime(TIMEOUT_MS);
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [session]);

  return (
    <SessionWatcherContext.Provider value={{ remainingTime, totalTimeRemaining }}>
      {children}
    </SessionWatcherContext.Provider>
  );
}
