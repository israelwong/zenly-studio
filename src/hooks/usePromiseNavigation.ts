'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook para gestionar navegación atómica y prevenir race conditions
 * 
 * Implementa el patrón de Metodología ZEN v2.0 Capítulo 3:
 * - Flag isNavigating para bloquear sincronización durante transiciones
 * - useRef para prevenir actualizaciones de realtime durante navegación
 * - Timeout de limpieza automática
 */
export function usePromiseNavigation() {
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  /**
   * Activar flag de navegación
   * @param routeId - ID de la ruta a la que se está navegando (opcional)
   */
  const setNavigating = useCallback((routeId: string | null) => {
    setIsNavigating(routeId);
    isNavigatingRef.current = routeId !== null;
  }, []);

  /**
   * Verificar si se está navegando (para uso en callbacks)
   * Útil para bloquear sincronización de realtime
   */
  const getIsNavigating = useCallback(() => {
    return isNavigatingRef.current;
  }, []);

  /**
   * Limpiar flag después de un delay
   * Útil para asegurar que la navegación se complete antes de permitir sincronización
   */
  const clearNavigating = useCallback((delay: number = 1000) => {
    setTimeout(() => {
      setIsNavigating(null);
      isNavigatingRef.current = false;
    }, delay);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      setIsNavigating(null);
      isNavigatingRef.current = false;
    };
  }, []);

  return {
    isNavigating,
    setNavigating,
    getIsNavigating,
    clearNavigating,
  };
}
