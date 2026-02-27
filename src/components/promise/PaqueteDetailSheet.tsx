'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Send, Image as ImageIcon, Video, Images, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ZenButton, SeparadorZen } from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { SolicitarPaqueteModal } from './SolicitarPaqueteModal';
import { CondicionesComercialesSelector } from './shared/CondicionesComercialesSelector';
import { PrecioDesglose } from './shared/PrecioDesglose';
import { TerminosCondiciones } from './shared/TerminosCondiciones';
import { obtenerCondicionesComercialesPublicas, obtenerTerminosCondicionesPublicos, filtrarCondicionesPorPreferencias } from '@/lib/actions/public/promesas.actions';
import { formatCurrency } from '@/lib/actions/utils/formatting';
import { formatPackagePriceSimple } from '@/lib/utils/package-price-formatter';
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
  /** false = solo negociación (condiciones_visibles); en paquetes solo mostrar is_public === true */
  is_public?: boolean;
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

interface PaqueteDetailSheetProps {
  paquete: PublicPaquete;
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  studioSlug: string;
  condicionesComerciales?: CondicionComercial[];
  terminosCondiciones?: TerminoCondicion[];
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  minDaysToHire?: number;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  cotizaciones?: Array<{ id: string; paquete_origen?: { id: string } | null; selected_by_prospect?: boolean }>;
  /** Fuente de verdad paquetes = promesa (promise.duration_hours). Multiplicadores x/h. */
  promiseDurationHours?: number | null;
}

export function PaqueteDetailSheet({
  paquete,
  isOpen,
  onClose,
  promiseId,
  studioSlug,
  condicionesComerciales: condicionesComercialesIniciales,
  terminosCondiciones: terminosCondicionesIniciales,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  minDaysToHire,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  cotizaciones = [],
  promiseDurationHours,
}: PaqueteDetailSheetProps) {
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [condicionesComerciales, setCondicionesComerciales] = useState<CondicionComercial[]>([]);
  const [terminosCondiciones, setTerminosCondiciones] = useState<TerminoCondicion[]>([]);
  const [selectedCondicionId, setSelectedCondicionId] = useState<string | null>(null);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState<string | null>(null);
  const [loadingCondiciones, setLoadingCondiciones] = useState(true);
  const precioDesgloseRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
      console.error('[PaqueteDetailSheet] Error al cargar condiciones y términos:', error);
    } finally {
      setLoadingCondiciones(false);
    }
  }, [studioSlug, showStandardConditions, showOfferConditions]);

  useEffect(() => {
    if (isOpen) {
      if (condicionesComercialesIniciales || terminosCondicionesIniciales) {
        if (condicionesComercialesIniciales) {
          // Paquetes: solo condiciones públicas (is_public !== false) y por tipo (standard/offer). Excluir "Clientes especiales" etc.
          const soloGenerales = condicionesComercialesIniciales.filter((c) => {
            if (c.is_public === false) return false;
            const tipo = c.type || 'standard';
            if (tipo === 'standard') return showStandardConditions;
            if (tipo === 'offer') return showOfferConditions;
            return false;
          });
          setCondicionesComerciales(soloGenerales);
        }
        if (terminosCondicionesIniciales) {
          setTerminosCondiciones(terminosCondicionesIniciales);
        }
        setLoadingCondiciones(false);
      } else {
        loadCondicionesYTerminos();
      }
    }
  }, [isOpen, studioSlug, condicionesComercialesIniciales, terminosCondicionesIniciales, showStandardConditions, showOfferConditions, loadCondicionesYTerminos]);

  const handleSelectCondicion = (condicionId: string, metodoPagoId: string) => {
    setSelectedCondicionId(condicionId);
    // Si el metodoPagoId es igual al condicionId, significa que no hay método de pago específico
    setSelectedMetodoPagoId(metodoPagoId === condicionId ? null : metodoPagoId);
  };

  const formatPrice = (price: number) => {
    return formatPackagePriceSimple(price);
  };


  // Calcular precio según condición comercial seleccionada
  const calculatePriceWithCondition = () => {
    if (!selectedCondicionId) return null;

    const condicion = condicionesComerciales.find(c => c.id === selectedCondicionId);
    if (!condicion) return null;

    // Precio base del paquete
    const precioBase = paquete.price;

    // Aplicar descuento de la condición comercial
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

  // Determinar multimedia disponible de los items
  const mediaInfo = useMemo(() => {
    if (!paquete.items_media || paquete.items_media.length === 0) {
      return null;
    }

    const fotos = paquete.items_media.filter(m => m.file_type === 'IMAGE');
    const videos = paquete.items_media.filter(m => m.file_type === 'VIDEO');

    return {
      fotos: fotos.length > 0 ? fotos : null,
      videos: videos.length > 0 ? videos : null,
      tieneFotos: fotos.length > 0,
      tieneVideos: videos.length > 0,
      tieneAmbos: fotos.length > 0 && videos.length > 0,
    };
  }, [paquete.items_media]);

  // Preparar slides para Lightbox
  const lightboxSlides = useMemo(() => {
    if (!mediaInfo) return [];

    const slides: Array<{ src?: string; alt?: string; type?: 'video'; sources?: Array<{ src: string; type: string }>; poster?: string; autoPlay?: boolean; muted?: boolean; controls?: boolean; playsInline?: boolean }> = [];

    // Agregar fotos primero
    if (mediaInfo.fotos) {
      mediaInfo.fotos.forEach((foto) => {
        slides.push({
          src: foto.file_url,
          alt: paquete.name,
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
  }, [mediaInfo, paquete.name]);

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

  // ⚠️ HIGIENE UI: Bloquear scroll del body cuando el Sheet está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet: flex + contenido con scroll para no bloquear lista de servicios */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-[10010] shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                {paquete.name}
              </h2>
              {paquete.description && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
                  {paquete.description}
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

        {/* Content: h-full overflow-y-auto para scroll sin restricción */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Precio principal */}
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-400 mb-2">Precio del Paquete</p>
                <p className="text-4xl font-bold text-blue-400">
                  {formatPrice(paquete.price)}
                </p>
              </div>

            </div>
          </div>

          <SeparadorZen />

          {/* Servicios incluidos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Servicios Incluidos
            </h3>
            <PublicServiciosTree
              servicios={paquete.servicios}
              showPrices={false}
              showSubtotals={false}
              eventDurationHours={promiseDurationHours ?? null}
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
          </div>

          {/* Términos y condiciones - Solo mostrar si hay condiciones comerciales activas */}
          {condicionesComerciales.length > 0 && terminosCondiciones.length > 0 && (
            <TerminosCondiciones terminos={terminosCondiciones} />
          )}

          {/* Aviso de privacidad */}
          <div className="pt-4 mt-4 border-t border-zinc-800/50 pb-0">
            <Link
              href={`/${studioSlug}/aviso-privacidad`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <span>Ver aviso de privacidad</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 pt-4 pb-6">
          <div className="flex gap-3">
            <ZenButton
              variant="outline"
              onClick={onClose}
              className="shrink-0"
              size="sm"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cerrar
            </ZenButton>
            <ZenButton
              onClick={() => setShowSolicitarModal(true)}
              className="flex-1"
              size="sm"
              disabled={!selectedCondicionId}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Solicitar
            </ZenButton>
          </div>
        </div>
      </div>

      {/* Modal de solicitud de contratación */}
      {showSolicitarModal && (
        <SolicitarPaqueteModal
          paquete={paquete}
          isOpen={showSolicitarModal}
          onClose={() => setShowSolicitarModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
          condicionesComercialesId={selectedCondicionId}
          condicionesComercialesMetodoPagoId={selectedMetodoPagoId}
          precioCalculado={precioCalculado}
          showPackages={showPackages}
          onSuccess={() => {
            // onSuccess oculta la UI de cotización/paquete en PromisePageClient
            // Solo cerrar el modal interno
            setShowSolicitarModal(false);
          }}
          onCloseDetailSheet={onClose}
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

