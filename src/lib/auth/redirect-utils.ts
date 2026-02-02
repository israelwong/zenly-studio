/**
 * FUNCIÓN ÚNICA DE VERDAD PARA REDIRECCIONES
 *
 * Centraliza toda la lógica de redirección basada en sesión.
 * Si user_metadata no tiene role/studio_slug, el caller debe resolver desde DB (resolveRedirectFromDb).
 */

import { getDefaultRoute } from '@/types/auth';
import type { User } from '@supabase/supabase-js';

export interface RedirectResult {
  shouldRedirect: boolean;
  redirectPath: string | null;
}

/**
 * Determina la ruta de redirección basada en user_metadata (role, studio_slug).
 * Si metadata falta (p. ej. tras vincular Google o usuario antiguo), el caller debe usar resolveRedirectFromDb.
 */
export function getRedirectPathForUser(user: User | null): RedirectResult {
  if (!user) {
    return { shouldRedirect: false, redirectPath: null };
  }

  const userRole = user.user_metadata?.role;

  if (!userRole) {
    return { shouldRedirect: false, redirectPath: null };
  }

  if (userRole === 'suscriptor') {
    const studioSlug = user.user_metadata?.studio_slug;
    if (!studioSlug) {
      return { shouldRedirect: false, redirectPath: null };
    }
    return {
      shouldRedirect: true,
      redirectPath: getDefaultRoute(userRole, studioSlug),
    };
  }

  return {
    shouldRedirect: true,
    redirectPath: getDefaultRoute(userRole),
  };
}

