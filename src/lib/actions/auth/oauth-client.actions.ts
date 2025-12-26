'use client';

import { createClient } from '@/lib/supabase/browser';

/**
 * Inicia flujo OAuth para vincular recurso de Google a un Studio
 * Versión cliente (usa supabase browser client)
 * 
 * IMPORTANTE: Esta función debe ser llamada desde un Client Component
 * porque requiere contexto del navegador para signInWithOAuth
 */
export async function iniciarVinculacionRecursoGoogleClient(
  studioSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Capturar URL de origen para persistencia de contexto
    // Estrategia: Si la URL actual no contiene el studioSlug, usar la URL del dashboard del studio
    let currentPath = window.location.pathname + window.location.search;
    
    // Si la URL actual es la raíz o no contiene el studioSlug, construir la URL del studio
    if (currentPath === '/' || !currentPath.includes(`/${studioSlug}/`)) {
      // Intentar usar el referrer si está disponible y contiene el studioSlug
      const referrer = document.referrer;
      if (referrer && referrer.includes(`/${studioSlug}/`)) {
        try {
          const referrerUrl = new URL(referrer);
          const referrerPath = referrerUrl.pathname + referrerUrl.search;
          // Solo usar el referrer si contiene el studioSlug
          if (referrerPath.includes(`/${studioSlug}/`)) {
            currentPath = referrerPath;
          } else {
            // Fallback: usar la URL del dashboard del studio
            currentPath = `/${studioSlug}/studio/dashboard`;
          }
        } catch {
          // Si falla el parseo, usar la URL del dashboard del studio
          currentPath = `/${studioSlug}/studio/dashboard`;
        }
      } else {
        // Fallback: usar la URL del dashboard del studio
        currentPath = `/${studioSlug}/studio/dashboard`;
      }
    }
    
    const nextUrl = encodeURIComponent(currentPath);
    
    console.log('[iniciarVinculacionRecursoGoogleClient] URL capturada:', {
      originalPath: window.location.pathname + window.location.search,
      finalPath: currentPath,
      studioSlug,
      referrer: document.referrer,
    });

    // IMPORTANTE: NO pasar state en queryParams porque sobrescribe el state de Supabase (CSRF)
    // En su lugar, pasar los datos como parámetros en redirectTo que Supabase preservará
    const redirectTo = `${window.location.origin}/auth/callback?type=link_resource&studioSlug=${encodeURIComponent(studioSlug)}&next=${nextUrl}`;
    
    // Autorización incremental: Solo pedir scopes de Calendar
    // El usuario verá claramente que solo está dando permiso para Calendarios
    const scopes =
      'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

    // Iniciar OAuth con prompt: 'consent' para forzar consentimiento
    // y access_type: 'offline' para obtener refresh_token
    // NO pasar state en queryParams - dejar que Supabase maneje su propio state para CSRF
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent', // Forzar consent para obtener refresh_token
          // NO incluir state aquí - Supabase lo maneja automáticamente
        },
        scopes,
      },
    });

    if (error) {
      console.error('[iniciarVinculacionRecursoGoogleClient] Error de Supabase:', error);
      
      // Mensaje más descriptivo para errores comunes
      let errorMessage = error.message;
      if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
        errorMessage = 'El proveedor de Google OAuth no está habilitado en Supabase. Por favor, habilítalo en Authentication > Providers > Google en el dashboard de Supabase.';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    // La redirección ocurre automáticamente
    return { success: true };
  } catch (error) {
    console.error('[iniciarVinculacionRecursoGoogleClient] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al iniciar vinculación de recurso',
    };
  }
}

