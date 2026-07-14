'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface StockModalContextValue {
  activeSymbol: string | null;
  openStock: (ticker: string) => void;
  closeStock: () => void;
}

const StockModalContext = createContext<StockModalContextValue>({
  activeSymbol: null,
  openStock: () => {},
  closeStock: () => {},
});

export function StockModalProvider({ children }: { children: ReactNode }) {
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  const openStock = useCallback((ticker: string) => {
    // Normalize: strip .NS / .BO if the user passes a full symbol
    const clean = ticker.replace(/\.(NS|BO)$/i, '').toUpperCase();
    setActiveSymbol(clean);
  }, []);

  const closeStock = useCallback(() => {
    setActiveSymbol(null);
  }, []);

  return (
    <StockModalContext.Provider value={{ activeSymbol, openStock, closeStock }}>
      {children}
    </StockModalContext.Provider>
  );
}

export function useStockModal() {
  return useContext(StockModalContext);
}
