'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { listFolders, listFolderContents, getAccessTokenForPicker } from '@/lib/integrations/google/clients/drive.client';
import { obtenerEstadoConexion } from './status.actions';
import type { GoogleDriveFile, GoogleDriveFolder } from '@/types/google-drive';

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
        google_oauth_scopes: true,
        google_integrations_config: true,
      },
      include: {
        user_studio_roles: {
          where: {
            user_id: dbUser.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el usuario tenga permisos de ADMIN o OWNER
    const userRole = studio.user_studio_roles[0]?.role;
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Solo los administradores pueden desconectar Google Drive',
      };
    }

    // Si no hay refresh_token, no hay nada que desconectar
    if (!studio.google_oauth_refresh_token) {
      return { success: true, permisosRevocados: 0, entregablesLimpios: 0 };
    }

    let permisosRevocados = 0;
    let entregablesLimpios = 0;

    // Si se solicita limpieza de permisos, revocar permisos públicos de carpetas vinculadas
    if (limpiarPermisos) {
      try {
        // Obtener todas las carpetas vinculadas a entregables
        const entregablesConDrive = await prisma.studio_event_deliverables.findMany({
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

        if (entregablesConDrive.length > 0) {
          // Importar cliente de Drive para revocar permisos
          const { getGoogleDriveClient } = await import('@/lib/integrations/google/clients/drive.client');
          const { drive } = await getGoogleDriveClient(studioSlug);

          for (const entregable of entregablesConDrive) {
            if (entregable.google_folder_id) {
              try {
                // Obtener permisos actuales de la carpeta
                const permissionsResponse = await drive.permissions.list({
                  fileId: entregable.google_folder_id,
                  fields: 'permissions(id,role,type)',
                });

                const permissions = permissionsResponse.data.permissions || [];

                // Revocar todos los permisos públicos (type: 'anyone')
                for (const permission of permissions) {
                  if (permission.type === 'anyone' && permission.id) {
                    try {
                      await drive.permissions.delete({
                        fileId: entregable.google_folder_id,
                        permissionId: permission.id,
                      });
                      permisosRevocados++;
                    } catch (error) {
                      console.error(
                        `[desconectarGoogleDrive] Error revocando permiso ${permission.id}:`,
                        error
                      );
                    }
                  }
                }

                // Limpiar referencia en entregable
                await prisma.studio_event_deliverables.update({
                  where: { id: entregable.id },
                  data: {
                    google_folder_id: null,
                    delivery_mode: 'manual',
                  },
                });
                entregablesLimpios++;
              } catch (error) {
                console.error(
                  `[desconectarGoogleDrive] Error procesando carpeta ${entregable.google_folder_id}:`,
                  error
                );
                // Continuar con la siguiente carpeta aunque falle una
              }
            }
          }
        }
      } catch (error) {
        console.error('[desconectarGoogleDrive] Error limpiando permisos:', error);
        // No fallar la desconexión si falla la limpieza de permisos
      }
    }

    // Parsear scopes existentes
    let scopes: string[] = [];
    if (studio.google_oauth_scopes) {
      try {
        scopes = JSON.parse(studio.google_oauth_scopes);
      } catch {
        scopes = studio.google_oauth_scopes.split(',').map((s) => s.trim());
      }
    }

    // Remover scopes de Drive
    const scopesSinDrive = scopes.filter(
      (scope) => !scope.includes('drive.readonly') && !scope.includes('drive')
    );

    // Obtener configuración de integraciones
    let integrationsConfig: any = {};
    if (studio.google_integrations_config) {
      try {
        integrationsConfig =
          typeof studio.google_integrations_config === 'string'
            ? JSON.parse(studio.google_integrations_config)
            : studio.google_integrations_config;
      } catch {
        integrationsConfig = {};
      }
    }

    // Deshabilitar Drive en la configuración
    integrationsConfig.drive = { enabled: false };

    // Si no quedan scopes, desconectar completamente
    const isCompletamenteDesconectado = scopesSinDrive.length === 0;

    // Actualizar en DB
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: {
        google_oauth_scopes: scopesSinDrive.length > 0 ? JSON.stringify(scopesSinDrive) : null,
        google_integrations_config: integrationsConfig,
        is_google_connected: !isCompletamenteDesconectado,
        // No borrar refresh_token ni email para permitir reconexión fácil
      },
    });

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

    const { listSubfolders } = await import('@/lib/integrations/google/clients/drive.client');
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
    const { getFolderById } = await import('@/lib/integrations/google/clients/drive.client');
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

