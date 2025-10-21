import { useState, useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios de storage
const STORAGE_REFRESH_EVENT = 'storage-refresh';

/**
 * Hook para manejar la actualización automática de storage
 * Permite a los componentes suscribirse a cambios de storage
 */
export function useStorageRefresh(studioSlug: string) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Función para disparar actualización
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    
    // Disparar evento personalizado para otros componentes
    window.dispatchEvent(new CustomEvent(STORAGE_REFRESH_EVENT, {
      detail: { studioSlug }
    }));
  }, [studioSlug]);

  // Escuchar eventos de actualización
  useEffect(() => {
    const handleStorageRefresh = (event: CustomEvent) => {
      if (event.detail?.studioSlug === studioSlug) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener(STORAGE_REFRESH_EVENT, handleStorageRefresh as EventListener);
    
    return () => {
      window.removeEventListener(STORAGE_REFRESH_EVENT, handleStorageRefresh as EventListener);
    };
  }, [studioSlug]);

  return {
    refreshTrigger,
    triggerRefresh,
  };
}

/**
 * Hook para que los componentes de storage se suscriban a cambios
 */
export function useStorageRefreshListener(studioSlug: string) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleStorageRefresh = (event: CustomEvent) => {
      if (event.detail?.studioSlug === studioSlug) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener(STORAGE_REFRESH_EVENT, handleStorageRefresh as EventListener);
    
    return () => {
      window.removeEventListener(STORAGE_REFRESH_EVENT, handleStorageRefresh as EventListener);
    };
  }, [studioSlug]);

  return refreshTrigger;
}
