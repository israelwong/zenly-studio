import { useState, useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios de avatar
const AVATAR_REFRESH_EVENT = 'avatar-refresh';

/**
 * Hook para manejar la actualización automática del avatar
 * Permite a los componentes suscribirse a cambios de avatar
 */
export function useAvatarRefresh() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Función para disparar actualización de avatar
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);

    // Disparar evento personalizado para otros componentes
    window.dispatchEvent(new CustomEvent(AVATAR_REFRESH_EVENT));
  }, []);

  // Escuchar eventos de actualización
  useEffect(() => {
    const handleAvatarRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener(AVATAR_REFRESH_EVENT, handleAvatarRefresh);

    return () => {
      window.removeEventListener(AVATAR_REFRESH_EVENT, handleAvatarRefresh);
    };
  }, []);

  return {
    refreshTrigger,
    triggerRefresh,
  };
}

/**
 * Hook para que los componentes se suscriban a cambios de avatar
 */
export function useAvatarRefreshListener() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleAvatarRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener(AVATAR_REFRESH_EVENT, handleAvatarRefresh);

    return () => {
      window.removeEventListener(AVATAR_REFRESH_EVENT, handleAvatarRefresh);
    };
  }, []);

  return refreshTrigger;
}
