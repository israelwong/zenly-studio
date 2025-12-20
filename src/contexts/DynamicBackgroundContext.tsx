'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ColorPalette {
  primary: string;
  accent: string;
}

interface DynamicBackgroundContextType {
  colors: ColorPalette | null;
  setColors: (colors: ColorPalette) => void;
}

const DynamicBackgroundContext = createContext<DynamicBackgroundContextType | undefined>(undefined);

export function DynamicBackgroundProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ColorPalette | null>(null);

  return (
    <DynamicBackgroundContext.Provider value={{ colors, setColors }}>
      {children}
    </DynamicBackgroundContext.Provider>
  );
}

export function useDynamicBackground() {
  const context = useContext(DynamicBackgroundContext);
  if (!context) {
    throw new Error('useDynamicBackground must be used within DynamicBackgroundProvider');
  }
  return context;
}
