'use server';

import { prisma } from '@/lib/prisma';

export interface GoogleConnectionStatus {
  success: boolean;
  isConnected: boolean;
  email?: string;
  name?: string; // Nombre de la cuenta de Google conectada
  scopes?: string[];
  error?: string;
}

/**
 * Obtiene el estado de conexión de Google para un estudio
 * Evalúa independientemente cada recurso (Drive, Calendar, Contacts)
 */
export async function obtenerEstadoConexion(studioSlug: string): Promise<GoogleConnectionStatus> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        is_google_connected: true,
        google_oauth_email: true,
        google_oauth_name: true,
        google_oauth_scopes: true,
        google_integrations_config: true,
        google_oauth_refresh_token: true,
      },
    });

    if (!studio) {
      return { success: false, isConnected: false, error: 'Studio no encontrado' };
    }

    let scopes: string[] = [];
    if (studio.google_oauth_scopes) {
      try {
        scopes = JSON.parse(studio.google_oauth_scopes);
      } catch {
        // Si no es JSON válido, intentar como string simple
        scopes = studio.google_oauth_scopes.split(',').map((s) => s.trim());
      }
    }

    // ⚠️ CRÍTICO: Independencia de recursos - cada recurso se evalúa independientemente
    // Un recurso está conectado si tiene su scope Y tiene refresh_token Y tiene email
    const hasDriveScope = scopes.some(
      (scope) => scope.includes('drive.readonly') || scope.includes('drive')
    );
    const hasCalendarScope = scopes.some(
      (scope) => scope.includes('calendar') || scope.includes('calendar.events')
    );
    const hasContactsScope = scopes.some(
      (scope) => scope.includes('contacts')
    );

    // Cada recurso es independiente: necesita scope + token + email
    const driveConnected = hasDriveScope && 
      studio.google_oauth_refresh_token !== null && 
      studio.google_oauth_email !== null;
    
    const calendarConnected = hasCalendarScope && 
      studio.google_oauth_refresh_token !== null && 
      studio.google_oauth_email !== null;
    
    const contactsConnected = hasContactsScope && 
      studio.google_oauth_refresh_token !== null && 
      studio.google_oauth_email !== null;

    // isConnected general: debe tener token Y email Y al menos un recurso conectado
    const isConnectedGeneral =
      studio.google_oauth_refresh_token !== null &&
      studio.google_oauth_email !== null &&
      (driveConnected || calendarConnected || contactsConnected);

    const result = {
      success: true,
      isConnected: isConnectedGeneral,
      email: studio.google_oauth_email || undefined,
      name: studio.google_oauth_name || undefined,
      scopes: scopes.length > 0 ? scopes : undefined,
    };

    return result;
  } catch (error) {
    // Si el error es de Prisma por campos no encontrados, retornar estado por defecto
    if (error instanceof Error && error.message.includes('Unknown field')) {
      console.warn(
        '[obtenerEstadoConexion] Campos de Google no disponibles en Prisma. Reinicia el servidor de Next.js.'
      );
      return {
        success: true,
        isConnected: false,
        email: undefined,
        scopes: undefined,
      };
    }
    console.error('[obtenerEstadoConexion] Error:', error);
    return {
      success: false,
      isConnected: false,
      error: 'Error al obtener estado de conexión',
    };
  }
}

