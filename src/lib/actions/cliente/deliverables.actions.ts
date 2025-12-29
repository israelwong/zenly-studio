'use server';

import { prisma } from '@/lib/prisma';
import { obtenerContenidoCarpeta, listarSubcarpetas } from '@/lib/integrations/google';
import type { GoogleDriveFile } from '@/types/google-drive';

export interface ClienteDeliverable {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  delivery_mode: 'native' | 'google_drive' | null;
  google_folder_id: string | null;
  // Contenido consolidado de Google Drive
  driveContent?: {
    folders: Array<{
      id: string;
      name: string;
      items: GoogleDriveFile[];
      subfoldersCount?: number; // Conteo de subcarpetas dentro de esta carpeta
    }>;
    allItems: GoogleDriveFile[];
  };
}

export interface GetClienteDeliverablesResult {
  success: boolean;
  data?: ClienteDeliverable[];
  error?: string;
}

export interface FolderContentResult {
  success: boolean;
  data?: {
    folder: {
      id: string;
      name: string;
    };
    subfolders: Array<{
      id: string;
      name: string;
      itemsCount: number;
      foldersCount: number;
      totalCount: number;
      photosCount: number;
      videosCount: number;
    }>;
    items: GoogleDriveFile[];
  };
  error?: string;
}

/**
 * Obtiene entregables del evento para el portal del cliente
 * Valida que el cliente tenga acceso al evento
 * Consolida contenido de todas las carpetas de Google Drive vinculadas
 */
export async function obtenerEntregablesCliente(
  eventId: string,
  clientId: string
): Promise<GetClienteDeliverablesResult> {
  try {
    // Validar que el evento (promise) pertenezca al cliente
    // Primero buscar en studio_promises (como hace obtenerEventoDetalle)
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: eventId,
        contact_id: clientId,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      select: {
        id: true,
        studio_id: true,
        event: {
          select: {
            id: true,
            studio_id: true,
            studio: {
              select: {
                slug: true,
                is_google_connected: true,
              },
            },
          },
        },
        studio: {
          select: {
            slug: true,
            is_google_connected: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: 'Evento no encontrado o sin acceso',
      };
    }

    // Obtener studio slug e is_google_connected desde el evento si existe, sino desde la promise
    const studioSlug = promise.event?.studio?.slug || promise.studio?.slug;
    const isGoogleConnected = promise.event?.studio?.is_google_connected ?? promise.studio?.is_google_connected ?? false;

    if (!studioSlug) {
      return {
        success: false,
        error: 'Evento no encontrado o sin acceso',
      };
    }

    // Obtener el ID del evento (debe existir para tener entregables)
    const eventoId = promise.event?.id;
    
    if (!eventoId) {
      // Si no existe el evento, no hay entregables
      return {
        success: true,
        data: [],
      };
    }

    // Obtener entregables del evento
    const entregables = await prisma.studio_event_deliverables.findMany({
      where: {
        event_id: eventoId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Procesar entregables y obtener contenido de Google Drive
    const entregablesConContenido: ClienteDeliverable[] = await Promise.all(
      entregables.map(async (entregable) => {
        const resultado: ClienteDeliverable = {
          id: entregable.id,
          name: entregable.name,
          description: entregable.description,
          file_url: entregable.file_url,
          delivery_mode: entregable.delivery_mode as 'native' | 'google_drive' | null,
          google_folder_id: entregable.google_folder_id,
        };

        // Si tiene carpeta de Google Drive, obtener contenido consolidado
        if (entregable.delivery_mode === 'google_drive' && entregable.google_folder_id) {
          console.log(`[obtenerEntregablesCliente] Procesando entregable ${entregable.id} con Google Drive:`, {
            delivery_mode: entregable.delivery_mode,
            google_folder_id: entregable.google_folder_id,
            isGoogleConnected,
          });

          // Verificar que Google Drive esté conectado
          if (!isGoogleConnected) {
            console.log(`[obtenerEntregablesCliente] Google Drive desconectado para entregable ${entregable.id}`);
            // Google Drive desconectado - marcar como no disponible
            resultado.driveContent = {
              folders: [],
              allItems: [],
            };
          } else {
            try {
              // Obtener subcarpetas de la carpeta raíz
              const subcarpetasResult = await listarSubcarpetas(studioSlug, entregable.google_folder_id);
              const subcarpetas = subcarpetasResult.success && subcarpetasResult.data ? subcarpetasResult.data : [];
              console.log(`[obtenerEntregablesCliente] Subcarpetas encontradas:`, subcarpetas.length);

              // Obtener contenido de cada subcarpeta y de la carpeta raíz
              const folders: Array<{ id: string; name: string; items: GoogleDriveFile[] }> = [];
              const allItems: GoogleDriveFile[] = [];

              // Obtener detalles de la carpeta raíz para obtener su nombre real
              const { obtenerDetallesCarpeta } = await import('@/lib/actions/studio/integrations/google-drive.actions');
              const rootFolderDetails = await obtenerDetallesCarpeta(studioSlug, entregable.google_folder_id);
              
              // Contenido de la carpeta raíz
              const rootContentResult = await obtenerContenidoCarpeta(studioSlug, entregable.google_folder_id);
              console.log(`[obtenerEntregablesCliente] Contenido raíz:`, {
                success: rootContentResult.success,
                itemsCount: rootContentResult.data?.length || 0,
                error: rootContentResult.error,
              });
              
              if (rootContentResult.success && rootContentResult.data) {
                // Usar el nombre real de la carpeta desde Google Drive, o el nombre del entregable como fallback
                const folderName = rootFolderDetails.success && rootFolderDetails.data 
                  ? rootFolderDetails.data.name 
                  : entregable.name;
                
                folders.push({
                  id: entregable.google_folder_id,
                  name: folderName,
                  items: rootContentResult.data,
                  subfoldersCount: subcarpetas.length, // Agregar conteo de subcarpetas para la carpeta raíz
                });
                allItems.push(...rootContentResult.data);
              }

              // Contenido de subcarpetas
              for (const subcarpeta of subcarpetas) {
                // Obtener subcarpetas de esta subcarpeta (solo para conteo)
                const subSubcarpetasResult = await listarSubcarpetas(studioSlug, subcarpeta.id);
                const subSubcarpetas = subSubcarpetasResult.success && subSubcarpetasResult.data ? subSubcarpetasResult.data : [];
                
                // Obtener items de esta subcarpeta
                const subcarpetaContentResult = await obtenerContenidoCarpeta(studioSlug, subcarpeta.id);
                if (subcarpetaContentResult.success && subcarpetaContentResult.data) {
                  folders.push({
                    id: subcarpeta.id,
                    name: subcarpeta.name,
                    items: subcarpetaContentResult.data,
                    subfoldersCount: subSubcarpetas.length, // Agregar conteo de subcarpetas
                  });
                  allItems.push(...subcarpetaContentResult.data);
                }
              }

              console.log(`[obtenerEntregablesCliente] Contenido consolidado:`, {
                foldersCount: folders.length,
                allItemsCount: allItems.length,
              });

              resultado.driveContent = {
                folders,
                allItems,
              };
            } catch (error) {
              console.error(`[obtenerEntregablesCliente] Error obteniendo contenido de carpeta ${entregable.google_folder_id}:`, error);
              // Continuar sin contenido si hay error
              resultado.driveContent = {
                folders: [],
                allItems: [],
              };
            }
          }
        } else {
          console.log(`[obtenerEntregablesCliente] Entregable ${entregable.id} no es de Google Drive:`, {
            delivery_mode: entregable.delivery_mode,
            google_folder_id: entregable.google_folder_id,
          });
        }

        return resultado;
      })
    );

    return {
      success: true,
      data: entregablesConContenido,
    };
  } catch (error) {
    console.error('[obtenerEntregablesCliente] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener entregables',
    };
  }
}

/**
 * Obtiene el contenido de una carpeta específica (subcarpetas e items)
 * Para navegación recursiva en el portal del cliente
 */
export async function obtenerContenidoCarpetaCliente(
  eventId: string,
  clientId: string,
  folderId: string
): Promise<FolderContentResult> {
  try {
    // Validar que el evento pertenezca al cliente
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: eventId,
        contact_id: clientId,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      select: {
        id: true,
        event: {
          select: {
            id: true,
            studio: {
              select: {
                slug: true,
                is_google_connected: true,
              },
            },
          },
        },
        studio: {
          select: {
            slug: true,
            is_google_connected: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: 'Evento no encontrado o sin acceso',
      };
    }

    const studioSlug = promise.event?.studio?.slug || promise.studio?.slug;
    const isGoogleConnected = promise.event?.studio?.is_google_connected ?? promise.studio?.is_google_connected ?? false;

    if (!studioSlug || !isGoogleConnected) {
      return {
        success: false,
        error: 'Google Drive no está conectado',
      };
    }

    // Obtener detalles de la carpeta
    const { obtenerDetallesCarpeta } = await import('@/lib/actions/studio/integrations/google-drive.actions');
    const folderDetails = await obtenerDetallesCarpeta(studioSlug, folderId);
    
    if (!folderDetails.success || !folderDetails.data) {
      return {
        success: false,
        error: folderDetails.error || 'Carpeta no encontrada',
      };
    }

    // Obtener subcarpetas
    const { listarSubcarpetas } = await import('@/lib/actions/studio/integrations/google-drive.actions');
    const subcarpetasResult = await listarSubcarpetas(studioSlug, folderId);
    const subcarpetas = subcarpetasResult.success && subcarpetasResult.data ? subcarpetasResult.data : [];

    // Obtener TODOS los items de la carpeta (ya vienen ordenados numéricamente del servidor)
    const { obtenerContenidoCarpeta } = await import('@/lib/actions/studio/integrations/google-drive.actions');
    const contenidoResult = await obtenerContenidoCarpeta(studioSlug, folderId);
    const items = contenidoResult.success && contenidoResult.data ? contenidoResult.data : [];

    // Contar items por tipo
    const photosCount = items.filter(i => i.mimeType.startsWith('image/')).length;
    const videosCount = items.filter(i => i.mimeType.startsWith('video/')).length;

    // Para cada subcarpeta, obtener conteo de items y subcarpetas
    const subfoldersWithCounts = await Promise.all(
      subcarpetas.map(async (subcarpeta) => {
        // Obtener subcarpetas de esta subcarpeta
        const subSubcarpetasResult = await listarSubcarpetas(studioSlug, subcarpeta.id);
        const subSubcarpetas = subSubcarpetasResult.success && subSubcarpetasResult.data ? subSubcarpetasResult.data : [];
        
        // Obtener items de esta subcarpeta
        const subcontenidoResult = await obtenerContenidoCarpeta(studioSlug, subcarpeta.id);
        const subItems = subcontenidoResult.success && subcontenidoResult.data ? subcontenidoResult.data : [];
        
        const subPhotosCount = subItems.filter(i => i.mimeType.startsWith('image/')).length;
        const subVideosCount = subItems.filter(i => i.mimeType.startsWith('video/')).length;
        
        // Total: subcarpetas + items (fotos/videos)
        const totalCount = subSubcarpetas.length + subItems.length;

        return {
          id: subcarpeta.id,
          name: subcarpeta.name,
          itemsCount: subItems.length, // Solo items (fotos/videos)
          foldersCount: subSubcarpetas.length, // Solo subcarpetas
          totalCount, // Total: subcarpetas + items
          photosCount: subPhotosCount,
          videosCount: subVideosCount,
        };
      })
    );

    return {
      success: true,
      data: {
        folder: {
          id: folderDetails.data.id,
          name: folderDetails.data.name,
        },
        subfolders: subfoldersWithCounts,
        items,
      },
    };
  } catch (error) {
    console.error('[obtenerContenidoCarpetaCliente] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener contenido de carpeta',
    };
  }
}

/**
 * Valida que el cliente tenga acceso al archivo
 * Retorna success si tiene acceso (la URL se genera en el cliente)
 */
export async function validarAccesoArchivoCliente(
  eventId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar que el evento pertenezca al cliente
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: eventId,
        contact_id: clientId,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!promise) {
      return {
        success: false,
        error: 'Evento no encontrado o sin acceso',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('[validarAccesoArchivoCliente] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al validar acceso',
    };
  }
}

