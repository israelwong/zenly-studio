'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { encryptToken } from '@/lib/utils/encryption';
import { getGoogleDriveClient, listFolders, listFolderContents, getAccessTokenForPicker } from '@/lib/integrations/google/clients/drive.client';
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

    // ⚠️ CRÍTICO: Log para verificar refresh_token
    console.log('[procesarCallbackGoogle] Tokens recibidos:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });

    if (!tokens.refresh_token) {
      console.error('[procesarCallbackGoogle] ERROR: No se recibió refresh_token');
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
      console.warn('[procesarCallbackGoogle] No se recibieron scopes en la respuesta del token, usando scopes solicitados');
      scopes = ['https://www.googleapis.com/auth/drive'];
    }
    
    console.log('[procesarCallbackGoogle] Scopes recibidos:', scopes);

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
      console.log('[procesarCallbackGoogle] Actualizando refresh_token');
    } else {
      console.warn('[procesarCallbackGoogle] WARNING: encryptedRefreshToken es null, no se actualizará');
    }

    // Guardar tokens en DB
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: updateData,
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
 * Desconecta Google Drive del estudio (versión legacy - mantiene compatibilidad)
 * @deprecated Usar desconectarGoogleDrive() para limpieza completa
 */
export async function desconectarGoogle(studioSlug: string): Promise<{ success: boolean; error?: string }> {
  return desconectarGoogleDrive(studioSlug, false);
}

/**
 * Desconecta Google Drive del estudio con limpieza completa de permisos públicos
 * Implementa "Clean Disconnect" para revocar todos los accesos públicos de carpetas vinculadas
 * 
 * @param studioSlug - Slug del estudio
 * @param limpiarPermisos - Si es true, revoca permisos públicos de todas las carpetas vinculadas (default: true)
 * @returns Resultado con número de permisos revocados
 */
export async function desconectarGoogleDrive(
  studioSlug: string,
  limpiarPermisos: boolean = true
): Promise<{ success: boolean; error?: string; permisosRevocados?: number; entregablesLimpios?: number }> {
  try {
    // Verificar permisos (solo OWNER o ADMIN pueden desconectar)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        google_oauth_refresh_token: true,
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar rol del usuario
    const userRole = await prisma.user_studio_roles.findFirst({
      where: {
        user_id: dbUser.id,
        studio_id: studio.id,
        is_active: true,
      },
      select: { role: true },
    });

    if (!userRole || (userRole.role !== 'OWNER' && userRole.role !== 'ADMIN')) {
      return {
        success: false,
        error: 'Solo los administradores pueden desconectar Google Drive',
      };
    }

    let permisosRevocados = 0;
    let entregablesLimpios = 0;

    // Si se solicita limpiar permisos, revocar accesos públicos de todas las carpetas vinculadas
    if (limpiarPermisos) {
      try {
        // Buscar todos los entregables con google_folder_id
        const entregables = await prisma.studio_event_deliverables.findMany({
          where: {
            event: {
              studio_id: studio.id,
            },
            google_folder_id: {
              not: null,
            },
            delivery_mode: 'google_drive',
          },
          select: {
            id: true,
            google_folder_id: true,
          },
        });

        console.log(`[desconectarGoogleDrive] Encontrados ${entregables.length} entregables con carpetas vinculadas`);

        // Revocar permisos en lotes (BATCH_SIZE = 20)
        const BATCH_SIZE = 20;
        for (let i = 0; i < entregables.length; i += BATCH_SIZE) {
          const batch = entregables.slice(i, i + BATCH_SIZE);

          await Promise.allSettled(
            batch.map(async (entregable) => {
              if (!entregable.google_folder_id) return;

              try {
                const { revocarPermisosPublicos } = await import('@/lib/integrations/google-drive.client');
                const result = await revocarPermisosPublicos(studioSlug, entregable.google_folder_id, true);

                if (result.success) {
                  permisosRevocados += result.permisosRevocados || 0;
                  entregablesLimpios++;
                }
              } catch (error: any) {
                const statusCode = error?.code || error?.response?.status;
                // Ignorar errores no críticos:
                // - 404: Carpeta no encontrada (ya fue eliminada)
                // - 403: Permisos insuficientes (puede ser que la carpeta ya no sea accesible)
                // - 400: Solicitud inválida
                if (statusCode === 404) {
                  console.warn(
                    `[desconectarGoogleDrive] Carpeta ${entregable.google_folder_id} no encontrada, continuando...`
                  );
                  // Limpiar el entregable de todas formas
                  entregablesLimpios++;
                } else if (statusCode !== 403 && statusCode !== 400) {
                  // Solo loguear errores inesperados (no 403 ni 400)
                  console.warn(
                    `[desconectarGoogleDrive] Error inesperado revocando permisos de carpeta ${entregable.google_folder_id}:`,
                    {
                      status: statusCode,
                      message: error?.message,
                    }
                  );
                }
                // Continuar con el siguiente entregable sin fallar (incluso con 403/400)
                entregablesLimpios++;
              }
            })
          );
        }

        // Limpiar google_folder_id y resetear delivery_mode a native
        await prisma.studio_event_deliverables.updateMany({
          where: {
            event: {
              studio_id: studio.id,
            },
            google_folder_id: {
              not: null,
            },
            delivery_mode: 'google_drive',
          },
          data: {
            google_folder_id: null,
            delivery_mode: 'native',
          },
        });

        console.log(
          `[desconectarGoogleDrive] ✅ Revocados ${permisosRevocados} permisos públicos de ${entregablesLimpios} entregables`
        );
      } catch (error) {
        console.error('[desconectarGoogleDrive] Error limpiando permisos:', error);
        // No fallar la desconexión si la limpieza de permisos falla
        // El usuario puede limpiar manualmente en Google Drive si es necesario
      }
    }

    // Obtener configuración actual de integraciones
    const studioActual = await prisma.studios.findUnique({
      where: { id: studio.id },
      select: { google_integrations_config: true, google_oauth_scopes: true },
    });

    let integrationsConfig: any = {};
    if (studioActual?.google_integrations_config) {
      try {
        integrationsConfig = typeof studioActual.google_integrations_config === 'string'
          ? JSON.parse(studioActual.google_integrations_config)
          : studioActual.google_integrations_config;
      } catch {
        integrationsConfig = {};
      }
    }

    // Deshabilitar Drive en la configuración (independiente de Calendar)
    integrationsConfig.drive = { enabled: false };

    // IMPORTANTE: Drive y Calendar son independientes
    // Si Calendar está conectado, mantener sus tokens y scopes intactos
    // Solo eliminar scopes de Drive
    let scopesFinales: string[] = [];
    if (studioActual?.google_oauth_scopes) {
      try {
        const scopesExistentes = JSON.parse(studioActual.google_oauth_scopes) as string[];
        // Filtrar scopes de Drive, mantener TODOS los scopes de Calendar
        scopesFinales = scopesExistentes.filter(
          (scope) => !scope.includes('drive.readonly') && !scope.includes('drive')
        );
      } catch {
        scopesFinales = [];
      }
    }

    // Verificar si Calendar sigue conectado después de remover Drive
    const tieneCalendarScopes = scopesFinales.some(
      (scope) => scope.includes('calendar') || scope.includes('calendar.events')
    );

    // Si Calendar sigue conectado, mantener tokens y solo actualizar scopes
    // Si solo Drive estaba conectado, limpiar todo
    if (tieneCalendarScopes) {
      // Calendar sigue activo: mantener tokens, solo actualizar scopes
      await prisma.studios.update({
        where: { slug: studioSlug },
        data: {
          google_oauth_scopes: JSON.stringify(scopesFinales),
          is_google_connected: true, // Calendar sigue conectado
          google_integrations_config: integrationsConfig,
        },
      });
    } else {
      // Solo Drive estaba conectado: limpiar todo
      await prisma.studios.update({
        where: { slug: studioSlug },
        data: {
          google_oauth_refresh_token: null,
          google_oauth_email: null,
          google_oauth_name: null,
          google_oauth_scopes: null,
          is_google_connected: false,
          google_integrations_config: integrationsConfig,
        },
      });
    }

    console.log(
      `[desconectarGoogleDrive] ✅ Google Drive desconectado de ${studioSlug}. Permisos revocados: ${permisosRevocados}, Entregables limpiados: ${entregablesLimpios}`
    );
    
    // Verificar que realmente se desconectó
    const studioVerificado = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        google_oauth_scopes: true,
        is_google_connected: true,
        google_integrations_config: true,
      },
    });
    
    const tieneDriveScopes = studioVerificado?.google_oauth_scopes
      ? JSON.parse(studioVerificado.google_oauth_scopes as string).some((s: string) => s.includes('drive'))
      : false;
    
    if (tieneDriveScopes) {
      console.warn('[desconectarGoogleDrive] ⚠️ Aún hay scopes de Drive después de desconectar. Reintentando limpieza...');
      // Forzar limpieza de scopes de Drive
      const scopesActuales = JSON.parse(studioVerificado.google_oauth_scopes as string) as string[];
      const scopesSinDrive = scopesActuales.filter((s: string) => !s.includes('drive'));
      
      await prisma.studios.update({
        where: { slug: studioSlug },
        data: {
          google_oauth_scopes: scopesSinDrive.length > 0 ? JSON.stringify(scopesSinDrive) : null,
          is_google_connected: scopesSinDrive.length > 0,
        },
      });
    }
    
    return {
      success: true,
      permisosRevocados,
      entregablesLimpios,
    };

    return {
      success: true,
      permisosRevocados,
      entregablesLimpios,
    };
  } catch (error) {
    console.error('[desconectarGoogleDrive] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desconectar Google Drive',
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
    // Validar primero si Drive está conectado antes de intentar usar la API
    const status = await obtenerEstadoConexion(studioSlug);
    const hasDriveScope = status.scopes?.some(
      (scope) => scope.includes('drive.readonly') || scope.includes('drive')
    ) || false;

    if (!hasDriveScope) {
      return {
        success: false,
        error:
          'Google Drive no está conectado. Por favor, conecta Google Drive desde la configuración de integraciones.',
      };
    }

    const folders = await listFolders(studioSlug, parentFolderId);
    return { success: true, data: folders };
  } catch (error) {
    console.error('[listarCarpetasDrive] Error:', error);
    
    // Si el error es de permisos insuficientes, retornar error específico
    if (error instanceof Error && error.message.includes('Permisos insuficientes')) {
      return {
        success: false,
        error: 'Permisos insuficientes. Por favor, reconecta Google Drive desde la configuración de integraciones para actualizar los permisos.',
      };
    }
    
    // Verificar si hay conexión existente o entregables vinculados
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        google_oauth_email: true,
        is_google_connected: true,
        google_oauth_scopes: true,
        google_integrations_config: true,
      },
    });

    // Verificar si hay entregables con Drive vinculado (indica conexión previa)
    let tieneEntregablesDrive = false;
    if (studio) {
      const count = await prisma.studio_event_deliverables.count({
        where: {
          event: {
            studio_id: studio.id,
          },
          google_folder_id: {
            not: null,
          },
          delivery_mode: 'google_drive',
        },
      });
      tieneEntregablesDrive = count > 0;
    }

    // Manejar errores específicos de permisos
    if (error instanceof Error) {
      // Si tiene Google conectado pero sin scope de Drive
      if (
        error.message.includes('permisos') ||
        error.message.includes('Drive') ||
        error.message.includes('agregar los permisos')
      ) {
        const mensaje = tieneEntregablesDrive
          ? 'Google Drive estaba conectado anteriormente pero los permisos se perdieron. Por favor, reconecta Google Drive desde la configuración de integraciones para restaurar el acceso a tus entregables.'
          : 'Google está conectado pero no tiene permisos de Drive. Por favor, conecta Google Drive desde la configuración de integraciones para agregar los permisos necesarios.';
        
        return {
          success: false,
          error: mensaje,
        };
      }
      
      if (error.message.includes('403') || error.message.includes('Insufficient Permission')) {
        const mensaje = tieneEntregablesDrive
          ? 'Los permisos de Google Drive expiraron o fueron revocados. Por favor, reconecta Google Drive desde la configuración de integraciones para restaurar el acceso.'
          : 'No tienes permisos para acceder a Google Drive. Por favor, conecta Google Drive desde la configuración de integraciones.';
        
        return {
          success: false,
          error: mensaje,
        };
      }
    }
    
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
    // Validar primero si Drive está conectado antes de intentar usar la API
    const status = await obtenerEstadoConexion(studioSlug);
    const hasDriveScope = status.scopes?.some(
      (scope) => scope.includes('drive.readonly') || scope.includes('drive')
    ) || false;

    if (!hasDriveScope) {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: {
          id: true,
          google_oauth_email: true,
          is_google_connected: true,
          google_integrations_config: true,
        },
      });

      const tieneGoogleConectado = studio?.is_google_connected && studio?.google_oauth_email;

      if (tieneGoogleConectado) {
        return {
          success: false,
          error:
            'Google está conectado pero no tiene permisos de Drive. Por favor, conecta Google Drive desde la configuración de integraciones para agregar los permisos necesarios.',
        };
      } else {
        return {
          success: false,
          error:
            'Google Drive no está conectado. Por favor, conecta Google Drive desde la configuración de integraciones.',
        };
      }
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Error al obtener detalles de la carpeta';
    const isNotFound = errorMessage === 'CARPETA_NO_ENCONTRADA';
    const noPermissions = errorMessage === 'CARPETA_SIN_PERMISOS';
    const noDriveConnected = errorMessage.includes('Studio no tiene Google Drive conectado') || 
                             errorMessage.includes('no tiene permisos de Drive');
    
    // No loguear errores esperados (Google Drive no conectado)
    if (!noDriveConnected) {
      console.error('[obtenerDetallesCarpeta] Error:', error);
    }
    
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
    
    if (noDriveConnected) {
      return {
        success: false,
        error: 'Google Drive no está conectado',
        folderNotFound: false,
      };
    }
    
    return {
      success: false,
      error: errorMessage,
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

