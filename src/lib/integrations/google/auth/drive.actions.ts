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
 * Genera URL de OAuth2 para conectar Google Drive
 */
export async function iniciarConexionGoogleDrive(
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

    // Autorización incremental: Pedir scopes de Drive con permisos de escritura
    // Necesitamos permisos de escritura para establecer permisos públicos en carpetas
    const scopes = [
      'https://www.googleapis.com/auth/drive',
    ];

    // State contiene el studioSlug, returnUrl y resourceType para recuperarlos en el callback
    const state = Buffer.from(
      JSON.stringify({ 
        studioSlug, 
        returnUrl: returnUrl || null,
        resourceType: 'drive'
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
    console.error('[iniciarConexionGoogleDrive] Error:', error);
    return {
      success: false,
      error: 'Error al generar URL de OAuth',
    };
  }
}

/**
 * Procesa el callback de OAuth2 y guarda los tokens
 */
export async function procesarCallbackGoogleDrive(
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
      console.error('[procesarCallbackGoogleDrive] Error de Google:', errorData);
      return { success: false, error: 'Error al intercambiar code por tokens' };
    }

    const tokens = await tokenResponse.json();

    // ⚠️ CRÍTICO: Log para verificar refresh_token
    console.log('[procesarCallbackGoogleDrive] Tokens recibidos:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });

    if (!tokens.refresh_token) {
      console.error('[procesarCallbackGoogleDrive] ERROR: No se recibió refresh_token');
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
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      email = userInfo.email;
    }

    // Encriptar refresh_token antes de guardar
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

    // Parsear scopes que realmente se otorgaron
    // Si Google no devuelve scope en la respuesta, usar los scopes que solicitamos
    let scopes: string[] = [];
    if (tokens.scope) {
      scopes = tokens.scope.split(' ');
    } else {
      // Si no vienen en la respuesta, usar los scopes que solicitamos
      // Esto puede pasar en algunos casos de OAuth
      console.warn('[procesarCallbackGoogleDrive] No se recibieron scopes en la respuesta del token, usando scopes solicitados');
      scopes = ['https://www.googleapis.com/auth/drive'];
    }
    
    console.log('[procesarCallbackGoogleDrive] Scopes recibidos:', scopes);

    // Obtener scopes existentes para combinarlos (autorización incremental)
    const studioActual = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { google_oauth_scopes: true },
    });

    let scopesFinales = scopes;
    if (studioActual?.google_oauth_scopes) {
      try {
        const scopesExistentes = JSON.parse(studioActual.google_oauth_scopes) as string[];
        // Combinar scopes existentes con los nuevos (sin duplicados)
        scopesFinales = Array.from(new Set([...scopesExistentes, ...scopes]));
      } catch {
        // Si no se puede parsear, usar solo los nuevos
        scopesFinales = scopes;
      }
    }

    // Determinar qué integraciones están habilitadas según los scopes
    const hasDriveScope = 
      scopesFinales.includes('https://www.googleapis.com/auth/drive.readonly') ||
      scopesFinales.includes('https://www.googleapis.com/auth/drive');
    const hasCalendarScope =
      scopesFinales.includes('https://www.googleapis.com/auth/calendar') ||
      scopesFinales.includes('https://www.googleapis.com/auth/calendar.events');

    // ⚠️ CRÍTICO: Solo actualizar refresh_token si no es null para evitar borrar tokens válidos
    const updateData: any = {
      google_oauth_email: email,
      google_oauth_scopes: JSON.stringify(scopesFinales),
      is_google_connected: true,
      google_integrations_config: {
        drive: { enabled: hasDriveScope },
        calendar: { enabled: hasCalendarScope },
      },
    };

    // Solo actualizar refresh_token si tenemos uno nuevo (no null)
    if (encryptedRefreshToken) {
      updateData.google_oauth_refresh_token = encryptedRefreshToken;
      console.log('[procesarCallbackGoogleDrive] Actualizando refresh_token');
    } else {
      console.warn('[procesarCallbackGoogleDrive] WARNING: encryptedRefreshToken es null, no se actualizará');
    }

    // Guardar tokens en DB
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: updateData,
    });

    return { success: true, studioSlug, returnUrl: returnUrl || undefined };
  } catch (error) {
    console.error('[procesarCallbackGoogleDrive] Error:', error);
    return {
      success: false,
      error: 'Error al procesar callback de OAuth',
    };
  }
}

