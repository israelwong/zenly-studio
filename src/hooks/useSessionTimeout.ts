'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';

interface UseSessionTimeoutOptions {
  /**
   * Tiempo de inactividad en minutos antes de cerrar sesión
   * @default 30
   */
  inactivityTimeout?: number;
  
  /**
   * Mostrar advertencia antes de cerrar sesión
   * @default true
   */
  showWarning?: boolean;
  
  /**
   * Tiempo de advertencia en minutos antes del cierre
   * @default 5
   */
  warningTime?: number;
  
  /**
   * Callback cuando se cierra la sesión por inactividad
   */
  onSessionTimeout?: () => void;
}

/**
 * Hook para manejar el timeout de sesión por inactividad
 * 
 * @example
 * ```tsx
 * useSessionTimeout({
 *   inactivityTimeout: 30, // 30 minutos
 *   showWarning: true,
 *   warningTime: 5, // Advertir 5 minutos antes
 * });
 * ```
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    inactivityTimeout = 30,
    showWarning = true,
    warningTime = 5,
    onSessionTimeout,
  } = options;

  // Si el timeout es muy alto (rememberMe activo), deshabilitar completamente
  const isRememberMeActive = inactivityTimeout > 1000000; // ~2 años en minutos

  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  const handleSessionTimeout = useCallback(async () => {
    const supabase = createClient();
    
    // Cerrar sesión
    await supabase.auth.signOut();
    
    // Callback personalizado
    onSessionTimeout?.();
    
    // Mostrar mensaje
    toast.error('Sesión cerrada por inactividad', {
      description: 'Tu sesión ha sido cerrada por seguridad debido a inactividad.',
      duration: 5000,
    });
    
    // Redirigir a login
    router.push('/login');
  }, [router, onSessionTimeout]);

  const showWarningToast = useCallback(() => {
    if (warningShownRef.current) return;
    
    warningShownRef.current = true;
    toast.warning('Tu sesión está a punto de expirar', {
      description: `La sesión se cerrará en ${warningTime} minutos por inactividad.`,
      duration: warningTime * 60 * 1000, // Duración = tiempo de advertencia
      action: {
        label: 'Mantener sesión',
        onClick: () => {
          // Resetear actividad
          handleActivity();
          warningShownRef.current = false;
        },
      },
    });
  }, [warningTime]);

  const resetTimers = useCallback(() => {
    // Si rememberMe está activo, no configurar timers
    if (isRememberMeActive) {
      return;
    }

    clearTimers();
    
    const timeoutMs = inactivityTimeout * 60 * 1000;
    const warningMs = (inactivityTimeout - warningTime) * 60 * 1000;
    
    // Timer de advertencia
    if (showWarning && warningTime < inactivityTimeout) {
      warningRef.current = setTimeout(() => {
        showWarningToast();
      }, warningMs);
    }
    
    // Timer de cierre de sesión
    timeoutRef.current = setTimeout(() => {
      handleSessionTimeout();
    }, timeoutMs);
  }, [inactivityTimeout, warningTime, showWarning, clearTimers, showWarningToast, handleSessionTimeout, isRememberMeActive]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // Throttle: solo resetear si han pasado al menos 10 segundos
    if (now - lastActivityRef.current < 10000) {
      return;
    }
    
    lastActivityRef.current = now;
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    // Si rememberMe está activo, no configurar timers ni listeners
    if (isRememberMeActive) {
      return;
    }

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Agregar listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [handleActivity, resetTimers, clearTimers, isRememberMeActive]);

  return {
    /**
     * Resetear manualmente el timer de inactividad
     */
    resetActivity: handleActivity,
  };
}

