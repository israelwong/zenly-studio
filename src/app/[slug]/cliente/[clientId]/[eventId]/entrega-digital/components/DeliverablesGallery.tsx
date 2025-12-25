'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Image, Video, Download, Folder, Loader2, ArrowLeft, Play, Files } from 'lucide-react';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import Lightbox from 'yet-another-react-lightbox';
import VideoPlugin from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { ClienteDeliverable } from '@/lib/actions/cliente';
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
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);


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
      const { obtenerContenidoCarpetaCliente } = await import('@/lib/actions/cliente/deliverables.actions');
      const result = await obtenerContenidoCarpetaCliente(eventId, clientId, folderId);

      if (result.success && result.data) {
        // Los items ya vienen ordenados numéricamente del servidor
        setCurrentFolderData({
          folder: result.data.folder,
          subfolders: result.data.subfolders,
          items: result.data.items,
        });

        // Reconstruir path desde la carpeta actual si no existe
        if (folderPath.length === 0 && result.data.folder) {
          // Si estamos cargando desde URL y no tenemos path, necesitamos reconstruirlo
          // Por ahora, solo establecemos el folder actual
          // El path completo se puede reconstruir navegando hacia atrás si es necesario
        }
      }
    } catch (error) {
    } finally {
      setLoadingFolder(false);
    }
  };

  // Función para ordenamiento numérico natural (1, 2, 10, 11... en lugar de 1, 10, 11, 2...)
  // Usa localeCompare con opción numeric para ordenamiento natural
  const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  };

  // Filtrar items según tipo (ya vienen ordenados del servidor)
  const filteredItems = useMemo(() => {
    if (!currentFolderData) return [];

    let items = currentFolderData.items;

    if (filterType === 'photos') {
      items = currentFolderData.items.filter((item) => item.mimeType.startsWith('image/'));
    } else if (filterType === 'videos') {
      items = currentFolderData.items.filter((item) => item.mimeType.startsWith('video/'));
    }

    // Eliminar duplicados por ID (por si acaso)
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
    // No necesitamos ordenar, ya vienen ordenados del servidor
  }, [currentFolderData, filterType]);

  // No usamos virtualización compleja - renderizamos todos los items cargados
  // El navegador maneja el lazy loading automáticamente con loading="lazy"
  // La paginación (100 items por vez) ya limita la cantidad de DOM

  // Calcular contadores para mostrar (ya tenemos todos los items ordenados del servidor)
  const photosCount = currentFolderData?.items.filter(i => i.mimeType.startsWith('image/')).length ?? 0;
  const videosCount = currentFolderData?.items.filter(i => i.mimeType.startsWith('video/')).length ?? 0;
  const totalAll = currentFolderData?.items.length ?? 0;

  // Preparar slides para lightbox
  // ESTRATEGIA OPTIMIZADA PARA REDUCIR COSTOS DE ANCHO DE BANDA:
  // 
  // VISUALIZACIÓN (Lightbox):
  // - Imágenes: Proxy API (tráfico moderado, necesario para funcionar)
  // - Videos: Intentar webContentLink directo primero, fallback a proxy
  // 
  // DESCARGA (handleDownload):
  // - Videos: SIEMPRE webContentLink directo (ahorra 100TB/mes)
  // - Archivos grandes: webContentLink directo (ahorra 24TB/mes)
  // - Documentos de Google: Proxy API (necesitan exportación)
  //
  // RAZÓN: webContentLink está diseñado para descargas, no para visualización en navegador.
  // El tráfico de visualización es menor que el de descarga, así que optimizamos las descargas.
  const lightboxSlides = useMemo(() => {
    return filteredItems.map((item) => {
      // Proxy API para visualización (funciona siempre, tráfico moderado)
      const proxyUrl = item.id ? `${window.location.origin}/api/cliente/drive/${eventId}/${item.id}?clientId=${encodeURIComponent(clientId)}` : '';
      const isGoogleDoc = item.mimeType.startsWith('application/vnd.google-apps.');

      if (item.mimeType.startsWith('video/')) {
        // VIDEOS: Intentar webContentLink para visualización (puede funcionar en algunos casos)
        // Si no funciona, el lightbox usará el proxy como fallback
        // Nota: Para descargas, siempre usamos webContentLink directo (ver handleDownload)
        const videoUrl = item.webContentLink || proxyUrl || item.webViewLink || '';
        return {
          type: 'video' as const,
          sources: [
            {
              src: videoUrl,
              type: item.mimeType,
            },
          ],
          poster: item.thumbnailLink || '',
          autoPlay: true,
          muted: false,
          controls: true,
          playsInline: true,
        };
      }

      // IMÁGENES: Usar proxy API para visualización (funciona siempre)
      // El tráfico de visualización es moderado comparado con las descargas masivas
      // Las descargas grandes (videos, archivos grandes) sí usan webContentLink directo
      if (isGoogleDoc) {
        // Documentos de Google necesitan exportación, usar proxy API
        return {
          src: proxyUrl || item.thumbnailLink || '',
          alt: item.name,
        };
      }

      // Imágenes normales: usar proxy API para visualización (garantiza que funcione)
      return {
        src: proxyUrl || item.thumbnailLink || '',
        alt: item.name,
      };
    });
  }, [filteredItems, eventId, clientId]);

  const handleItemClick = (itemIndex: number) => {
    setLightboxIndex(itemIndex);
    setLightboxOpen(true);
  };

  const handleDownload = (item: GoogleDriveFile, e?: React.MouseEvent) => {
    // Prevenir que se abra el lightbox
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    setDownloadingFileId(item.id);

    const fileName = item.name || 'download';
    let downloadUrl: string;

    // Estrategia de descarga optimizada:
    // 1. Videos: SIEMPRE descarga directa (no pasan por nuestro servidor)
    // 2. Archivos grandes (>50MB): Descarga directa para ahorrar ancho de banda
    // 3. Documentos de Google: Proxy API (necesitan exportación)
    // 4. Archivos pequeños con webContentLink: Descarga directa (opcional, pero eficiente)

    const isVideo = item.mimeType?.startsWith('video/') || false;
    const isGoogleDoc = item.mimeType?.startsWith('application/vnd.google-apps.');
    const fileSizeMB = item.size ? parseInt(item.size) / (1024 * 1024) : 0;
    const isLargeFile = fileSizeMB > 50; // 50MB threshold (más conservador)
    const hasWebContentLink = !!item.webContentLink;

    if (isGoogleDoc) {
      // Documentos de Google necesitan exportación, usar proxy API
      downloadUrl = `${window.location.origin}/api/cliente/drive/${eventId}/${item.id}?clientId=${encodeURIComponent(clientId)}`;
    } else if ((isVideo || isLargeFile || hasWebContentLink) && item.webContentLink) {
      // Videos, archivos grandes, o cualquier archivo con webContentLink:
      // Descarga directa desde Google Drive (no pasa por nuestro servidor)
      // Esto ahorra ancho de banda y costos en Vercel
      downloadUrl = item.webContentLink.includes('&export=download')
        ? item.webContentLink
        : `${item.webContentLink}&export=download`;
    } else {
      // Fallback: usar proxy API si no hay webContentLink disponible
      downloadUrl = `${window.location.origin}/api/cliente/drive/${eventId}/${item.id}?clientId=${encodeURIComponent(clientId)}`;
    }

    // Crear link temporal para descargar sin abrir nueva pestaña
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.position = 'fixed';
    link.style.top = '-9999px';
    link.style.left = '-9999px';
    link.style.opacity = '0';
    link.style.pointerEvents = 'none';

    document.body.appendChild(link);
    link.click();

    // Remover el link y resetear estado después de un breve delay
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      setDownloadingFileId(null);
    }, 1000);
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

  // Detectar tipos de entregables antes del bloque de loading
  const nativeDeliverables = entregables.filter((e) => e.delivery_mode === 'native' && e.file_url);
  const googleDriveDeliverables = entregables.filter((e) => e.delivery_mode === 'google_drive');
  const hasNativeDeliverables = nativeDeliverables.length > 0;
  const hasGoogleDriveDeliverables = googleDriveDeliverables.length > 0;

  if (loading) {
    // Mostrar skeletons según los tipos de entregables detectados
    return (
      <div className="space-y-6">
        {/* Skeleton para enlaces de descarga si hay nativos o si aún no hay datos */}
        {(hasNativeDeliverables || entregables.length === 0) && (
          <div className="space-y-2">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(hasNativeDeliverables ? nativeDeliverables.length : 2)].map((_, i) => (
                <ZenCard key={i} className="p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-40 bg-zinc-700 rounded mb-2" />
                      <div className="h-3 w-full bg-zinc-700 rounded" />
                    </div>
                    <div className="h-8 w-24 bg-zinc-700 rounded ml-4" />
                  </div>
                </ZenCard>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton para carpetas de Google Drive si hay Google Drive o si aún no hay datos */}
        {(hasGoogleDriveDeliverables || entregables.length === 0) && (
          <div>
            <div className="h-4 w-40 bg-zinc-800 rounded mb-4 animate-pulse flex items-center gap-2">
              <div className="h-4 w-4 bg-zinc-700 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(hasGoogleDriveDeliverables ? googleDriveDeliverables.length : 3)].map((_, i) => (
                <ZenCard key={i} className="p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-zinc-800/50 rounded-lg">
                      <div className="h-6 w-6 bg-zinc-700 rounded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-24 bg-zinc-700 rounded mb-2" />
                      <div className="h-3 w-32 bg-zinc-700 rounded" />
                    </div>
                  </div>
                </ZenCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Si no hay entregables con Google Drive
  const hasGoogleDriveContent = entregables.some((e) => {
    const hasContent = e.driveContent && e.driveContent.allItems.length > 0;
    if (e.delivery_mode === 'google_drive' && !hasContent) {
      // Entregable Google Drive sin contenido
    }
    return hasContent;
  });
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
                ? 'El estudio ha desconectado Google Drive, la carpeta no está disponible, o no tiene permisos para acceder a la carpeta. Los entregables no están disponibles temporalmente. Contacta al estudio para resolver este problema.'
                : 'Hay entregables de Google Drive configurados, pero no se pudo obtener el contenido. Esto puede deberse a permisos insuficientes o a que la carpeta fue eliminada.'}
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
    return (
      <div className="space-y-6">
        {/* Breadcrumb y botón volver */}
        <div className="flex items-center gap-2 flex-wrap">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-zinc-400 hover:text-zinc-100 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </ZenButton>
          <div className="flex items-center gap-1 text-sm text-zinc-400 min-w-0 flex-1">
            {folderPath.length > 3 ? (
              // En mobile, si hay más de 3 carpetas, mostrar solo las últimas 2 con "..."
              <>
                <span className="text-zinc-500">...</span>
                <span>/</span>
                {folderPath.slice(-2).map((pathItem, index) => (
                  <React.Fragment key={`${pathItem.id}-${index}`}>
                    {index > 0 && <span>/</span>}
                    <span className="truncate max-w-[120px] sm:max-w-[200px]" title={pathItem.name}>
                      {pathItem.name}
                    </span>
                  </React.Fragment>
                ))}
              </>
            ) : (
              // Si hay 3 o menos carpetas, mostrar todas pero truncar nombres largos
              folderPath.map((pathItem, index) => (
                <React.Fragment key={`${pathItem.id}-${index}`}>
                  {index > 0 && <span>/</span>}
                  <span className="truncate max-w-[120px] sm:max-w-[200px]" title={pathItem.name}>
                    {pathItem.name}
                  </span>
                </React.Fragment>
              ))
            )}
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
              variant={filterType === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('all')}
              title="Todos los archivos"
            >
              <Files className="h-4 w-4 mr-1" />
              Todos ({totalAll})
            </ZenButton>
            <ZenButton
              variant={filterType === 'photos' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('photos')}
              title="Fotos"
            >
              <Image className="h-4 w-4 mr-1" />
              {photosCount}
            </ZenButton>
            <ZenButton
              variant={filterType === 'videos' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('videos')}
              title="Videos"
            >
              <Video className="h-4 w-4 mr-1" />
              {videosCount}
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
              <div
                ref={containerRef}
                className="max-h-[calc(100vh-300px)] overflow-y-auto"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Renderizar todos los items cargados - el navegador maneja lazy loading */}
                  {filteredItems.map((item, index) => {
                    const isVideo = item.mimeType.startsWith('video/');
                    const isImage = item.mimeType.startsWith('image/');

                    // Usar solo thumbnailLink para thumbnails (no webViewLink)
                    const thumbnailUrl = item.thumbnailLink;

                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className="group relative aspect-square bg-zinc-800/50 rounded-lg border border-zinc-800 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all"
                      >
                        {/* Contenido clickeable para lightbox */}
                        <div
                          className="absolute inset-0 z-[1]"
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
                                // Si el thumbnail falla, mostrar placeholder
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const placeholder = parent.querySelector('.thumbnail-placeholder') as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}

                          {/* Placeholder si no hay thumbnail o falla */}
                          <div className="thumbnail-placeholder w-full h-full flex items-center justify-center bg-zinc-800" style={{ display: thumbnailUrl ? 'none' : 'flex' }}>
                            {isVideo ? (
                              <div className="relative w-full h-full flex items-center justify-center">
                                <Video className="h-12 w-12 text-zinc-500" />
                                <Play className="absolute h-8 w-8 text-white/80" fill="currentColor" />
                              </div>
                            ) : isImage ? (
                              <Image className="h-12 w-12 text-zinc-500" />
                            ) : (
                              <Download className="h-12 w-12 text-zinc-500" />
                            )}
                          </div>

                          {/* Overlay con acciones */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Botón de descarga - debe estar arriba del contenido clickeable */}
                        <div
                          className="absolute bottom-2 right-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDownload(item, e)}
                            disabled={downloadingFileId === item.id}
                            className="text-white hover:text-emerald-400 bg-black/50 hover:bg-emerald-500/20 transition-colors"
                          >
                            {downloadingFileId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </ZenButton>
                        </div>

                        {/* Badge de tipo */}
                        {isVideo && (
                          <div className="absolute top-2 right-2 z-10 bg-black/70 rounded px-1.5 py-0.5">
                            <Video className="h-3 w-3 text-white" />
                          </div>
                        )}

                        {/* Nombre del archivo */}
                        <div className="absolute bottom-0 left-0 right-0 z-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-xs text-white truncate">{item.name}</p>
                        </div>
                      </div>
                    );
                  })}

                </div>
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
  // Determinar qué carpetas mostrar según la cantidad de entregables
  // Si hay 1 entregable: mostrar solo subcarpetas (comportamiento actual)
  // Si hay más de 1 entregable: mostrar las carpetas raíz
  const rootFolders = allFolders.filter(f => f.isRoot);
  const subFolders = allFolders.filter(f => !f.isRoot);
  const googleDriveDeliverablesCount = googleDriveDeliverables.length;

  // Si hay más de 1 entregable, mostrar carpetas raíz; si hay 1, mostrar subcarpetas
  const foldersToShow = googleDriveDeliverablesCount > 1 ? rootFolders : subFolders;

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

      {/* Vista de carpetas de Google Drive */}
      {hasGoogleDriveContent && (
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
            <img
              src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
              alt="Google Drive"
              className="h-4 w-4 object-contain brightness-0 invert"
            />
            {googleDriveDeliverablesCount > 1 ? 'Carpetas de Google Drive' : 'Carpetas de Google Drive'}
          </h3>

          {loading ? (
            <ZenCard>
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
                <p className="text-sm text-zinc-400">Cargando carpetas de Google Drive...</p>
              </div>
            </ZenCard>
          ) : foldersToShow.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {foldersToShow.map((folder) => {
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
                  {googleDriveDeliverablesCount > 1
                    ? 'No hay carpetas disponibles.'
                    : 'No hay subcarpetas disponibles en este entregable.'}
                </p>
              </div>
            </ZenCard>
          )}
        </div>
      )}
    </div>
  );
}
