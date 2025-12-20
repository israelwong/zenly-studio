import { useState, useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios de logo
export const LOGO_REFRESH_EVENT = 'logo-refresh';

/**
 * Función auxiliar para disparar evento de refresco de logo
 */
export function dispatchLogoRefresh() {
  window.dispatchEvent(new CustomEvent(LOGO_REFRESH_EVENT));
}

/**
 * Hook para manejar la actualización automática del logo
 * Permite a los componentes disparar cambios de logo
 */
export function useLogoRefresh() {
  // Función para disparar actualización de logo
  const triggerRefresh = useCallback(() => {
    dispatchLogoRefresh();
  }, []);

  return {
    triggerRefresh,
  };
}

/**
 * Hook para que los componentes se suscriban a cambios de logo
 */
export function useLogoRefreshListener() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleLogoRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener(LOGO_REFRESH_EVENT, handleLogoRefresh);

    return () => {
      window.removeEventListener(LOGO_REFRESH_EVENT, handleLogoRefresh);
    };
  }, []);

  return refreshTrigger;
}
