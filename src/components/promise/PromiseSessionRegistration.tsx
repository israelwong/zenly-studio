'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Clave en localStorage: estado de sesión de navegación (solo UI). No telemetría. */
export const PROMISE_RETURN_STORAGE_KEY = 'promise_return_url';
export const PROMISE_RETURN_DISMISSED_KEY = 'promise_return_dismissed';

interface PromiseSessionRegistrationProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Registra en localStorage que el usuario está viendo esta promesa.
 * Solo para UI: botón "Regresar a la cotización" en el perfil público.
 * NO escribe en BD ni llama APIs de tracking.
 */
export function PromiseSessionRegistration({ studioSlug, promiseId }: PromiseSessionRegistrationProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !pathname.includes('/promise/') || !studioSlug || !promiseId) return;
    try {
      const data = {
        url: pathname,
        timestamp: Date.now(),
        slug: studioSlug,
        promiseId,
      };
      localStorage.setItem(PROMISE_RETURN_STORAGE_KEY, JSON.stringify(data));
      sessionStorage.removeItem(PROMISE_RETURN_DISMISSED_KEY);
    } catch (e) {
      console.warn('[PromiseSessionRegistration] localStorage write failed:', e);
    }
  }, [pathname, studioSlug, promiseId]);

  return null;
}
