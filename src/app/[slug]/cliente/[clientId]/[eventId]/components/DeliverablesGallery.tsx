'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Image, Video, Download, Folder, Loader2, ArrowLeft, Play } from 'lucide-react';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import Lightbox from 'yet-another-react-lightbox';
import VideoPlugin from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { ClienteDeliverable } from '@/lib/actions/public/cliente';
import type { GoogleDriveFile } from '@/types/google-drive';

interface DeliverablesGalleryProps {
  eventId: string;
  clientId: string;
  entregables: ClienteDeliverable[];
  loading?: boolean;
}

type FilterType = 'all' | 'photos' | 'videos';

export function DeliverablesGallery({
  eventId,
  clientId,
  entregables,
  loading = false,
}: DeliverablesGalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Leer carpeta actual desde URL
  const folderIdFromUrl = searchParams.get('folder');
  
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderIdFromUrl);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);
  const [currentFolderData, setCurrentFolderData] = useState<{
    folder: { id: string; name: string };
    subfolders: Array<{ id: string; name: string; itemsCount: number; foldersCount: number; totalCount: number; photosCount: number; videosCount: number }>;
    items: GoogleDriveFile[];
  } | null>(null);
  const [loadingFolder, setLoadingFolder] = useState(false);

  // Debug: Log entregables para diagnóstico
  useEffect(() => {
    console.log('[DeliverablesGallery] Entregables recibidos:', {
      total: entregables.length,
      entregables: entregables.map(e => ({
        id: e.id,
        name: e.name,
        delivery_mode: e.delivery_mode,
        google_folder_id: e.google_folder_id,
        hasDriveContent: !!e.driveContent,
        driveContentFolders: e.driveContent?.folders.length || 0,
        driveContentItems: e.driveContent?.allItems.length || 0,
      })),
    });
  }, [entregables]);

  // Obtener todas las carpetas de todos los entregables
  const allFolders = useMemo(() => {
    const folders: Array<{ id: string; name: string; items: GoogleDriveFile[]; isRoot: boolean; subfoldersCount?: number }> = [];
    entregables.forEach((entregable) => {
      if (entregable.driveContent) {
        entregable.driveContent.folders.forEach((folder) => {
          folders.push({
            ...folder,
            isRoot: folder.id === entregable.google_folder_id,
          });
        });
      }
    });
    return folders;
  }, [entregables]);

  // Sincronizar carpeta desde URL al cargar (solo una vez al montar)
  useEffect(() => {
    const folderIdFromUrl = searchParams.get('folder');
    if (folderIdFromUrl && folderIdFromUrl !== currentFolderId) {
      setCurrentFolderId(folderIdFromUrl);
      // Limpiar path cuando se carga desde URL (se reconstruirá al navegar)
      setFolderPath([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  // Cargar contenido de carpeta dinámicamente
  useEffect(() => {
    if (currentFolderId && eventId && clientId) {
      loadFolderContent(currentFolderId);
    } else {
      setCurrentFolderData(null);
      setFolderPath([]);
    }
  }, [currentFolderId, eventId, clientId]);

  const loadFolderContent = async (folderId: string) => {
    if (!eventId || !clientId) return;
    
    setLoadingFolder(true);
    try {
      // Importación dinámica para evitar problemas de chunking
      const { obtenerContenidoCarpetaCliente } = await import('@/lib/actions/public/cliente/deliverables.actions');
      const result = await obtenerContenidoCarpetaCliente(eventId, clientId, folderId);
      if (result.success && result.data) {
        setCurrentFolderData(result.data);
        
        // Reconstruir path desde la carpeta actual si no existe
        // Esto es útil cuando se carga desde URL
        if (folderPath.length === 0 && result.data.folder) {
          // Si estamos cargando desde URL y no tenemos path, necesitamos reconstruirlo
          // Por ahora, solo establecemos el folder actual
          // El path completo se puede reconstruir navegando hacia atrás si es necesario
        }
      } else {
        console.error('[DeliverablesGallery] Error cargando carpeta:', result.error);
      }
    } catch (error) {
      console.error('[DeliverablesGallery] Error cargando carpeta:', error);
    } finally {
      setLoadingFolder(false);
    }
  };

  // Items de la carpeta actual
  const currentItems = useMemo(() => {
    const items = currentFolderData?.items || [];
    // Debug: Log items para verificar que tienen los campos necesarios
    if (items.length > 0) {
      console.log('[DeliverablesGallery] Items de carpeta actual:', {
        total: items.length,
        firstItem: items[0] ? {
          id: items[0].id,
          name: items[0].name,
          mimeType: items[0].mimeType,
          thumbnailLink: items[0].thumbnailLink,
          webViewLink: items[0].webViewLink,
          webContentLink: items[0].webContentLink,
        } : null,
      });
    }
    return items;
  }, [currentFolderData]);

  // Filtrar items según tipo
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return currentItems;
    if (filterType === 'photos') {
      return currentItems.filter((item) => item.mimeType.startsWith('image/'));
    }
    if (filterType === 'videos') {
      return currentItems.filter((item) => item.mimeType.startsWith('video/'));
    }
    return currentItems;
  }, [currentItems, filterType]);

  // Helper para convertir webContentLink al formato que funciona
  const convertToDirectDownloadUrl = (webContentLink: string | undefined, fileId: string | undefined): string | undefined => {
    if (!webContentLink || !fileId) return undefined;
    
    // Si ya es el formato correcto, retornarlo
    if (webContentLink.includes('drive.usercontent.google.com')) {
      return webContentLink;
    }
    
    // Convertir de formato: https://drive.google.com/uc?id=FILE_ID&export=download
    // A formato: https://drive.usercontent.google.com/download?id=FILE_ID
    try {
      const url = new URL(webContentLink);
      const idParam = url.searchParams.get('id');
      if (idParam) {
        return `https://drive.usercontent.google.com/download?id=${idParam}`;
      }
      // Si no tiene id en params, usar el fileId directamente
      return `https://drive.usercontent.google.com/download?id=${fileId}`;
    } catch {
      // Si falla el parsing, usar fileId directamente
      return `https://drive.usercontent.google.com/download?id=${fileId}`;
    }
  };

  // Preparar slides para lightbox
  // Usar proxy API (preferido) o convertir webContentLink al formato directo
  const lightboxSlides = useMemo(() => {
    return filteredItems.map((item) => {
      // Generar URL del proxy API para el archivo completo
      const proxyUrl = item.id ? `${window.location.origin}/api/cliente/drive/${eventId}/${item.id}?clientId=${encodeURIComponent(clientId)}` : '';
      
      // También generar URL directa como fallback
      const directUrl = convertToDirectDownloadUrl(item.webContentLink, item.id);
      
      if (item.mimeType.startsWith('video/')) {
        return {
          type: 'video' as const,
          sources: [
            {
              src: proxyUrl || directUrl || item.webViewLink || item.webContentLink || '',
              type: item.mimeType,
            },
          ],
          poster: item.thumbnailLink || '',
          autoPlay: false,
          muted: false,
          controls: true,
          playsInline: true,
        };
      }
      // Para imágenes, priorizar proxy API, luego URL directa, luego thumbnail
      return {
        src: proxyUrl || directUrl || item.thumbnailLink || item.webViewLink || '',
        alt: item.name,
      };
    });
  }, [filteredItems, eventId, clientId]);

  const handleItemClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDownload = (item: GoogleDriveFile) => {
    // Abrir en nueva pestaña para descarga
    if (item.webViewLink) {
      window.open(item.webViewLink, '_blank');
    } else if (item.webContentLink) {
      window.open(item.webContentLink, '_blank');
    }
  };

  // Actualizar URL cuando cambia la carpeta
  const updateUrl = (folderId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (folderId) {
      params.set('folder', folderId);
    } else {
      params.delete('folder');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  const handleFolderClick = async (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderPath([...folderPath, { id: folderId, name: folderName }]);
    setFilterType('all'); // Resetear filtro al cambiar de carpeta
    updateUrl(folderId);
  };

  const handleBack = () => {
    if (folderPath.length > 0) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      if (newPath.length > 0) {
        const newFolderId = newPath[newPath.length - 1].id;
        setCurrentFolderId(newFolderId);
        updateUrl(newFolderId);
      } else {
        setCurrentFolderId(null);
        updateUrl(null);
      }
    } else {
      setCurrentFolderId(null);
      updateUrl(null);
    }
    setFilterType('all');
  };

  if (loading) {
    return (
      <ZenCard>
        <div className="p-12 text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Cargando entregables...</p>
        </div>
      </ZenCard>
    );
  }

  // Si no hay entregables con Google Drive
  const hasGoogleDriveContent = entregables.some((e) => {
    const hasContent = e.driveContent && e.driveContent.allItems.length > 0;
    if (e.delivery_mode === 'google_drive' && !hasContent) {
      console.log(`[DeliverablesGallery] Entregable ${e.id} es Google Drive pero sin contenido:`, {
        hasDriveContent: !!e.driveContent,
        foldersCount: e.driveContent?.folders.length || 0,
        allItemsCount: e.driveContent?.allItems.length || 0,
      });
    }
    return hasContent;
  });
  const nativeDeliverables = entregables.filter((e) => e.delivery_mode === 'native' && e.file_url);
  const googleDriveDeliverables = entregables.filter((e) => e.delivery_mode === 'google_drive');
  const hasGoogleDriveButNoContent = googleDriveDeliverables.length > 0 && !hasGoogleDriveContent;

  // Si hay entregables de Google Drive pero sin contenido, mostrar mensaje informativo
  if (googleDriveDeliverables.length > 0 && !hasGoogleDriveContent) {
    return (
      <div className="space-y-6">
        {/* Mostrar entregables nativos si existen */}
        {nativeDeliverables.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-300">Enlaces de descarga</h3>
            <div className="space-y-2">
              {nativeDeliverables.map((entregable) => (
                <ZenCard key={entregable.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-200 truncate">
                        {entregable.name}
                      </h4>
                      {entregable.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {entregable.description}
                        </p>
                      )}
                    </div>
                    {entregable.file_url && (
                      <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(entregable.file_url!, '_blank')}
                        className="ml-4 shrink-0"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </ZenButton>
                    )}
                  </div>
                </ZenCard>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje sobre Google Drive */}
        <ZenCard className="border-yellow-500/20 bg-yellow-950/10">
          <div className="p-12 text-center">
            <Folder className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">
              Google Drive no disponible
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              {hasGoogleDriveButNoContent
                ? 'El estudio ha desconectado Google Drive o la carpeta no está disponible. Los entregables no están disponibles temporalmente.'
                : 'Hay entregables de Google Drive configurados, pero no se pudo obtener el contenido.'}
            </p>
            <p className="text-xs text-zinc-500">
              Entregables de Google Drive: {googleDriveDeliverables.length}
            </p>
          </div>
        </ZenCard>
      </div>
    );
  }

  if (!hasGoogleDriveContent && nativeDeliverables.length === 0) {
    return (
      <ZenCard>
        <div className="p-12 text-center">
          <Folder className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-200 mb-2">
            No hay entregables disponibles
          </h3>
          <p className="text-sm text-zinc-400">
            Los entregables aparecerán aquí cuando el estudio los comparta contigo.
          </p>
        </div>
      </ZenCard>
    );
  }

  // Si hay carpeta seleccionada, mostrar su contenido
  if (currentFolderId && currentFolderData) {
    const photosCount = currentFolderData.items.filter(i => i.mimeType.startsWith('image/')).length;
    const videosCount = currentFolderData.items.filter(i => i.mimeType.startsWith('video/')).length;

    return (
      <div className="space-y-6">
        {/* Breadcrumb y botón volver */}
        <div className="flex items-center gap-2 flex-wrap">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </ZenButton>
          <div className="flex items-center gap-1 text-sm text-zinc-400">
            {folderPath.map((pathItem, index) => (
              <React.Fragment key={`${pathItem.id}-${index}`}>
                {index > 0 && <span>/</span>}
                <span>{pathItem.name}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {loadingFolder && (
          <ZenCard>
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Cargando carpeta...</p>
            </div>
          </ZenCard>
        )}

        {/* Subcarpetas dentro de la carpeta actual */}
        {!loadingFolder && currentFolderData && currentFolderData.subfolders.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Subcarpetas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {currentFolderData.subfolders.map((subfolder) => (
                <ZenCard
                  key={subfolder.id}
                  className="p-4 cursor-pointer hover:border-emerald-500/50 transition-all"
                  onClick={() => handleFolderClick(subfolder.id, subfolder.name)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-zinc-800/50 rounded-lg">
                      <Folder className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-200 truncate mb-1">
                        {subfolder.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        {subfolder.photosCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Image className="h-3 w-3" />
                            {subfolder.photosCount}
                          </span>
                        )}
                        {subfolder.videosCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {subfolder.videosCount}
                          </span>
                        )}
                        <span>{subfolder.totalCount} {subfolder.totalCount === 1 ? 'archivo' : 'archivos'}</span>
                      </div>
                    </div>
                  </div>
                </ZenCard>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        {!loadingFolder && currentFolderData && currentFolderData.items.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <h4 className="text-sm font-medium text-zinc-300 mr-2">Archivos:</h4>
            <ZenButton
              variant={filterType === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Todos ({currentFolderData.items.length})
            </ZenButton>
          <ZenButton
            variant={filterType === 'photos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('photos')}
          >
            <Image className="h-4 w-4 mr-1" />
            Fotos ({photosCount})
          </ZenButton>
            <ZenButton
              variant={filterType === 'videos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('videos')}
            >
              <Video className="h-4 w-4 mr-1" />
              Videos ({videosCount})
            </ZenButton>
          </div>
        )}

        {/* Galería de items */}
        {!loadingFolder && currentFolderData && (
          <>
            {filteredItems.length === 0 ? (
          <ZenCard>
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-400">
                No hay {filterType === 'photos' ? 'fotos' : filterType === 'videos' ? 'videos' : 'archivos'} en esta carpeta
              </p>
            </div>
          </ZenCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item, index) => {
              const isVideo = item.mimeType.startsWith('video/');
              const isImage = item.mimeType.startsWith('image/');
              
              // Para thumbnails, usar thumbnailLink si está disponible
              // Si no hay thumbnailLink, usar webViewLink como fallback para imágenes
              const thumbnailUrl = item.thumbnailLink || (isImage ? item.webViewLink : undefined);
              
              // Debug: Log para ver qué está pasando con los thumbnails
              if (index === 0) {
                console.log('[DeliverablesGallery] Primer item:', {
                  id: item.id,
                  name: item.name,
                  mimeType: item.mimeType,
                  thumbnailLink: item.thumbnailLink,
                  webViewLink: item.webViewLink,
                  webContentLink: item.webContentLink,
                  thumbnailUrl,
                  isImage,
                  isVideo,
                });
              }

              return (
                <div
                  key={item.id}
                  className="group relative aspect-square bg-zinc-800/50 rounded-lg border border-zinc-800 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all"
                  onClick={() => handleItemClick(index)}
                >
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Si el thumbnail falla (probablemente por CORS), usar proxy API
                        console.warn('[DeliverablesGallery] Thumbnail falló, usando proxy API:', {
                          url: thumbnailUrl,
                          itemId: item.id,
                          itemName: item.name,
                        });
                        const target = e.target as HTMLImageElement;
                        // Intentar con proxy API como fallback
                        const proxyUrl = `${window.location.origin}/api/cliente/drive/${eventId}/${item.id}?clientId=${encodeURIComponent(clientId)}`;
                        target.src = proxyUrl;
                        // Si el proxy también falla, mostrar placeholder
                        target.onerror = () => {
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const placeholder = parent.querySelector('.thumbnail-placeholder') as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }
                        };
                      }}
                      onLoad={() => {
                        console.log('[DeliverablesGallery] Thumbnail cargado exitosamente:', {
                          url: thumbnailUrl,
                          itemId: item.id,
                        });
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <p className="text-xs text-zinc-500">Sin thumbnail</p>
                    </div>
                  )}
                  
                  {/* Placeholder si no hay thumbnail o falla */}
                  <div className="thumbnail-placeholder w-full h-full flex items-center justify-center bg-zinc-800" style={{ display: thumbnailUrl ? 'none' : 'flex' }}>
                    {isVideo ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-zinc-500" />
                        <Play className="absolute h-8 w-8 text-white/80" fill="currentColor" />
                      </div>
                    ) : (
                      <Image className="h-12 w-12 text-zinc-500" />
                    )}
                  </div>

                  {/* Overlay con acciones */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Botón de descarga en el lado derecho inferior */}
                    <div className="absolute bottom-2 right-2">
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                        className="text-white hover:text-emerald-400 bg-black/50 hover:bg-black/70"
                      >
                        <Download className="h-4 w-4" />
                      </ZenButton>
                    </div>
                  </div>

                  {/* Badge de tipo */}
                  {isVideo && (
                    <div className="absolute top-2 right-2 bg-black/70 rounded px-1.5 py-0.5">
                      <Video className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Nombre del archivo */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{item.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </>
        )}

        {!loadingFolder && currentFolderData && currentFolderData.items.length === 0 && currentFolderData.subfolders.length === 0 && (
          <ZenCard>
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-400">Esta carpeta está vacía.</p>
            </div>
          </ZenCard>
        )}

        {/* Lightbox */}
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
          plugins={[VideoPlugin, Zoom]}
          video={{
            controls: true,
            playsInline: true,
            autoPlay: false,
            muted: false,
            loop: false,
          }}
          on={{
            view: ({ index }) => setLightboxIndex(index),
          }}
          controller={{
            closeOnPullDown: true,
            closeOnBackdropClick: true,
          }}
          styles={{
            container: {
              backgroundColor: 'rgba(0, 0, 0, .98)',
            },
          }}
        />
      </div>
    );
  }

  // Vista de carpetas (cuando no hay carpeta seleccionada)
  // Solo mostrar subcarpetas, no la carpeta raíz
  const subFolders = allFolders.filter(f => !f.isRoot);

  return (
    <div className="space-y-6">
      {/* Entregables nativos (URLs manuales) */}
      {nativeDeliverables.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">Enlaces de descarga</h3>
          <div className="space-y-2">
            {nativeDeliverables.map((entregable) => (
              <ZenCard key={entregable.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-200 truncate">
                      {entregable.name}
                    </h4>
                    {entregable.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {entregable.description}
                      </p>
                    )}
                  </div>
                  {entregable.file_url && (
                    <ZenButton
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(entregable.file_url!, '_blank')}
                      className="ml-4 shrink-0"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </ZenButton>
                  )}
                </div>
              </ZenCard>
            ))}
          </div>
        </div>
      )}

      {/* Vista de carpetas de Google Drive - Solo subcarpetas */}
      {hasGoogleDriveContent && (
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Carpetas de entregables</h3>
          
          {subFolders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {subFolders.map((folder) => {
                const photosCount = folder.items.filter(i => i.mimeType.startsWith('image/')).length;
                const videosCount = folder.items.filter(i => i.mimeType.startsWith('video/')).length;
                const itemsCount = folder.items.length;
                const subfoldersCount = folder.subfoldersCount || 0;
                const totalCount = subfoldersCount + itemsCount; // Total: subcarpetas + items

                return (
                  <ZenCard
                    key={folder.id}
                    className="p-4 cursor-pointer hover:border-emerald-500/50 transition-all"
                    onClick={() => handleFolderClick(folder.id, folder.name)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-zinc-800/50 rounded-lg">
                        <Folder className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-zinc-200 truncate mb-1">
                          {folder.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          {photosCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              {photosCount}
                            </span>
                          )}
                          {videosCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              {videosCount}
                            </span>
                          )}
                          <span>{totalCount} {totalCount === 1 ? 'archivo' : 'archivos'}</span>
                        </div>
                      </div>
                    </div>
                  </ZenCard>
                );
              })}
            </div>
          ) : (
            <ZenCard>
              <div className="p-8 text-center">
                <Folder className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                <p className="text-sm text-zinc-400">
                  No hay subcarpetas disponibles en este entregable.
                </p>
              </div>
            </ZenCard>
          )}
        </div>
      )}
    </div>
  );
}
