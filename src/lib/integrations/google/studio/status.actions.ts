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

export type GoogleContactsIntegrationStatus = 'ACTIVE' | 'EXPIRED' | 'DISCONNECTED';

export interface GoogleContactsStatusResult {
  success: boolean;
  status: GoogleContactsIntegrationStatus;
  hasScope: boolean;
  error?: string;
}

/**
 * Marca la integración de Google Contacts como EXPIRED (token inválido, ej. invalid_grant).
 * Se persiste en google_integrations_config.contacts.status.
 */
export async function marcarContactosGoogleExpirado(
  studioSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, google_integrations_config: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    let config: Record<string, unknown> = {};
    if (studio.google_integrations_config) {
      try {
        config =
          typeof studio.google_integrations_config === 'string'
            ? (JSON.parse(studio.google_integrations_config) as Record<string, unknown>)
            : { ...(studio.google_integrations_config as Record<string, unknown>) };
      } catch {
        // ignore
      }
    }
    const contacts = (config.contacts as Record<string, unknown>) || {};
    config.contacts = { ...contacts, status: 'EXPIRED' };

    await prisma.studios.update({
      where: { slug: studioSlug },
      data: { google_integrations_config: config },
    });
    return { success: true };
  } catch (error) {
    console.error('[marcarContactosGoogleExpirado] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al marcar estado',
    };
  }
}

/**
 * Obtiene el estado de la integración Google Contacts para el estudio.
 */
export async function getGoogleContactsIntegrationStatus(
  studioSlug: string
): Promise<GoogleContactsStatusResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        google_oauth_refresh_token: true,
        google_oauth_scopes: true,
        google_integrations_config: true,
      },
    });

    if (!studio) {
      return { success: false, status: 'DISCONNECTED', hasScope: false, error: 'Studio no encontrado' };
    }

    let hasScope = false;
    if (studio.google_oauth_scopes) {
      try {
        const scopes =
          typeof studio.google_oauth_scopes === 'string'
            ? JSON.parse(studio.google_oauth_scopes)
            : studio.google_oauth_scopes;
        hasScope = Array.isArray(scopes)
          ? scopes.some((s: string) => s.includes('contacts'))
          : false;
      } catch {
        hasScope = String(studio.google_oauth_scopes).includes('contacts');
      }
    }

    if (!studio.google_oauth_refresh_token || !hasScope) {
      return { success: true, status: 'DISCONNECTED', hasScope: false };
    }

    let contactsStatus: string | undefined;
    if (studio.google_integrations_config) {
      try {
        const config =
          typeof studio.google_integrations_config === 'string'
            ? JSON.parse(studio.google_integrations_config)
            : studio.google_integrations_config;
        contactsStatus = (config as any)?.contacts?.status;
      } catch {
        // ignore
      }
    }

    const status: GoogleContactsIntegrationStatus =
      contactsStatus === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';

    return { success: true, status, hasScope: true };
  } catch (error) {
    console.error('[getGoogleContactsIntegrationStatus] Error:', error);
    return {
      success: false,
      status: 'DISCONNECTED',
      hasScope: false,
      error: error instanceof Error ? error.message : 'Error al obtener estado',
    };
  }
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

