'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Image as ImageIcon, Video, Images, Gift } from 'lucide-react';
import type { PublicSeccionData, PublicServicioData } from '@/types/public-promise';
import Lightbox from 'yet-another-react-lightbox';
import VideoPlugin from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface PublicServiciosTreeProps {
  servicios: PublicSeccionData[];
  showPrices?: boolean;
  showSubtotals?: boolean;
}

export function PublicServiciosTree({ servicios, showPrices = false, showSubtotals = false }: PublicServiciosTreeProps) {
  // ⚠️ SAFETY: Validar que servicios sea un array válido
  if (!Array.isArray(servicios) || servicios.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-400 text-sm">
        No hay servicios disponibles
      </div>
    );
  }

  // Inicializar todas las secciones y categorías expandidas por defecto
  const initialExpandedSections = useMemo(() => {
    try {
      return new Set(servicios.filter(s => s?.id).map(seccion => seccion.id));
    } catch (error) {
      console.error('[PublicServiciosTree] Error inicializando secciones:', error);
      return new Set<string>();
    }
  }, [servicios]);

  const initialExpandedCategories = useMemo(() => {
    try {
      const categories = new Set<string>();
      servicios.forEach(seccion => {
        if (seccion?.categorias && Array.isArray(seccion.categorias)) {
          seccion.categorias.forEach(categoria => {
            if (categoria?.id) {
              categories.add(categoria.id);
            }
          });
        }
      });
      return categories;
    } catch (error) {
      console.error('[PublicServiciosTree] Error inicializando categorías:', error);
      return new Set<string>();
    }
  }, [servicios]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(initialExpandedSections);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(initialExpandedCategories);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentServiceMedia, setCurrentServiceMedia] = useState<PublicServicioData['media']>(undefined);

  // Actualizar estados cuando cambien los servicios
  useEffect(() => {
    setExpandedSections(initialExpandedSections);
    setExpandedCategories(initialExpandedCategories);
  }, [initialExpandedSections, initialExpandedCategories]);

  const toggleSection = (seccionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seccionId)) {
        newSet.delete(seccionId);
      } else {
        newSet.add(seccionId);
      }
      return newSet;
    });
  };

  const toggleCategory = (categoriaId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
      }
      return newSet;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Función para verificar si un servicio es de tipo cotización
  const isCotizacionServicio = (servicio: PublicServicioData): boolean => {
    return 'quantity' in servicio && 'price' in servicio && servicio.quantity !== undefined && servicio.price !== undefined;
  };

  // Función para obtener información de multimedia de un servicio
  const getServiceMediaInfo = (servicio: PublicServicioData) => {
    if (!servicio.media || servicio.media.length === 0) {
      return null;
    }

    const fotos = servicio.media.filter(m => m.file_type === 'IMAGE');
    const videos = servicio.media.filter(m => m.file_type === 'VIDEO');

    return {
      fotos: fotos.length > 0 ? fotos : null,
      videos: videos.length > 0 ? videos : null,
      tieneFotos: fotos.length > 0,
      tieneVideos: videos.length > 0,
      tieneAmbos: fotos.length > 0 && videos.length > 0,
    };
  };

  // Preparar slides para Lightbox
  const prepareLightboxSlides = (media: PublicServicioData['media']) => {
    if (!media || media.length === 0) return [];

    const slides: Array<{ src?: string; alt?: string; type?: 'video'; sources?: Array<{ src: string; type: string }>; poster?: string; autoPlay?: boolean; muted?: boolean; controls?: boolean; playsInline?: boolean }> = [];

    const fotos = media.filter(m => m.file_type === 'IMAGE');
    const videos = media.filter(m => m.file_type === 'VIDEO');

    // Agregar fotos primero
    fotos.forEach((foto) => {
      slides.push({
        src: foto.file_url,
        alt: 'Imagen',
      });
    });

    // Agregar videos después
    videos.forEach((video) => {
      slides.push({
        type: 'video',
        sources: [{
          src: video.file_url,
          type: 'video/mp4',
        }],
        poster: video.file_url,
        autoPlay: true,
        muted: false,
        controls: true,
        playsInline: true,
      });
    });

    return slides;
  };

  const handleOpenLightbox = (servicio: PublicServicioData, startIndex: number = 0) => {
    setCurrentServiceMedia(servicio.media);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const handleOpenFotos = (servicio: PublicServicioData) => {
    if (!servicio.media) return;
    const fotos = servicio.media.filter(m => m.file_type === 'IMAGE');
    if (fotos.length === 0) return;
    handleOpenLightbox(servicio, 0);
  };

  const handleOpenVideos = (servicio: PublicServicioData) => {
    if (!servicio.media) return;
    const fotos = servicio.media.filter(m => m.file_type === 'IMAGE');
    const videos = servicio.media.filter(m => m.file_type === 'VIDEO');
    if (videos.length === 0) return;
    handleOpenLightbox(servicio, fotos.length);
  };

  const handleOpenGaleria = (servicio: PublicServicioData) => {
    handleOpenLightbox(servicio, 0);
  };

  return (
    <div className="space-y-2">
      {servicios.map((seccion) => {
          // ⚠️ SAFETY: Validar que seccion tenga datos necesarios
          if (!seccion || !seccion.id) {
            console.warn('[PublicServiciosTree] Sección inválida:', seccion);
            return null;
          }

          const seccionNombre = seccion.nombre || 'Sin sección';
          const seccionCategorias = Array.isArray(seccion.categorias) ? seccion.categorias : [];
          const isSectionExpanded = expandedSections.has(seccion.id);

          return (
            <div
              key={seccion.id}
              className="border border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Nivel 1: Sección */}
              <button
                onClick={() => toggleSection(seccion.id)}
                className="w-full flex items-center justify-start p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30 text-left"
              >
                <div className="flex items-center gap-2">
                  {isSectionExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <h4 className="font-semibold text-white">{seccionNombre}</h4>
                </div>
              </button>

              {isSectionExpanded && (
                <div className="bg-zinc-900/50">
                  {seccionCategorias.map((categoria, categoriaIndex) => {
                      // ⚠️ SAFETY: Validar que categoria tenga datos necesarios
                      if (!categoria || !categoria.id) {
                        console.warn('[PublicServiciosTree] Categoría inválida:', categoria);
                        return null;
                      }

                      const categoriaNombre = categoria.nombre || 'Sin categoría';
                      const categoriaServicios = Array.isArray(categoria.servicios) ? categoria.servicios : [];
                      const isCategoryExpanded = expandedCategories.has(categoria.id);
                      // Calcular subtotal por categoría: suma de (precio × cantidad) de todos los items
                      const totalPriceCategoria = categoriaServicios.reduce((sum, s) => {
                        const precio = s?.price ?? 0;
                        const cantidad = s?.quantity ?? 1;
                        return sum + (precio * cantidad);
                      }, 0);

                      return (
                        <div
                          key={categoria.id}
                          className={`${categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}`}
                        >
                          {/* Nivel 2: Categoría */}
                          <button
                            onClick={() => toggleCategory(categoria.id)}
                            className="w-full flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isCategoryExpanded ? (
                                <ChevronDown className="w-3 h-3 text-zinc-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-zinc-400" />
                              )}
                              <h5 className="text-sm font-medium text-zinc-300 text-left">{categoriaNombre}</h5>
                            </div>

                            {/* Mostrar subtotal por categoría solo si showSubtotals está activo */}
                            {showSubtotals && (
                              <span className="text-sm font-semibold text-blue-400 ml-auto pl-4">
                                {formatPrice(totalPriceCategoria)}
                              </span>
                            )}
                          </button>

                          {/* Nivel 3: Servicios */}
                          {isCategoryExpanded && (
                            <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                              <div className="divide-y divide-zinc-800/50">
                                {categoriaServicios.map((servicio, servicioIndex) => {
                                  // ⚠️ SAFETY: Validar que servicio tenga datos necesarios
                                  if (!servicio || !servicio.id) {
                                    console.warn('[PublicServiciosTree] Servicio inválido:', servicio);
                                    return null;
                                  }

                                  const servicioNombre = servicio.name_snapshot || servicio.name || 'Servicio personalizado';
                                  const servicioDescripcion = servicio.description_snapshot || servicio.description;
                                  const esCotizacion = isCotizacionServicio(servicio);
                                  const cantidad = esCotizacion ? (servicio.quantity || 1) : 1;
                                  const subtotal = esCotizacion
                                    ? (servicio.price || 0) * cantidad
                                    : 0;
                                  const esCortesia = servicio.is_courtesy === true || (esCotizacion && (servicio.price === 0 || servicio.price === undefined));
                                  const mediaInfo = getServiceMediaInfo(servicio);

                                  return (
                                    <div
                                      key={servicio.id}
                                      className={`py-3 px-4 pl-6 hover:bg-zinc-700/20 transition-colors ${servicioIndex === 0 ? 'pt-3' : ''
                                        }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h6 className="text-sm text-zinc-300 leading-tight flex items-center gap-1.5 flex-wrap">
                                              <span className="wrap-break-word">{servicioNombre}</span>
                                              {esCortesia && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                                  <Gift className="w-3 h-3" />
                                                  CORTESÍA
                                                </span>
                                              )}
                                              <span className="text-xs text-zinc-500 shrink-0">
                                                x{cantidad}{servicio.billing_type === 'HOUR' ? '/h' : ''}
                                              </span>
                                            </h6>
                                          </div>
                                          {servicioDescripcion && (
                                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                              {servicioDescripcion}
                                            </p>
                                          )}
                                          {/* Botones de media condicionales */}
                                          {mediaInfo && (
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                              {mediaInfo.tieneAmbos ? (
                                                <>
                                                  <button
                                                    onClick={() => handleOpenFotos(servicio)}
                                                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800/50"
                                                  >
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    Ver imágenes ({mediaInfo.fotos?.length || 0})
                                                  </button>
                                                  <button
                                                    onClick={() => handleOpenVideos(servicio)}
                                                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800/50"
                                                  >
                                                    <Video className="w-3.5 h-3.5" />
                                                    Ver videos ({mediaInfo.videos?.length || 0})
                                                  </button>
                                                  <button
                                                    onClick={() => handleOpenGaleria(servicio)}
                                                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800/50"
                                                  >
                                                    <Images className="w-3.5 h-3.5" />
                                                    Ver galería
                                                  </button>
                                                </>
                                              ) : mediaInfo.tieneFotos ? (
                                                <button
                                                  onClick={() => handleOpenFotos(servicio)}
                                                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800/50"
                                                >
                                                  <ImageIcon className="w-3.5 h-3.5" />
                                                  Ver imágenes ({mediaInfo.fotos?.length || 0})
                                                </button>
                                              ) : mediaInfo.tieneVideos ? (
                                                <button
                                                  onClick={() => handleOpenVideos(servicio)}
                                                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800/50"
                                                >
                                                  <Video className="w-3.5 h-3.5" />
                                                  Ver videos ({mediaInfo.videos?.length || 0})
                                                </button>
                                              ) : null}
                                            </div>
                                          )}
                                        </div>
                                        {/* Precio o Cortesía */}
                                        {showPrices && esCotizacion && (
                                          <span className="text-sm font-medium ml-4 shrink-0">
                                            {esCortesia ? (
                                              <span className="text-emerald-400/90">Incluido</span>
                                            ) : servicio.price !== undefined ? (
                                              formatPrice(subtotal)
                                            ) : null}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      
      {/* Lightbox */}
      {currentServiceMedia && currentServiceMedia.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={prepareLightboxSlides(currentServiceMedia)}
          plugins={[VideoPlugin, Zoom]}
          video={{
            controls: true,
            playsInline: true,
            autoPlay: true,
            muted: false,
            loop: false
          }}
          on={{
            view: ({ index }) => setLightboxIndex(index),
          }}
          controller={{
            closeOnPullDown: true,
            closeOnBackdropClick: true
          }}
          styles={{
            container: {
              backgroundColor: 'rgba(0, 0, 0, .98)',
            },
          }}
        />
      )}
    </div>
  );
}
