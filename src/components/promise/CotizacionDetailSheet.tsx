'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, Tag as TagIcon, Edit, Image as ImageIcon, Video, Images } from 'lucide-react';
import { ZenButton, ZenBadge, SeparadorZen } from '@/components/ui/zen';
import type { PublicCotizacion } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { AutorizarCotizacionModal } from './AutorizarCotizacionModal';
import { SolicitarPersonalizacionModal } from './SolicitarPersonalizacionModal';
import { CondicionesComercialesSelector } from './shared/CondicionesComercialesSelector';
import { PrecioDesglose } from './shared/PrecioDesglose';
import { TerminosCondiciones } from './shared/TerminosCondiciones';
import { obtenerCondicionesComercialesPublicas, obtenerTerminosCondicionesPublicos, filtrarCondicionesPorPreferencias } from '@/lib/actions/public/promesas.actions';
import { formatCurrency } from '@/lib/actions/utils/formatting';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import Lightbox from 'yet-another-react-lightbox';
import VideoPlugin from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  discount_percentage: number | null;
  type?: string;
  metodos_pago: Array<{
    id: string;
    metodo_pago_id: string;
    metodo_pago_name: string;
  }>;
}

interface TerminoCondicion {
  id: string;
  title: string;
  content: string;
  is_required: boolean;
}

interface CotizacionDetailSheetProps {
  cotizacion: PublicCotizacion;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComerciales?: CondicionComercial[];
  terminosCondiciones?: TerminoCondicion[];
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  paquetes?: Array<{ id: string; cover_url: string | null }>;
}

export function CotizacionDetailSheet({
  cotizacion,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComerciales: condicionesComercialesIniciales,
  terminosCondiciones: terminosCondicionesIniciales,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  paquetes = [],
}: CotizacionDetailSheetProps) {
  const [showAutorizarModal, setShowAutorizarModal] = useState(false);
  const [showPersonalizacionModal, setShowPersonalizacionModal] = useState(false);
  const [condicionesComerciales, setCondicionesComerciales] = useState<CondicionComercial[]>([]);
  const [terminosCondiciones, setTerminosCondiciones] = useState<TerminoCondicion[]>([]);
  const [selectedCondicionId, setSelectedCondicionId] = useState<string | null>(null);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState<string | null>(null);
  const [loadingCondiciones, setLoadingCondiciones] = useState(true);
  const [currentCotizacion, setCurrentCotizacion] = useState(cotizacion);
  const precioDesgloseRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Actualizar cotización cuando cambia la prop
  useEffect(() => {
    setCurrentCotizacion(cotizacion);
  }, [cotizacion]);

  const loadCondicionesYTerminos = useCallback(async () => {
    setLoadingCondiciones(true);
    try {
      const [condicionesResult, terminosResult] = await Promise.all([
        obtenerCondicionesComercialesPublicas(studioSlug),
        obtenerTerminosCondicionesPublicos(studioSlug),
      ]);

      if (condicionesResult.success && condicionesResult.data) {
        // Filtrar condiciones según preferencias
        const condicionesFiltradas = await filtrarCondicionesPorPreferencias(
          studioSlug,
          condicionesResult.data,
          showStandardConditions,
          showOfferConditions
        );
        setCondicionesComerciales(condicionesFiltradas);
      }

      if (terminosResult.success && terminosResult.data) {
        setTerminosCondiciones(terminosResult.data);
      }
    } catch (error) {
      console.error('[CotizacionDetailSheet] Error al cargar condiciones y términos:', error);
    } finally {
      setLoadingCondiciones(false);
    }
  }, [studioSlug, showStandardConditions, showOfferConditions]);

  useEffect(() => {
    if (isOpen) {
      // Si ya tenemos los datos iniciales, usarlos directamente
      if (condicionesComercialesIniciales || terminosCondicionesIniciales) {
        if (condicionesComercialesIniciales) {
          setCondicionesComerciales(condicionesComercialesIniciales);
        }
        if (terminosCondicionesIniciales) {
          setTerminosCondiciones(terminosCondicionesIniciales);
        }
        setLoadingCondiciones(false);
      } else {
        // Si no, cargarlos
        loadCondicionesYTerminos();
      }
    }
  }, [isOpen, studioSlug, condicionesComercialesIniciales, terminosCondicionesIniciales, loadCondicionesYTerminos]);

  const handleSelectCondicion = (condicionId: string, metodoPagoId: string) => {
    setSelectedCondicionId(condicionId);
    // Si el metodoPagoId es igual al condicionId, significa que no hay método de pago específico
    setSelectedMetodoPagoId(metodoPagoId === condicionId ? null : metodoPagoId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };


  const finalPrice = useMemo(() => {
    if (!currentCotizacion.discount) return currentCotizacion.price;
    return currentCotizacion.price - (currentCotizacion.price * currentCotizacion.discount) / 100;
  }, [currentCotizacion]);

  const hasDiscount = useMemo(() => {
    return currentCotizacion.discount && currentCotizacion.discount > 0;
  }, [currentCotizacion]);

  // Calcular precio según condición comercial seleccionada
  const calculatePriceWithCondition = () => {
    if (!selectedCondicionId) return null;

    const condicion = condicionesComerciales.find(c => c.id === selectedCondicionId);
    if (!condicion) return null;

    // Precio base (ya con descuento de cotización si aplica)
    const precioBase = finalPrice;

    // Aplicar descuento adicional de la condición comercial
    const descuentoCondicion = condicion.discount_percentage ?? 0;
    const precioConDescuento = descuentoCondicion > 0
      ? precioBase - (precioBase * descuentoCondicion) / 100
      : precioBase;

    // Calcular anticipo según tipo
    const advanceType: 'percentage' | 'fixed_amount' = (condicion.advance_type === 'fixed_amount' || condicion.advance_type === 'percentage')
      ? condicion.advance_type
      : 'percentage';
    const anticipo = advanceType === 'fixed_amount' && condicion.advance_amount
      ? condicion.advance_amount
      : (condicion.advance_percentage ?? 0) > 0
        ? (precioConDescuento * (condicion.advance_percentage ?? 0)) / 100
        : 0;
    const anticipoPorcentaje = advanceType === 'percentage' ? (condicion.advance_percentage ?? 0) : null;
    const anticipoMontoFijo: number | null = advanceType === 'fixed_amount' ? (condicion.advance_amount ?? null) : null;

    // Calcular diferido
    const diferido = precioConDescuento - anticipo;

    return {
      precioBase,
      descuentoCondicion,
      precioConDescuento,
      advanceType,
      anticipoPorcentaje,
      anticipoMontoFijo,
      anticipo,
      diferido,
    };
  };

  const precioCalculado = calculatePriceWithCondition();

  // Scroll automático al desglose cuando se selecciona una condición comercial
  useEffect(() => {
    if (precioCalculado && precioDesgloseRef.current) {
      setTimeout(() => {
        precioDesgloseRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
    }
  }, [precioCalculado]);

  // Escuchar cambios en la cotización específica usando Realtime
  // Usar ref para mantener el ID actual sin depender del closure
  const currentCotizacionIdRef = useRef(currentCotizacion.id);
  const isOpenRef = useRef(isOpen);

  // Actualizar refs cuando cambian
  useEffect(() => {
    currentCotizacionIdRef.current = currentCotizacion.id;
  }, [currentCotizacion.id]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const handleCotizacionUpdated = useCallback(async (cotizacionId: string) => {
    // Solo procesar si el sheet está abierto y es la cotización actual
    if (!isOpenRef.current) {
      return;
    }

    if (cotizacionId === currentCotizacionIdRef.current) {
      // Recargar datos de la cotización
      try {
        const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
        const result = await getPublicPromiseData(studioSlug, promiseId);
        if (result.success && result.data?.cotizaciones) {
          const updatedCotizacion = result.data.cotizaciones.find(c => c.id === cotizacionId);
          if (updatedCotizacion) {
            setCurrentCotizacion(updatedCotizacion);
          }
        }
      } catch (error) {
        // Error silencioso - no afecta la UX
      }
    }
  }, [studioSlug, promiseId]);

  // Suscribirse siempre (el callback verifica si el sheet está abierto usando refs)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: handleCotizacionUpdated,
  });

  // Determinar multimedia disponible de los items
  const mediaInfo = useMemo(() => {
    if (!currentCotizacion.items_media || currentCotizacion.items_media.length === 0) {
      return null;
    }

    const fotos = currentCotizacion.items_media.filter(m => m.file_type === 'IMAGE');
    const videos = currentCotizacion.items_media.filter(m => m.file_type === 'VIDEO');

    return {
      fotos: fotos.length > 0 ? fotos : null,
      videos: videos.length > 0 ? videos : null,
      tieneFotos: fotos.length > 0,
      tieneVideos: videos.length > 0,
      tieneAmbos: fotos.length > 0 && videos.length > 0,
    };
  }, [currentCotizacion.items_media]);

  // Preparar slides para Lightbox
  const lightboxSlides = useMemo(() => {
    if (!mediaInfo) return [];

    const slides: Array<{ src?: string; alt?: string; type?: 'video'; sources?: Array<{ src: string; type: string }>; poster?: string; autoPlay?: boolean; muted?: boolean; controls?: boolean; playsInline?: boolean }> = [];

    // Agregar fotos primero
    if (mediaInfo.fotos) {
      mediaInfo.fotos.forEach((foto) => {
        slides.push({
          src: foto.file_url,
          alt: currentCotizacion.name,
        });
      });
    }

    // Agregar videos después
    if (mediaInfo.videos) {
      mediaInfo.videos.forEach((video) => {
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
    }

    return slides;
  }, [mediaInfo, currentCotizacion.name]);

  const handleOpenLightbox = (startIndex: number = 0) => {
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const handleOpenFotos = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!mediaInfo?.fotos) return;
    // Encontrar el índice de la primera foto
    const firstFotoIndex = 0; // Las fotos siempre van primero
    handleOpenLightbox(firstFotoIndex);
  };

  const handleOpenVideos = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!mediaInfo?.videos) return;
    // Encontrar el índice del primer video (después de todas las fotos)
    const firstVideoIndex = mediaInfo.fotos?.length || 0;
    handleOpenLightbox(firstVideoIndex);
  };

  const handleOpenGaleria = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    handleOpenLightbox(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                {currentCotizacion.name}
              </h2>
              {currentCotizacion.description && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                  {currentCotizacion.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Precio principal */}
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-400 mb-2">Precio Total</p>
                {hasDiscount && (
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-lg text-zinc-500 line-through">
                      {formatPrice(cotizacion.price)}
                    </span>
                    <ZenBadge className="bg-red-500/20 text-red-400 border-red-500/30">
                      -{cotizacion.discount}% de descuento
                    </ZenBadge>
                  </div>
                )}
                <p className="text-4xl font-bold text-blue-400">
                  {formatPrice(finalPrice)}
                </p>
              </div>

              {currentCotizacion.paquete_origen && (
                <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 shrink-0">
                  <TagIcon className="h-4 w-4 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">Basado en</p>
                    <p className="text-sm font-medium text-blue-300 truncate">
                      {currentCotizacion.paquete_origen.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <SeparadorZen />

          {/* Servicios incluidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Servicios Incluidos
            </h3>
            <PublicServiciosTree
              servicios={cotizacion.servicios}
              showPrices={showItemsPrices}
              showSubtotals={showCategoriesSubtotals}
            />
          </div>

          {/* Condiciones comerciales */}
          <SeparadorZen />
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Condiciones Comerciales
            </h3>
            <CondicionesComercialesSelector
              condiciones={condicionesComerciales}
              selectedCondicionId={selectedCondicionId}
              selectedMetodoPagoId={selectedMetodoPagoId}
              onSelectCondicion={handleSelectCondicion}
              loading={loadingCondiciones}
            />

            {/* Cálculo de precio según condición comercial */}
            {precioCalculado && (
              <PrecioDesglose
                ref={precioDesgloseRef}
                precioBase={precioCalculado.precioBase}
                descuentoCondicion={precioCalculado.descuentoCondicion}
                precioConDescuento={precioCalculado.precioConDescuento}
                advanceType={precioCalculado.advanceType}
                anticipoPorcentaje={precioCalculado.anticipoPorcentaje}
                anticipo={precioCalculado.anticipo}
                diferido={precioCalculado.diferido}
              />
            )}

            {/* Términos y condiciones */}
            <TerminosCondiciones terminos={terminosCondiciones} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 py-3">
          <div className="flex gap-2">
            {!currentCotizacion.selected_by_prospect && (
              <ZenButton
                variant="ghost"
                onClick={() => setShowPersonalizacionModal(true)}
                className="shrink-0"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Personalizar
              </ZenButton>
            )}
            <ZenButton
              onClick={() => setShowAutorizarModal(true)}
              className="flex-1"
              size="sm"
              disabled={!selectedCondicionId}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Autorizar
            </ZenButton>
          </div>
        </div>
      </div>

      {/* Modal de contratación */}
      {showAutorizarModal && (
        <AutorizarCotizacionModal
          cotizacion={currentCotizacion}
          isOpen={showAutorizarModal}
          onClose={() => setShowAutorizarModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
          condicionesComercialesId={selectedCondicionId}
          condicionesComercialesMetodoPagoId={selectedMetodoPagoId}
          precioCalculado={precioCalculado}
          showPackages={showPackages}
          onSuccess={onClose}
        />
      )}

      {/* Modal de personalización */}
      {showPersonalizacionModal && (
        <SolicitarPersonalizacionModal
          itemName={currentCotizacion.name}
          itemType="cotizacion"
          itemId={currentCotizacion.id}
          isOpen={showPersonalizacionModal}
          onClose={() => setShowPersonalizacionModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
          showPackages={showPackages}
        />
      )}

      {/* Lightbox */}
      {mediaInfo && lightboxSlides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
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
    </>
  );
}

