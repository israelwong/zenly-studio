'use client';
import { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { getRememberMePreference } from '@/lib/supabase/storage-adapter';

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  /**
   * Tiempo de inactividad en minutos (configurable desde SecuritySettings)
   */
  inactivityTimeout?: number;
}

/**
 * Provider que maneja el timeout de sesión por inactividad
 * 
 * Respeta la preferencia "mantener sesión iniciada" del usuario:
 * - Si rememberMe está activo: deshabilita el timeout (sesión no expira)
 * - Si rememberMe está inactivo: usa el timeout configurado
 * 
 * Debe ir envolviendo la app autenticada
 */
export function SessionTimeoutProvider({
  children,
  inactivityTimeout = 30,
}: SessionTimeoutProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Leer preferencia de rememberMe al montar
  useEffect(() => {
    setMounted(true);
    setRememberMe(getRememberMePreference());
  }, []);

  // Si rememberMe está activo, deshabilitar timeout (usar valor muy alto)
  // Si está inactivo, usar el timeout configurado
  const effectiveTimeout = rememberMe ? Number.MAX_SAFE_INTEGER / (60 * 1000) : inactivityTimeout;

  // Hook de session timeout (solo se activa si rememberMe está inactivo)
  useSessionTimeout({
    inactivityTimeout: effectiveTimeout,
    showWarning: !rememberMe, // No mostrar advertencias si rememberMe está activo
    warningTime: 5,
  });

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

