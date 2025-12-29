'use server';

import { prisma } from '@/lib/prisma';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { encryptToken } from '@/lib/utils/encryption';

export interface GoogleOAuthUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Genera URL de OAuth2 para conectar Google Calendar
 * Usa OAuth directo con Google (sin Supabase Auth) para no interferir con la sesión del usuario
 */
export async function iniciarConexionGoogleCalendar(
  studioSlug: string,
  returnUrl?: string
): Promise<GoogleOAuthUrlResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const credentialsResult = await obtenerCredencialesGoogle();
    if (!credentialsResult.success || !credentialsResult.data) {
      return {
        success: false,
        error: credentialsResult.error || 'Credenciales de Google no configuradas',
      };
    }

    const { clientId, redirectUri } = credentialsResult.data;

    // Autorización incremental: Solo pedir scopes de Calendar
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    // State contiene el studioSlug, returnUrl y resourceType para recuperarlos en el callback
    const state = Buffer.from(
      JSON.stringify({ 
        studioSlug, 
        returnUrl: returnUrl || null,
        resourceType: 'calendar'
      })
    ).toString('base64');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent', // Forzar consent para obtener refresh_token
      state,
    })}`;

    return { success: true, url: authUrl };
  } catch (error) {
    console.error('[iniciarConexionGoogleCalendar] Error:', error);
    return {
      success: false,
      error: 'Error al generar URL de OAuth',
    };
  }
}

/**
 * Procesa el callback de OAuth2 y guarda los tokens
 * Usa OAuth directo con Google (sin Supabase Auth) para no interferir con la sesión del usuario
 */
export async function procesarCallbackGoogleCalendar(
  code: string,
  state: string
): Promise<{ success: boolean; studioSlug?: string; returnUrl?: string; error?: string }> {
  try {
    // Decodificar state para obtener studioSlug y returnUrl
    let studioSlug: string;
    let returnUrl: string | null = null;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      studioSlug = stateData.studioSlug;
      returnUrl = stateData.returnUrl || null;
    } catch {
      return { success: false, error: 'State inválido' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, google_oauth_scopes: true, google_integrations_config: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const credentialsResult = await obtenerCredencialesGoogle();
    if (!credentialsResult.success || !credentialsResult.data) {
      return {
        success: false,
        error: credentialsResult.error || 'Credenciales de Google no configuradas',
      };
    }

    const { clientId, clientSecret, redirectUri } = credentialsResult.data;

    // Intercambiar code por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[procesarCallbackGoogleCalendar] Error de Google:', errorData);
      return { success: false, error: 'Error al intercambiar code por tokens' };
    }

    const tokens = await tokenResponse.json();

    // ⚠️ CRÍTICO: Log para verificar refresh_token
    console.log('[procesarCallbackGoogleCalendar] Tokens recibidos:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });

    if (!tokens.refresh_token) {
      console.error('[procesarCallbackGoogleCalendar] ERROR: No se recibió refresh_token');
      return {
        success: false,
        error: 'No se recibió refresh_token. Asegúrate de incluir prompt=consent en la URL de OAuth.',
      };
    }

    // Obtener información del usuario
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let email: string | undefined;
    let name: string | null = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      email = userInfo.email;
      name = userInfo.name || null;
    }

    // Encriptar refresh_token antes de guardar
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

    // Parsear scopes que realmente se otorgaron
    const scopes = tokens.scope ? tokens.scope.split(' ') : [];

    // Obtener scopes existentes para combinarlos (autorización incremental)
    let scopesFinales = scopes;
    if (studio.google_oauth_scopes) {
      try {
        const scopesExistentes = JSON.parse(studio.google_oauth_scopes) as string[];
        // Combinar scopes existentes con los nuevos (sin duplicados)
        scopesFinales = Array.from(new Set([...scopesExistentes, ...scopes]));
      } catch {
        // Si no se puede parsear, usar solo los nuevos
        scopesFinales = scopes;
      }
    }

    // Determinar qué integraciones están habilitadas según los scopes
    const hasDriveScope = scopesFinales.includes('https://www.googleapis.com/auth/drive.readonly');
    const hasCalendarScope =
      scopesFinales.includes('https://www.googleapis.com/auth/calendar') ||
      scopesFinales.includes('https://www.googleapis.com/auth/calendar.events');

    // Obtener configuración existente de integraciones
    let integrationsConfig: any = {};
    if (studio.google_integrations_config) {
      try {
        integrationsConfig = typeof studio.google_integrations_config === 'string'
          ? JSON.parse(studio.google_integrations_config)
          : studio.google_integrations_config;
      } catch {
        integrationsConfig = {};
      }
    }

    // Actualizar configuración de integraciones
    integrationsConfig = {
      ...integrationsConfig,
      drive: { enabled: hasDriveScope },
      calendar: { enabled: hasCalendarScope },
    };

    // ⚠️ CRÍTICO: Solo actualizar refresh_token si no es null para evitar borrar tokens válidos
    const updateData: any = {
      google_oauth_email: email,
      google_oauth_name: name,
      google_oauth_scopes: JSON.stringify(scopesFinales),
      is_google_connected: true,
      google_integrations_config: integrationsConfig,
    };

    // Solo actualizar refresh_token si tenemos uno nuevo (no null)
    if (encryptedRefreshToken) {
      updateData.google_oauth_refresh_token = encryptedRefreshToken;
      console.log('[procesarCallbackGoogleCalendar] Actualizando refresh_token');
    } else {
      console.warn('[procesarCallbackGoogleCalendar] WARNING: encryptedRefreshToken es null, no se actualizará');
    }

    // Guardar tokens en DB
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: updateData,
    });

    return { success: true, studioSlug, returnUrl: returnUrl || undefined };
  } catch (error) {
    console.error('[procesarCallbackGoogleCalendar] Error:', error);
    return {
      success: false,
      error: 'Error al procesar callback de OAuth',
    };
  }
}

