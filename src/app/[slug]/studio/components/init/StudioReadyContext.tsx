'use client';

import { createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface StudioReadyContextType {
  /** true cuando la sesión ha terminado de cargar (éxito o no). Los hijos no deben disparar Server Actions al montar hasta que sea true. */
  isReady: boolean;
}

const StudioReadyContext = createContext<StudioReadyContextType>({ isReady: false });

/**
 * Provee isReady = !sessionLoading para que los hijos (HeaderDataLoader, etc.)
 * solo ejecuten sus Server Actions al montar cuando el Studio ha terminado de hidratar.
 * Evita 20+ POSTs por remontados en bucle.
 */
export function StudioReadyProvider({ children }: { children: React.ReactNode }) {
  const { loading: sessionLoading } = useAuth();
  const isReady = !sessionLoading;
  return (
    <StudioReadyContext.Provider value={{ isReady }}>
      {children}
    </StudioReadyContext.Provider>
  );
}

export function useStudioReady(): StudioReadyContextType {
  return useContext(StudioReadyContext);
}
