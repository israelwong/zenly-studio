/**
 * FUNCIÓN ÚNICA DE VERDAD PARA REDIRECCIONES
 * 
 * Centraliza toda la lógica de redirección basada en sesión
 * Usa getDefaultRoute como fuente única de verdad
 */

import { getDefaultRoute } from '@/types/auth';
import type { User } from '@supabase/supabase-js';

export interface RedirectResult {
  shouldRedirect: boolean;
  redirectPath: string | null;
}

/**
 * Determina la ruta de redirección basada en el usuario autenticado
 * Fuente única de verdad para todas las redirecciones
 */
export function getRedirectPathForUser(user: User | null): RedirectResult {
  if (!user) {
    return {
      shouldRedirect: false,
      redirectPath: null,
    };
  }

  const userRole = user.user_metadata?.role;

  if (!userRole) {
    return {
      shouldRedirect: false,
      redirectPath: null,
    };
  }

  let redirectPath: string;

  if (userRole === 'suscriptor') {
    const studioSlug = user.user_metadata?.studio_slug;
    if (!studioSlug) {
      return {
        shouldRedirect: false,
        redirectPath: '/unauthorized',
      };
    }
    redirectPath = getDefaultRoute(userRole, studioSlug);
  } else {
    redirectPath = getDefaultRoute(userRole);
  }

  return {
    shouldRedirect: true,
    redirectPath,
  };
}

