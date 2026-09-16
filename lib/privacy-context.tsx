'use client';

import { createContext, useContext, useCallback, ReactNode, useSyncExternalStore } from 'react';

export const PRIVACY_MASK = '••••••';
const STORAGE_KEY = 'portfolio-privacy-mode';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('portfolio-privacy-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('portfolio-privacy-change', callback);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

interface PrivacyContextValue {
  isHidden: boolean;
  togglePrivacy: () => void;
  setHidden: (hidden: boolean) => void;
  maskAmount: (val: string | number, fallback?: string) => string;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isHidden: false,
  togglePrivacy: () => {},
  setHidden: () => {},
  maskAmount: (val) => String(val),
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const isHidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePrivacy = useCallback(() => {
    const current = getSnapshot();
    const next = !current;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new Event('portfolio-privacy-change'));
    } catch {
      // ignore
    }
  }, []);

  const setHidden = useCallback((hidden: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hidden));
      window.dispatchEvent(new Event('portfolio-privacy-change'));
    } catch {
      // ignore
    }
  }, []);

  const maskAmount = useCallback(
    (val: string | number, fallback: string = PRIVACY_MASK): string => {
      if (isHidden) {
        return fallback;
      }
      return typeof val === 'number' ? String(val) : val;
    },
    [isHidden]
  );

  return (
    <PrivacyContext.Provider
      value={{
        isHidden,
        togglePrivacy,
        setHidden,
        maskAmount,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
