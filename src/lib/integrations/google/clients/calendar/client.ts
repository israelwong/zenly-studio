'use server';

import { google } from 'googleapis';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/utils/encryption';

/**
 * Obtiene un cliente autenticado de Google Calendar para un estudio
 * Reutiliza el patrón de getGoogleDriveClient
 */
export async function getGoogleCalendarClient(studioSlug: string) {
  // Obtener credenciales OAuth compartidas
  const credentialsResult = await obtenerCredencialesGoogle();
  if (!credentialsResult.success || !credentialsResult.data) {
    throw new Error(
      credentialsResult.error || 'Credenciales de Google no disponibles'
    );
  }

  const { clientId, clientSecret, redirectUri } = credentialsResult.data;

  // Obtener studio y su refresh token
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      google_oauth_refresh_token: true,
      google_oauth_scopes: true,
    },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  if (!studio.google_oauth_refresh_token) {
    throw new Error('Studio no tiene Google conectado');
  }

  // Verificar que tenga scope de Calendar completo (necesario para crear calendarios)
  if (studio.google_oauth_scopes) {
    try {
      const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
      const hasFullCalendarScope = scopes.includes('https://www.googleapis.com/auth/calendar');
      const hasEventsOnlyScope = scopes.includes('https://www.googleapis.com/auth/calendar.events');
      
      if (!hasFullCalendarScope && !hasEventsOnlyScope) {
        throw new Error(
          'Studio no tiene permisos de Calendar. Por favor, reconecta tu cuenta de Google.'
        );
      }
      
      // Guardar información sobre el scope para usar en operaciones que requieren permisos completos
      if (!hasFullCalendarScope && hasEventsOnlyScope) {
        console.warn('[getGoogleCalendarClient] Solo tiene scope calendar.events, algunas operaciones pueden fallar');
      }
    } catch (error) {
      // Si no se puede parsear, asumir que necesita reconectar
      throw new Error(
        'Error al verificar permisos de Calendar. Por favor, reconecta tu cuenta de Google.'
      );
    }
  }

  // Desencriptar refresh token
  let refreshToken: string;
  try {
    refreshToken = await decryptToken(studio.google_oauth_refresh_token);
  } catch (error) {
    throw new Error('Error al desencriptar refresh token');
  }

  // Crear OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Configurar refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Refrescar access token (googleapis maneja automáticamente si es necesario)
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    // Actualizar credenciales con el nuevo access_token si fue refrescado
    oauth2Client.setCredentials(credentials);
  } catch (error: any) {
    console.error('[getGoogleCalendarClient] Error refrescando token:', error);
    
    // Verificar si el error es invalid_grant (token revocado/expirado)
    const isInvalidGrant = error?.message?.includes('invalid_grant') || 
                          error?.code === 'invalid_grant' ||
                          error?.response?.data?.error === 'invalid_grant';
    
    if (isInvalidGrant) {
      // Verificar si realmente hay una cuenta conectada antes de pedir reconexión
      const studioWithToken = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: {
          google_oauth_refresh_token: true,
          google_oauth_email: true,
        },
      });
      
      // Si no hay refresh token guardado, no hay cuenta conectada
      if (!studioWithToken?.google_oauth_refresh_token) {
        throw new Error('No hay cuenta de Google Calendar conectada');
      }
      
      // Si hay refresh token pero falla, necesita reconectar
      throw new Error(
        'Error al refrescar access token. Por favor, reconecta tu cuenta de Google Calendar.'
      );
    }
    
    // Para otros errores, relanzar el error original
    throw error;
  }

  // Crear cliente de Calendar
  const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client,
  });

  return { calendar, oauth2Client };
}

