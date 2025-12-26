'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { encryptToken } from '@/lib/utils/encryption';
import { getGoogleDriveClient, listFolders, listFolderContents, getAccessTokenForPicker } from '@/lib/integrations/google-drive.client';
import type { GoogleDriveFile, GoogleDriveFolder } from '@/types/google-drive';

export interface GoogleConnectionStatus {
  success: boolean;
  isConnected: boolean;
  email?: string;
  name?: string; // Nombre de la cuenta de Google conectada
  scopes?: string[];
  error?: string;
}

export interface GoogleOAuthUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface GoogleFolderListResult {
  success: boolean;
  data?: GoogleDriveFolder[];
  error?: string;
}

export interface GoogleFolderContentsResult {
  success: boolean;
  data?: GoogleDriveFile[];
  error?: string;
}

export interface AccessTokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

/**
 * Genera URL de OAuth2 para conectar Google Drive
 */
export async function iniciarConexionGoogle(
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

    // Autorización incremental: Solo pedir scopes de Drive
    // El usuario verá claramente que solo está dando permiso de lectura para sus archivos
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
    ];

    // State contiene el studioSlug y returnUrl para recuperarlos en el callback
    const state = Buffer.from(
      JSON.stringify({ studioSlug, returnUrl: returnUrl || null })
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
    console.error('[iniciarConexionGoogle] Error:', error);
    return {
      success: false,
      error: 'Error al generar URL de OAuth',
    };
  }
}

/**
 * Procesa el callback de OAuth2 y guarda los tokens
 */
export async function procesarCallbackGoogle(
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
      console.error('[procesarCallbackGoogle] Error de Google:', errorData);
      return { success: false, error: 'Error al intercambiar code por tokens' };
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
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
    const scopes = tokens.scope ? tokens.scope.split(' ') : [];

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
    const hasDriveScope = scopesFinales.includes('https://www.googleapis.com/auth/drive.readonly');
    const hasCalendarScope =
      scopesFinales.includes('https://www.googleapis.com/auth/calendar') ||
      scopesFinales.includes('https://www.googleapis.com/auth/calendar.events');

    // Guardar tokens en DB
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: {
        google_oauth_refresh_token: encryptedRefreshToken,
        google_oauth_email: email,
        google_oauth_scopes: JSON.stringify(scopesFinales),
        is_google_connected: true,
        google_integrations_config: {
          drive: { enabled: hasDriveScope },
          calendar: { enabled: hasCalendarScope },
        },
      },
    });

    return { success: true, studioSlug, returnUrl: returnUrl || undefined };
  } catch (error) {
    console.error('[procesarCallbackGoogle] Error:', error);
    return {
      success: false,
      error: 'Error al procesar callback de OAuth',
    };
  }
}

/**
 * Desconecta Google Drive del estudio
 */
export async function desconectarGoogle(studioSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Limpiar tokens
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: {
        google_oauth_refresh_token: null,
        google_oauth_email: null,
        google_oauth_scopes: null,
        is_google_connected: false,
      },
    });

    // Nota: No eliminamos los entregables con delivery_mode='google_drive'
    // porque el estudio puede reconectar más tarde y recuperar el acceso
    // Los entregables quedarán sin contenido hasta que se reconecte Google Drive
    // o se cambie el modo de entrega

    return { success: true };
  } catch (error) {
    console.error('[desconectarGoogle] Error:', error);
    return {
      success: false,
      error: 'Error al desconectar Google',
    };
  }
}

/**
 * Obtiene el estado de conexión de Google
 */
export async function obtenerEstadoConexion(studioSlug: string): Promise<GoogleConnectionStatus> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        is_google_connected: true,
        google_oauth_email: true,
        google_oauth_name: true,
        google_oauth_scopes: true,
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

    const result = {
      success: true,
      isConnected: studio.is_google_connected || false,
      email: studio.google_oauth_email || undefined,
      name: studio.google_oauth_name || undefined,
      scopes: scopes.length > 0 ? scopes : undefined,
    };

    return result;
  } catch (error) {
    // Si el error es de Prisma por campos no encontrados, retornar estado por defecto
    if (error instanceof Error && error.message.includes('Unknown field')) {
      console.warn('[obtenerEstadoConexion] Campos de Google no disponibles en Prisma. Reinicia el servidor de Next.js.');
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

/**
 * Lista carpetas disponibles en Google Drive
 * @param studioSlug - Slug del estudio
 * @param parentFolderId - ID de la carpeta padre (opcional)
 */
export async function listarCarpetasDrive(
  studioSlug: string,
  parentFolderId?: string
): Promise<GoogleFolderListResult> {
  try {
    const folders = await listFolders(studioSlug, parentFolderId);
    return { success: true, data: folders };
  } catch (error) {
    console.error('[listarCarpetasDrive] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al listar carpetas',
    };
  }
}

/**
 * Obtiene contenido de una carpeta en Google Drive
 */
export async function obtenerContenidoCarpeta(
  studioSlug: string,
  folderId: string
): Promise<GoogleFolderContentsResult> {
  try {
    const result = await listFolderContents(studioSlug, folderId);
    return { 
      success: true, 
      data: result.files,
    };
  } catch (error) {
    console.error('[obtenerContenidoCarpeta] Error:', error);
    if (error instanceof Error && error.message === 'CARPETA_SIN_PERMISOS') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta carpeta. Verifica que la carpeta pertenezca a tu cuenta de Google Drive o que tengas permisos de lectura.',
      };
    }
    if (error instanceof Error && error.message === 'CARPETA_NO_ENCONTRADA') {
      return {
        success: false,
        error: 'La carpeta fue eliminada o movida',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener contenido de carpeta',
    };
  }
}

/**
 * Lista subcarpetas dentro de una carpeta específica
 */
export async function listarSubcarpetas(
  studioSlug: string,
  folderId: string
): Promise<GoogleFolderListResult> {
  try {
    const { listSubfolders } = await import('@/lib/integrations/google-drive.client');
    const folders = await listSubfolders(studioSlug, folderId);
    return { success: true, data: folders };
  } catch (error) {
    console.error('[listarSubcarpetas] Error:', error);
    if (error instanceof Error && error.message === 'CARPETA_SIN_PERMISOS') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta carpeta. Verifica que la carpeta pertenezca a tu cuenta de Google Drive o que tengas permisos de lectura.',
      };
    }
    if (error instanceof Error && error.message === 'CARPETA_NO_ENCONTRADA') {
      return {
        success: false,
        error: 'La carpeta fue eliminada o movida',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al listar subcarpetas',
    };
  }
}

/**
 * Obtiene los detalles de una carpeta por su ID
 */
export async function obtenerDetallesCarpeta(
  studioSlug: string,
  folderId: string
): Promise<{ success: true; data: { id: string; name: string; mimeType: string } } | { success: false; error: string; folderNotFound?: boolean }> {
  try {
    const { getFolderById } = await import('@/lib/integrations/google-drive.client');
    const folder = await getFolderById(studioSlug, folderId);

    if (!folder) {
      return {
        success: false,
        error: 'Carpeta no encontrada o no es una carpeta válida',
        folderNotFound: true,
      };
    }

    return { success: true, data: folder };
  } catch (error) {
    console.error('[obtenerDetallesCarpeta] Error:', error);
    const isNotFound = error instanceof Error && error.message === 'CARPETA_NO_ENCONTRADA';
    const noPermissions = error instanceof Error && error.message === 'CARPETA_SIN_PERMISOS';
    
    if (isNotFound) {
      return {
        success: false,
        error: 'La carpeta fue eliminada o movida',
        folderNotFound: true,
      };
    }
    
    if (noPermissions) {
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta carpeta. Verifica que la carpeta pertenezca a tu cuenta de Google Drive o que tengas permisos de lectura.',
        folderNotFound: false,
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener detalles de la carpeta',
      folderNotFound: false,
    };
  }
}

/**
 * Obtiene access token para usar en Google Picker (cliente)
 */
export async function obtenerAccessToken(studioSlug: string): Promise<AccessTokenResult> {
  try {
    const accessToken = await getAccessTokenForPicker(studioSlug);
    return { success: true, accessToken };
  } catch (error) {
    console.error('[obtenerAccessToken] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener access token',
    };
  }
}

