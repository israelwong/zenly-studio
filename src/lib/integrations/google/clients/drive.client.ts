'use server';

import { google } from 'googleapis';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/utils/encryption';
import type { GoogleDriveFile, GoogleDriveFolder } from '@/types/google-drive';

/**
 * Obtiene un cliente autenticado de Google Drive para un estudio
 */
export async function getGoogleDriveClient(studioSlug: string) {
  // Obtener credenciales OAuth compartidas
  const credentialsResult = await obtenerCredencialesGoogle();
  if (!credentialsResult.success || !credentialsResult.data) {
    throw new Error(credentialsResult.error || 'Credenciales de Google no disponibles');
  }

  const { clientId, clientSecret, redirectUri } = credentialsResult.data;

  // Obtener studio y su refresh token
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      google_oauth_refresh_token: true,
      google_oauth_scopes: true,
      google_integrations_config: true,
      google_oauth_email: true,
      is_google_connected: true,
    },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  if (!studio.google_oauth_refresh_token) {
    throw new Error('Studio no tiene Google conectado');
  }

  // Verificar si tiene conexión existente pero sin scope de Drive
  let hasDriveScope = false;
  let hasDriveConfig = false;
  
  // Verificar scopes
  if (studio.google_oauth_scopes) {
    try {
      const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
      hasDriveScope =
        scopes.includes('https://www.googleapis.com/auth/drive.readonly') ||
        scopes.includes('https://www.googleapis.com/auth/drive');
      // Nota: drive.readonly es suficiente para leer, pero drive es necesario para establecer permisos
    } catch {
      // Si no se puede parsear, intentar como string simple
      const scopesStr = studio.google_oauth_scopes;
      hasDriveScope =
        scopesStr.includes('drive.readonly') || scopesStr.includes('drive');
    }
  }

  // Verificar configuración de integraciones (puede indicar conexión previa)
  if (studio.google_integrations_config) {
    try {
      const config =
        typeof studio.google_integrations_config === 'string'
          ? JSON.parse(studio.google_integrations_config)
          : studio.google_integrations_config;
      hasDriveConfig = config?.drive?.enabled === true;
    } catch {
      // Si no se puede parsear, continuar sin error
    }
  }

  // Si no tiene scope de Drive pero tiene conexión Google, necesita agregar Drive
  if (!hasDriveScope) {
    const tieneGoogleConectado = studio.is_google_connected && studio.google_oauth_email;
    
    if (tieneGoogleConectado || hasDriveConfig) {
      // Tiene Google conectado pero sin scope de Drive - necesita agregar Drive a la conexión existente
      throw new Error(
        'Google está conectado pero no tiene permisos de Drive. Por favor, conecta Google Drive desde la configuración de integraciones para agregar los permisos necesarios.'
      );
    } else {
      // No tiene Google conectado en absoluto
      throw new Error(
        'Studio no tiene Google Drive conectado. Por favor, conecta Google Drive desde la configuración de integraciones.'
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
  // Si el token es válido, simplemente lo devuelve; si está expirado, lo refresca
  // Nota: Los scopes vienen del refresh_token original y no se pueden cambiar después
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    // Actualizar credenciales con el nuevo access_token si fue refrescado
    oauth2Client.setCredentials(credentials);
  } catch (error: any) {
    console.error('[getGoogleDriveClient] Error refrescando token:', error);
    // Si el refresh falla, puede ser que el refresh_token sea inválido o no tenga los scopes
    if (error?.response?.status === 403 || error?.code === 403) {
      throw new Error('Permisos insuficientes. Por favor, reconecta Google Drive desde la configuración de integraciones para actualizar los permisos.');
    }
    // En ese caso, el usuario necesita reconectarse
    throw new Error('Error al refrescar access token. Por favor, reconecta tu cuenta de Google.');
  }

  // Crear cliente de Drive
  const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  });

  return { drive, oauth2Client };
}

/**
 * Lista carpetas del usuario en Google Drive
 * @param studioSlug - Slug del estudio
 * @param parentFolderId - ID de la carpeta padre (opcional, si no se proporciona lista desde la raíz)
 */
export async function listFolders(
  studioSlug: string,
  parentFolderId?: string
): Promise<GoogleDriveFolder[]> {
  const { drive } = await getGoogleDriveClient(studioSlug);

  // Construir query: si hay parentFolderId, buscar carpetas dentro de esa carpeta
  // Si no, buscar carpetas en la raíz
  let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    // Carpetas en la raíz: están en 'root'
    query += " and 'root' in parents";
  }

  try {
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, parents)',
      orderBy: 'name',
    });
    return (response.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
    }));
  } catch (error: any) {
    // ⚠️ CRÍTICO: Manejar 401 (Unauthorized) - token expirado, intentar refrescar
    if (error?.code === 401 || error?.response?.status === 401) {
      console.warn('[listFolders] Token expirado (401), el cliente debería refrescar automáticamente');
      // El cliente de googleapis debería refrescar automáticamente, pero si falla, necesitamos reconectar
      throw new Error('Sesión expirada. Por favor, reconecta Google Drive desde la configuración de integraciones.');
    }
    // Manejar errores de permisos insuficientes
    if (error?.code === 403 || error?.response?.status === 403) {
      console.warn('[listFolders] Permisos insuficientes para listar carpetas de Drive');
      throw new Error('Permisos insuficientes. Por favor, reconecta Google Drive desde la configuración de integraciones.');
    }
    throw error;
  }

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
  }));
}

/**
 * Lista contenido de una carpeta en Google Drive
 * Filtra solo imágenes y videos
 * Obtiene TODAS las páginas automáticamente y las ordena numéricamente
 */
export async function listFolderContents(
  studioSlug: string,
  folderId: string
): Promise<{ files: GoogleDriveFile[] }> {
  const { drive } = await getGoogleDriveClient(studioSlug);

  try {
    // Primero verificar que la carpeta existe
    await drive.files.get({
      fileId: folderId,
      fields: 'id, mimeType',
    });

    let allFiles: GoogleDriveFile[] = [];
    let nextPageToken: string | undefined = undefined;

    // Obtener todas las páginas automáticamente
    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, modifiedTime)',
        orderBy: 'name', // Orden alfabético inicial (luego ordenamos numéricamente)
        pageSize: 100,
        pageToken: nextPageToken,
      });

      const files = (response.data.files || []).map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        thumbnailLink: file.thumbnailLink || undefined,
        webContentLink: file.webContentLink || undefined,
        webViewLink: file.webViewLink || undefined,
        size: file.size || undefined,
        modifiedTime: file.modifiedTime || undefined,
      }));

      allFiles = [...allFiles, ...files];
      nextPageToken = response.data.nextPageToken || undefined;
    } while (nextPageToken);

    // Ordenar numéricamente TODAS las imágenes en el servidor
    // Esto asegura que 1, 2, 10, 11... se ordenen correctamente, no 1, 10, 100, 101...
    const sortedFiles = allFiles.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    return {
      files: sortedFiles,
    };
  } catch (error: any) {
    // ⚠️ CRÍTICO: Manejar 401 (Unauthorized) - token expirado
    if (error?.code === 401 || error?.response?.status === 401) {
      console.warn('[listFolderContents] Token expirado (401)');
      throw new Error('Sesión expirada. Por favor, reconecta Google Drive desde la configuración de integraciones.');
    }
    // Si el error es 404, la carpeta no existe
    if (error?.code === 404 || error?.response?.status === 404) {
      throw new Error('CARPETA_NO_ENCONTRADA');
    }
    // Si el error es 403, no tenemos permisos
    if (error?.code === 403 || error?.response?.status === 403) {
      throw new Error('CARPETA_SIN_PERMISOS');
    }
    throw error;
  }
}

/**
 * Lista solo carpetas dentro de una carpeta específica
 */
export async function listSubfolders(
  studioSlug: string,
  folderId: string
): Promise<GoogleDriveFolder[]> {
  const { drive } = await getGoogleDriveClient(studioSlug);

  try {
    // Primero verificar que la carpeta existe
    await drive.files.get({
      fileId: folderId,
      fields: 'id, mimeType',
    });

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name',
    });

    return (response.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
    }));
  } catch (error: any) {
    // Si el error es 404, la carpeta no existe
    if (error?.code === 404 || error?.response?.status === 404) {
      throw new Error('CARPETA_NO_ENCONTRADA');
    }
    // Si el error es 403, no tenemos permisos
    if (error?.code === 403 || error?.response?.status === 403) {
      throw new Error('CARPETA_SIN_PERMISOS');
    }
    throw error;
  }
}

/**
 * Obtiene los detalles de una carpeta por su ID
 */
export async function getFolderById(
  studioSlug: string,
  folderId: string
): Promise<GoogleDriveFolder | null> {
  const { drive } = await getGoogleDriveClient(studioSlug);

  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    });

    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      return null;
    }

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: response.data.mimeType!,
    };
  } catch (error: any) {
    // Si el error es 404, la carpeta no existe
    if (error?.code === 404 || error?.response?.status === 404) {
      throw new Error('CARPETA_NO_ENCONTRADA');
    }
    // Si el error es 403, no tenemos permisos
    if (error?.code === 403 || error?.response?.status === 403) {
      throw new Error('CARPETA_SIN_PERMISOS');
    }
    console.error('[getFolderById] Error:', error);
    return null;
  }
}

/**
 * Obtiene un access token para usar en Google Picker (cliente)
 */
export async function getAccessTokenForPicker(studioSlug: string): Promise<string> {
  const { oauth2Client } = await getGoogleDriveClient(studioSlug);
  const credentials = oauth2Client.credentials;

  if (!credentials.access_token) {
    throw new Error('Access token no disponible');
  }

  return credentials.access_token;
}

/**
 * Establece permisos públicos (reader) para una carpeta y todos sus archivos
 * Esto permite que los clientes descarguen archivos sin autenticarse en Google
 * @param studioSlug - Slug del estudio
 * @param folderId - ID de la carpeta
 * @param recursive - Si es true, también establece permisos en subcarpetas y archivos (default: true)
 */
export async function establecerPermisosPublicos(
  studioSlug: string,
  folderId: string,
  recursive: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const { drive } = await getGoogleDriveClient(studioSlug);

  try {
    // Establecer permiso público en la carpeta raíz
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (error: any) {
      // Si el permiso ya existe (error 400), continuar
      if (error?.code !== 400 && error?.response?.status !== 400) {
        console.error('[establecerPermisosPublicos] Error estableciendo permiso en carpeta:', error);
        throw error;
      }
    }

    if (!recursive) {
      return { success: true };
    }

    // Obtener todos los archivos y subcarpetas recursivamente
    let allFiles: string[] = [];
    let allFolders: string[] = [folderId];
    let processedFolders = new Set<string>();

    while (allFolders.length > 0) {
      const currentFolderId = allFolders.shift()!;
      
      if (processedFolders.has(currentFolderId)) {
        continue;
      }
      processedFolders.add(currentFolderId);

      // Obtener archivos y subcarpetas de la carpeta actual
      let nextPageToken: string | undefined = undefined;
      
      do {
        const response = await drive.files.list({
          q: `'${currentFolderId}' in parents and trashed=false`,
          fields: 'nextPageToken, files(id, mimeType)',
          pageSize: 100,
          pageToken: nextPageToken,
        });

        const files = response.data.files || [];
        
        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Es una subcarpeta, agregarla a la cola
            if (!processedFolders.has(file.id!)) {
              allFolders.push(file.id!);
            }
          } else {
            // Es un archivo, agregarlo a la lista
            allFiles.push(file.id!);
          }
        }

        nextPageToken = response.data.nextPageToken || undefined;
      } while (nextPageToken);
    }

    // Establecer permisos en todas las subcarpetas
    for (const subfolderId of processedFolders) {
      if (subfolderId === folderId) continue; // Ya procesamos la raíz
      
      try {
        await drive.permissions.create({
          fileId: subfolderId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (error: any) {
        // Si el permiso ya existe, continuar
        if (error?.code !== 400 && error?.response?.status !== 400) {
          console.error(`[establecerPermisosPublicos] Error estableciendo permiso en subcarpeta ${subfolderId}:`, error);
        }
      }
    }

    // Establecer permisos en todos los archivos (en lotes para eficiencia)
    const batchSize = 10;
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (fileId) => {
          try {
            await drive.permissions.create({
              fileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
          } catch (error: any) {
            // Si el permiso ya existe (400) o es un error interno de Google (500), ignorar
            // Los errores 500 de Google pueden ser temporales o por límites de rate
            if (error?.code !== 400 && error?.code !== 500 && error?.response?.status !== 400 && error?.response?.status !== 500) {
              console.error(`[establecerPermisosPublicos] Error estableciendo permiso en archivo ${fileId}:`, error);
            }
          }
        })
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error('[establecerPermisosPublicos] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al establecer permisos públicos',
    };
  }
}

/**
 * Revoca permisos públicos (anyone) de una carpeta y todos sus archivos
 * Usado durante la desconexión limpia para eliminar accesos públicos
 * @param studioSlug - Slug del estudio
 * @param folderId - ID de la carpeta
 * @param recursive - Si es true, también revoca permisos en subcarpetas y archivos (default: true)
 */
export async function revocarPermisosPublicos(
  studioSlug: string,
  folderId: string,
  recursive: boolean = true
): Promise<{ success: boolean; error?: string; permisosRevocados?: number }> {
  const { drive } = await getGoogleDriveClient(studioSlug);
  let permisosRevocados = 0;

  try {
    // Obtener todos los permisos públicos de la carpeta raíz
    try {
      const permissions = await drive.permissions.list({
        fileId: folderId,
        fields: 'permissions(id, type, role)',
      });

      // Eliminar permisos públicos (type: 'anyone')
      for (const permission of permissions.data.permissions || []) {
        if (permission.type === 'anyone' && permission.id) {
          try {
            await drive.permissions.delete({
              fileId: folderId,
              permissionId: permission.id,
            });
            permisosRevocados++;
          } catch (error: any) {
            // Si el permiso ya no existe (404), continuar
            if (error?.code !== 404 && error?.response?.status !== 404) {
              console.error(`[revocarPermisosPublicos] Error eliminando permiso ${permission.id}:`, error);
            }
          }
        }
      }
    } catch (error: any) {
      const statusCode = error?.code || error?.response?.status;
      // Ignorar errores no críticos: 404 (no encontrado), 403 (permisos insuficientes), 400 (bad request)
      if (statusCode === 404) {
        console.warn(`[revocarPermisosPublicos] Carpeta ${folderId} no encontrada, continuando...`);
        return { success: true, permisosRevocados: 0 };
      } else if (statusCode === 403 || statusCode === 400) {
        // Permisos insuficientes o solicitud inválida - la carpeta puede no ser accesible o ya no tener permisos públicos
        console.warn(`[revocarPermisosPublicos] No se pueden listar permisos de carpeta ${folderId} (${statusCode === 403 ? 'permisos insuficientes' : 'solicitud inválida'}), continuando...`);
        return { success: true, permisosRevocados: 0 };
      }
      // Otros errores inesperados se propagan
      throw error;
    }

    if (!recursive) {
      return { success: true, permisosRevocados };
    }

    // Obtener todos los archivos y subcarpetas recursivamente
    let allFiles: string[] = [];
    let allFolders: string[] = [folderId];
    let processedFolders = new Set<string>();

    while (allFolders.length > 0) {
      const currentFolderId = allFolders.shift()!;
      
      if (processedFolders.has(currentFolderId)) {
        continue;
      }
      processedFolders.add(currentFolderId);

      // Obtener archivos y subcarpetas de la carpeta actual
      let nextPageToken: string | undefined = undefined;
      
      do {
        try {
          const response = await drive.files.list({
            q: `'${currentFolderId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id, mimeType)',
            pageSize: 100,
            pageToken: nextPageToken,
          });

          const files = response.data.files || [];
          
          for (const file of files) {
            if (file.mimeType === 'application/vnd.google-apps.folder') {
              // Es una subcarpeta, agregarla a la cola
              if (!processedFolders.has(file.id!)) {
                allFolders.push(file.id!);
              }
            } else {
              // Es un archivo, agregarlo a la lista
              allFiles.push(file.id!);
            }
          }

          nextPageToken = response.data.nextPageToken || undefined;
        } catch (error: any) {
          const statusCode = error?.code || error?.response?.status;
          // Ignorar errores no críticos: 404 (no encontrado), 403 (permisos insuficientes), 400 (bad request)
          if (statusCode === 404) {
            console.warn(`[revocarPermisosPublicos] Carpeta ${currentFolderId} no encontrada, continuando...`);
            break;
          } else if (statusCode === 403 || statusCode === 400) {
            // Permisos insuficientes o solicitud inválida - continuar sin error
            console.warn(`[revocarPermisosPublicos] No se puede acceder a carpeta ${currentFolderId} (${statusCode === 403 ? 'permisos insuficientes' : 'solicitud inválida'}), continuando...`);
            break;
          }
          throw error;
        }
      } while (nextPageToken);
    }

    // Revocar permisos en todas las subcarpetas (en lotes)
    const BATCH_SIZE = 20;
    const foldersArray = Array.from(processedFolders).filter(id => id !== folderId);
    
    for (let i = 0; i < foldersArray.length; i += BATCH_SIZE) {
      const batch = foldersArray.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (subfolderId) => {
          try {
            const permissions = await drive.permissions.list({
              fileId: subfolderId,
              fields: 'permissions(id, type, role)',
            });

            for (const permission of permissions.data.permissions || []) {
              if (permission.type === 'anyone' && permission.id) {
                try {
                  await drive.permissions.delete({
                    fileId: subfolderId,
                    permissionId: permission.id,
                  });
                  permisosRevocados++;
                } catch (error: any) {
                  // Si el permiso ya no existe (404), continuar
                  if (error?.code !== 404 && error?.response?.status !== 404) {
                    console.error(`[revocarPermisosPublicos] Error eliminando permiso en subcarpeta ${subfolderId}:`, error);
                  }
                }
              }
            }
          } catch (error: any) {
            const statusCode = error?.code || error?.response?.status;
            // Ignorar errores no críticos: 404 (no encontrado), 403 (permisos insuficientes), 400 (bad request)
            if (statusCode !== 404 && statusCode !== 403 && statusCode !== 400) {
              console.error(`[revocarPermisosPublicos] Error procesando subcarpeta ${subfolderId}:`, error);
            }
          }
        })
      );
    }

    // Revocar permisos en todos los archivos (en lotes)
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (fileId) => {
          try {
            const permissions = await drive.permissions.list({
              fileId,
              fields: 'permissions(id, type, role)',
            });

            for (const permission of permissions.data.permissions || []) {
              if (permission.type === 'anyone' && permission.id) {
                try {
                  await drive.permissions.delete({
                    fileId,
                    permissionId: permission.id,
                  });
                  permisosRevocados++;
                } catch (error: any) {
                  const statusCode = error?.code || error?.response?.status;
                  // Ignorar errores no críticos:
                  // - 404: Permiso ya no existe
                  // - 403: Permisos insuficientes (puede ser que el archivo ya no sea accesible o cambió de dueño)
                  // - 400: Solicitud inválida (puede ser que el permiso ya fue eliminado)
                  if (statusCode !== 404 && statusCode !== 403 && statusCode !== 400) {
                    // Solo loguear errores inesperados
                    console.warn(`[revocarPermisosPublicos] Error inesperado eliminando permiso en archivo ${fileId}:`, {
                      status: statusCode,
                      message: error?.message,
                    });
                  }
                  // Continuar con el siguiente permiso sin fallar
                }
              }
            }
          } catch (error: any) {
            const statusCode = error?.code || error?.response?.status;
            // Ignorar errores no críticos: 404 (no encontrado), 403 (permisos insuficientes), 400 (bad request)
            if (statusCode !== 404 && statusCode !== 403 && statusCode !== 400) {
              console.error(`[revocarPermisosPublicos] Error procesando archivo ${fileId}:`, error);
            }
          }
        })
      );
    }

    return { success: true, permisosRevocados };
  } catch (error: any) {
    console.error('[revocarPermisosPublicos] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al revocar permisos públicos',
      permisosRevocados,
    };
  }
}

