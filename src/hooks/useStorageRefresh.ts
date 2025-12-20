import { useState, useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios de storage
const STORAGE_REFRESH_EVENT = 'storage-refresh';
const STORAGE_UPDATE_EVENT = 'storage-update-local';

/**
 * Hook para manejar la actualización automática de storage
 * Permite a los componentes suscribirse a cambios de storage
 */
export function useStorageRefresh(studioSlug: string) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Función para disparar actualización completa (recarga desde servidor)
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);

    // Disparar evento personalizado para otros componentes
    window.dispatchEvent(new CustomEvent(STORAGE_REFRESH_EVENT, {
      detail: { studioSlug }
    }));
  }, [studioSlug]);

  // Función para actualización local (suma/resta bytes sin recargar)
  const triggerLocalUpdate = useCallback((bytesDelta: number) => {
    window.dispatchEvent(new CustomEvent(STORAGE_UPDATE_EVENT, {
      detail: { studioSlug, bytesDelta }
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
    triggerLocalUpdate,
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

/**
 * Hook para que los componentes de storage se suscriban a actualizaciones locales (sin recargar)
 */
export function useStorageLocalUpdateListener(studioSlug: string, onUpdate: (bytesDelta: number) => void) {
  useEffect(() => {
    const handleStorageUpdate = (event: CustomEvent) => {
      if (event.detail?.studioSlug === studioSlug && typeof event.detail?.bytesDelta === 'number') {
        onUpdate(event.detail.bytesDelta);
      }
    };

    window.addEventListener(STORAGE_UPDATE_EVENT, handleStorageUpdate as EventListener);

    return () => {
      window.removeEventListener(STORAGE_UPDATE_EVENT, handleStorageUpdate as EventListener);
    };
  }, [studioSlug, onUpdate]);
}
