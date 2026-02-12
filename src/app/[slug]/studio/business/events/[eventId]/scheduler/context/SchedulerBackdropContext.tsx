'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SchedulerBackdropContextValue {
  isBackdropVisible: boolean;
  registerBackdrop: () => () => void;
}

const SchedulerBackdropContext = createContext<SchedulerBackdropContextValue | null>(null);

export function SchedulerBackdropProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const registerBackdrop = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => Math.max(0, c - 1));
  }, []);

  const value: SchedulerBackdropContextValue = {
    isBackdropVisible: count > 0,
    registerBackdrop,
  };

  return (
    <SchedulerBackdropContext.Provider value={value}>
      {children}
    </SchedulerBackdropContext.Provider>
  );
}

export function useSchedulerBackdrop() {
  const ctx = useContext(SchedulerBackdropContext);
  return ctx;
}
