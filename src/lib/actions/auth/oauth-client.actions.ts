'use client';

import { iniciarConexionGoogleCalendar, iniciarConexionGoogle } from '@/lib/integrations/google';

/**
 * Inicia flujo OAuth para vincular Google Calendar a un Studio
 * Usa OAuth directo con Google (sin Supabase Auth) para no interferir con la sesión del usuario
 * 
 * IMPORTANTE: Esta función debe ser llamada desde un Client Component
 */
export async function iniciarVinculacionRecursoGoogleClient(
  studioSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Capturar URL de origen para persistencia de contexto
    let currentPath = window.location.pathname + window.location.search;
    
    // Si la URL actual es la raíz o no contiene el studioSlug, construir la URL del studio
    if (currentPath === '/' || !currentPath.includes(`/${studioSlug}/`)) {
      const referrer = document.referrer;
      if (referrer && referrer.includes(`/${studioSlug}/`)) {
        try {
          const referrerUrl = new URL(referrer);
          const referrerPath = referrerUrl.pathname + referrerUrl.search;
          if (referrerPath.includes(`/${studioSlug}/`)) {
            currentPath = referrerPath;
          } else {
            currentPath = `/${studioSlug}/studio/commercial/dashboard`;
          }
        } catch {
          currentPath = `/${studioSlug}/studio/commercial/dashboard`;
        }
      } else {
        currentPath = `/${studioSlug}/studio/commercial/dashboard`;
      }
    }
    
    const returnUrl = currentPath;
    
    console.log('[iniciarVinculacionRecursoGoogleClient] Iniciando OAuth directo con Google (sin Supabase Auth)');
    
    // Usar OAuth directo con Google (igual que Drive) - NO interfiere con sesión del usuario
    const result = await iniciarConexionGoogleCalendar(studioSlug, returnUrl);
    
    if (!result.success || !result.url) {
      return {
        success: false,
        error: result.error || 'Error al generar URL de OAuth',
      };
    }
    
    // Redirigir a Google OAuth
    window.location.href = result.url;
    
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

/**
 * Inicia flujo OAuth para vincular Google Drive a un Studio
 * Usa OAuth directo con Google (sin Supabase Auth) para no interferir con la sesión del usuario
 * 
 * IMPORTANTE: Esta función debe ser llamada desde un Client Component
 */
export async function iniciarVinculacionDriveClient(
  studioSlug: string,
  returnUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Capturar URL de origen para persistencia de contexto
    let currentPath = returnUrl || window.location.pathname + window.location.search;
    
    // Si la URL actual es la raíz o no contiene el studioSlug, construir la URL del studio
    if (currentPath === '/' || !currentPath.includes(`/${studioSlug}/`)) {
      const referrer = document.referrer;
      if (referrer && referrer.includes(`/${studioSlug}/`)) {
        try {
          const referrerUrl = new URL(referrer);
          currentPath = referrerUrl.pathname + referrerUrl.search;
        } catch {
          currentPath = `/${studioSlug}/studio/config/integraciones`;
        }
      } else {
        currentPath = `/${studioSlug}/studio/config/integraciones`;
      }
    }
    
    console.log('[iniciarVinculacionDriveClient] Iniciando OAuth directo con Google (sin Supabase Auth)');
    
    // Usar OAuth directo con Google (igual que Calendar) - NO interfiere con sesión del usuario
    const result = await iniciarConexionGoogle(studioSlug, currentPath);
    
    if (!result.success || !result.url) {
      return {
        success: false,
        error: result.error || 'Error al generar URL de OAuth',
      };
    }
    
    // Redirigir a Google OAuth
    window.location.href = result.url;
    
    return { success: true };
  } catch (error) {
    console.error('[iniciarVinculacionDriveClient] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al iniciar vinculación de Google Drive',
    };
  }
}

