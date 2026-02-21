'use client';

import React, { createContext, useContext } from 'react';

const PromiseFocusModeContext = createContext<boolean>(false);

export function usePromiseFocusMode(): boolean {
  return useContext(PromiseFocusModeContext);
}

export function PromiseFocusModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <PromiseFocusModeContext.Provider value={value}>
      {children}
    </PromiseFocusModeContext.Provider>
  );
}
