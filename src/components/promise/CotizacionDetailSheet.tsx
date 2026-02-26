'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { X, CheckCircle2, AlertCircle, Tag as TagIcon, Image as ImageIcon, Video, Images, ExternalLink } from 'lucide-react';
import { ZenButton, ZenBadge, SeparadorZen } from '@/components/ui/zen';
import type { PublicCotizacion } from '@/types/public-promise';
import { PublicServiciosTree } from './PublicServiciosTree';
import { AutorizarCotizacionModal } from './AutorizarCotizacionModal';
import { CondicionesComercialesSelector } from './shared/CondicionesComercialesSelector';
import { PrecioDesglose } from './shared/PrecioDesglose';
import { TerminosCondiciones } from './shared/TerminosCondiciones';
import { obtenerCondicionesComercialesParaCotizacion, obtenerTerminosCondicionesPublicos } from '@/lib/actions/public/promesas.actions';
import { formatCurrency } from '@/lib/actions/utils/formatting';
import {
  getPrecioListaStudio,
  getMontoCortesiasFromServicios,
  getBonoEspecialMonto,
  getCortesiasCount,
  getPrecioFinalCierre,
  getAjusteCierre,
} from '@/lib/utils/promise-public-financials';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
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
  autoGenerateContract?: boolean;
  /** Si true, se muestra el botón "Autorizar" en el footer (vista pública). Depende de share_settings.allow_online_authorization. */
  mostrarBotonAutorizar?: boolean;
  /** ⚡ OPTIMIZACIÓN: Datos de promesa pre-cargados */
  promiseData?: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
    event_date: Date | null;
    event_type_name: string | null;
  };
  dateSoldOut?: boolean;
  /** IDs de condiciones visibles para esta cotización (si viene de la API). Si está definido, se filtra la lista por estos IDs. */
  condicionesVisiblesIds?: string[] | null;
  /** Modo vista previa desde editor: datos locales (no DB), sin botón Autorizar, solo Cerrar. */
  isPreviewMode?: boolean;
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
  autoGenerateContract = false,
  mostrarBotonAutorizar = true,
  promiseData,
  dateSoldOut = false,
  condicionesVisiblesIds,
  isPreviewMode = false,
}: CotizacionDetailSheetProps) {
  const [showAutorizarModal, setShowAutorizarModal] = useState(false);
  const [condicionesComerciales, setCondicionesComerciales] = useState<CondicionComercial[]>([]);
  const [terminosCondiciones, setTerminosCondiciones] = useState<TerminoCondicion[]>([]);
  const [selectedCondicionId, setSelectedCondicionId] = useState<string | null>(null);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState<string | null>(null);
  const [loadingCondiciones, setLoadingCondiciones] = useState(true);
  const [currentCotizacion, setCurrentCotizacion] = useState(cotizacion);
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Exclusividad negociación: condiciones_visibles solo aplican a cotizaciones que las tienen.
  // is_public: false solo aparece si está en condiciones_visibles (carga vía obtenerCondicionesComercialesParaCotizacion).
  const esCotizacionConVisibles =
    currentCotizacion.condiciones_visibles != null && currentCotizacion.condiciones_visibles.length > 0;

  // Prioridad negociación: la condición ad-hoc de negociación se muestra siempre, ignorando showStandardConditions/showOfferConditions.
  const condicionNegociacion = currentCotizacion.condicion_comercial_negociacion;

  const condicionesAMostrar = useMemo(() => {
    const negSynthetic = condicionNegociacion
      ? {
          id: condicionNegociacion.id,
          name: condicionNegociacion.name,
          description: condicionNegociacion.description,
          advance_percentage: condicionNegociacion.advance_percentage,
          advance_type: condicionNegociacion.advance_type ?? 'percentage',
          advance_amount: condicionNegociacion.advance_amount ?? null,
          discount_percentage: condicionNegociacion.discount_percentage,
          type: undefined as string | undefined,
          metodos_pago: [] as Array<{ id: string; metodo_pago_id: string; metodo_pago_name: string }>,
        }
      : null;

    if (!condicionesComerciales.length && !negSynthetic) return [];
    let catalogList: typeof condicionesComerciales;
    if (esCotizacionConVisibles && condicionesVisiblesIds != null && condicionesVisiblesIds.length > 0) {
      const setIds = new Set(condicionesVisiblesIds);
      catalogList = condicionesComerciales.filter((c) => setIds.has(c.id));
    } else {
      catalogList = condicionesComerciales.filter((c) => {
        const tipo = c.type || 'standard';
        if (tipo === 'standard') return showStandardConditions;
        if (tipo === 'offer') return showOfferConditions;
        return false;
      });
    }
    return negSynthetic ? [negSynthetic, ...catalogList] : catalogList;
  }, [
    condicionesComerciales,
    condicionesVisiblesIds,
    showStandardConditions,
    showOfferConditions,
    esCotizacionConVisibles,
    condicionNegociacion,
  ]);

  // Actualizar cotización cuando cambia la prop
  useEffect(() => {
    setCurrentCotizacion(cotizacion);
  }, [cotizacion]);

  // Al cambiar de cotización, resetear selección para que auto-selección pueda aplicarse si aplica
  useEffect(() => {
    setSelectedCondicionId(null);
    setSelectedMetodoPagoId(null);
  }, [cotizacion.id]);

  // Auto-selección: si el sheet está abierto y solo hay una condición visible y no hay selección, seleccionarla
  useEffect(() => {
    if (!isOpen || condicionesAMostrar.length !== 1 || selectedCondicionId !== null) return;
    const only = condicionesAMostrar[0];
    setSelectedCondicionId(only.id);
    setSelectedMetodoPagoId(only.metodos_pago?.length ? only.metodos_pago[0].id : null);
  }, [isOpen, condicionesAMostrar, selectedCondicionId]);

  const loadCondicionesYTerminos = useCallback(
    async (visiblesIds?: string[] | null) => {
      setLoadingCondiciones(true);
      try {
        const [condicionesResult, terminosResult] = await Promise.all([
          obtenerCondicionesComercialesParaCotizacion(studioSlug, visiblesIds),
          obtenerTerminosCondicionesPublicos(studioSlug),
        ]);

        if (condicionesResult.success && condicionesResult.data) {
          setCondicionesComerciales(condicionesResult.data);
        }
        if (terminosResult.success && terminosResult.data) {
          setTerminosCondiciones(terminosResult.data);
        }
      } catch (error) {
        console.error('[CotizacionDetailSheet] Error al cargar condiciones y términos:', error);
      } finally {
        setLoadingCondiciones(false);
      }
    },
    [studioSlug]
  );

  useEffect(() => {
    if (isOpen) {
      if (condicionesComercialesIniciales || terminosCondicionesIniciales) {
        if (condicionesComercialesIniciales) setCondicionesComerciales(condicionesComercialesIniciales);
        if (terminosCondicionesIniciales) setTerminosCondiciones(terminosCondicionesIniciales);
        setLoadingCondiciones(false);
      } else {
        loadCondicionesYTerminos(cotizacion.condiciones_visibles ?? undefined);
      }
    }
  }, [isOpen, studioSlug, cotizacion, condicionesComercialesIniciales, terminosCondicionesIniciales, loadCondicionesYTerminos]);

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


  // Fase 9.3: precio lista = Studio; desglose cortesías + bono; total = lista - cortesías - bono
  const precioLista = useMemo(() => getPrecioListaStudio(currentCotizacion), [currentCotizacion]);
  const montoCortesias = useMemo(() => getMontoCortesiasFromServicios(currentCotizacion), [currentCotizacion]);
  const montoBono = useMemo(() => getBonoEspecialMonto(currentCotizacion), [currentCotizacion]);
  const cortesiasCount = useMemo(() => getCortesiasCount(currentCotizacion), [currentCotizacion]);
  const precioBaseParaCondicion = useMemo(
    () => Math.max(0, precioLista - montoCortesias - montoBono),
    [precioLista, montoCortesias, montoBono]
  );

  const tieneConcesiones = montoCortesias > 0 || montoBono > 0;

  // Calcular precio según condición comercial seleccionada (precio base = precio lista menos bono/descuentos)
  const calculatePriceWithCondition = () => {
    if (!selectedCondicionId) return null;

    const condicion =
      condicionNegociacion && selectedCondicionId === condicionNegociacion.id
        ? {
            ...condicionNegociacion,
            advance_type: (condicionNegociacion.advance_type ?? 'percentage') as 'percentage' | 'fixed_amount',
            metodos_pago: [] as Array<{ id: string; metodo_pago_id: string; metodo_pago_name: string }>,
          }
        : condicionesComerciales.find((c) => c.id === selectedCondicionId);
    if (!condicion) return null;

    const precioBase = precioBaseParaCondicion;

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

  // Fase 9.4: precio final = definido por socio (totalAPagar / negociacion_precio_personalizado) o calculado; ajuste para suma exacta
  const subtotalSinAjuste = precioLista - montoCortesias - montoBono;
  const precioFinal = useMemo(
    () =>
      getPrecioFinalCierre(currentCotizacion, precioCalculado ? precioCalculado.precioConDescuento : Math.max(0, subtotalSinAjuste)),
    [currentCotizacion, precioCalculado, subtotalSinAjuste]
  );
  const ajusteCierre = useMemo(
    () => getAjusteCierre(precioFinal, precioLista, montoCortesias, montoBono),
    [precioFinal, precioLista, montoCortesias, montoBono]
  );

  // Iniciar siempre en el tope al abrir el sheet (evitar scroll automático)
  useEffect(() => {
    if (isOpen && sheetContainerRef.current) {
      sheetContainerRef.current.scrollTop = 0;
    }
  }, [isOpen]);

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

  const lastUpdateTimeRef = useRef<number>(0);
  const isUpdatingRef = useRef(false);

  const handleCotizacionUpdated = useCallback(async (cotizacionId: string) => {
    if (isPreviewMode) return;
    // Solo procesar si el sheet está abierto y es la cotización actual
    if (!isOpenRef.current) {
      return;
    }

    // Protección: evitar actualizaciones muy frecuentes (mínimo 1 segundo)
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 1000 || isUpdatingRef.current) {
      return;
    }

    if (cotizacionId === currentCotizacionIdRef.current) {
      isUpdatingRef.current = true;
      lastUpdateTimeRef.current = now;

      // Recargar datos de la cotización usando función ligera
      try {
        // Usar getPublicPromisePendientes si estamos en pendientes, o función específica según la ruta
        const { getPublicPromisePendientes } = await import('@/lib/actions/public/promesas.actions');
        const result = await getPublicPromisePendientes(studioSlug, promiseId);
        if (result.success && result.data?.cotizaciones) {
          const updatedCotizacion = result.data.cotizaciones.find(c => c.id === cotizacionId);
          if (updatedCotizacion) {
            setCurrentCotizacion(updatedCotizacion);
          }
        }
      } catch (error) {
        // Error silencioso - no afecta la UX
      } finally {
        isUpdatingRef.current = false;
      }
    }
  }, [studioSlug, promiseId, isPreviewMode]);

  // Suscribirse siempre (el callback verifica si el sheet está abierto usando refs)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: handleCotizacionUpdated,
  });

  // ⚠️ HIGIENE DE DATOS: Los servicios ya vienen ordenados desde la consulta
  // No es necesario ordenar en el frontend

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
  const lightboxSlides = useMemo((): Slide[] => {
    if (!mediaInfo) return [];

    const slides: Slide[] = [];

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

      {/* Sheet: ref para forzar scrollTop=0 al abrir */}
      <div
        ref={sheetContainerRef}
        className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-[10010] overflow-y-auto shadow-2xl"
      >
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
          {/* Precio principal: precio de lista (calculado) + total a pagar (cierre) */}
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                {tieneConcesiones && precioLista > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-400">Precio de lista</span>
                    <span className="text-lg text-zinc-500 line-through">
                      {formatPrice(precioLista)}
                    </span>
                  </div>
                )}
                <p className="text-sm text-zinc-400 mb-2">Total a pagar</p>
                <p className="text-4xl font-bold text-blue-400">
                  {formatPrice(precioFinal)}
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
              servicios={currentCotizacion.servicios}
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
            {/* Si la cotización está en negociación, mostrar solo la condición definida */}
            {currentCotizacion.status === 'negociacion' && currentCotizacion.condiciones_comerciales?.id ? (
              <>
                {/* Mostrar condición comercial definida */}
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-white mb-1">
                        {currentCotizacion.condiciones_comerciales.name}
                      </h4>
                      {currentCotizacion.condiciones_comerciales.description && (
                        <p className="text-sm text-zinc-400">
                          {currentCotizacion.condiciones_comerciales.description}
                        </p>
                      )}
                    </div>
                    <ZenBadge variant="secondary">Definida</ZenBadge>
                  </div>
                </div>

                {/* Cálculo de precio con la condición comercial definida */}
                {(() => {
                  const condicion = currentCotizacion.condiciones_comerciales;
                  if (!condicion || !condicion.id) return null;

                  const precioBase = precioBaseParaCondicion;
                  const descuentoCondicion = condicion.discount_percentage ?? 0;
                  const precioConDescuento = descuentoCondicion > 0
                    ? precioBase - (precioBase * descuentoCondicion) / 100
                    : precioBase;

                  const advanceType: 'percentage' | 'fixed_amount' = (condicion.advance_type === 'fixed_amount' || condicion.advance_type === 'percentage')
                    ? condicion.advance_type
                    : 'percentage';
                  const anticipo = advanceType === 'fixed_amount' && condicion.advance_amount
                    ? condicion.advance_amount
                    : (condicion.advance_percentage ?? 0) > 0
                      ? (precioConDescuento * (condicion.advance_percentage ?? 0)) / 100
                      : 0;
                  const anticipoPorcentaje = advanceType === 'percentage' ? (condicion.advance_percentage ?? 0) : null;
                  const anticipoRedondo = Math.round(anticipo);
                  const diferido = Math.round(precioFinal - anticipoRedondo);

                  return (
                    <PrecioDesglose
                      precioBase={precioBase}
                      descuentoCondicion={descuentoCondicion}
                      precioConDescuento={precioConDescuento}
                      advanceType={advanceType}
                      anticipoPorcentaje={anticipoPorcentaje}
                      anticipo={anticipoRedondo}
                      diferido={diferido}
                      precioLista={precioLista}
                      montoCortesias={montoCortesias}
                      cortesiasCount={cortesiasCount}
                      montoBono={montoBono}
                      precioFinalCierre={precioFinal}
                      ajusteCierre={ajusteCierre}
                      tieneConcesiones={tieneConcesiones}
                    />
                  );
                })()}
              </>
            ) : (
              <>
                {/* Mostrar selector de condiciones comerciales para cotizaciones pendientes */}
                <CondicionesComercialesSelector
                  condiciones={condicionesAMostrar}
                  selectedCondicionId={selectedCondicionId}
                  selectedMetodoPagoId={selectedMetodoPagoId}
                  onSelectCondicion={handleSelectCondicion}
                  loading={loadingCondiciones}
                />

                {/* Cálculo de precio según condición comercial */}
                {precioCalculado && (
                  <PrecioDesglose
                    precioBase={precioCalculado.precioBase}
                    descuentoCondicion={precioCalculado.descuentoCondicion}
                    precioConDescuento={precioCalculado.precioConDescuento}
                    advanceType={precioCalculado.advanceType}
                    anticipoPorcentaje={precioCalculado.anticipoPorcentaje}
                    anticipo={Math.round(precioCalculado.anticipo)}
                    diferido={Math.round(precioFinal - Math.round(precioCalculado.anticipo))}
                    precioLista={precioLista}
                    montoCortesias={montoCortesias}
                    cortesiasCount={cortesiasCount}
                    montoBono={montoBono}
                    precioFinalCierre={precioFinal}
                    ajusteCierre={ajusteCierre}
                    tieneConcesiones={tieneConcesiones}
                  />
                )}
              </>
            )}
          </div>

          {/* Términos y condiciones - Solo mostrar si hay condiciones comerciales activas */}
          {condicionesAMostrar.length > 0 && terminosCondiciones.length > 0 && (
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
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 pt-4 pb-6 mt-6">
          <div className="flex gap-3">
            <ZenButton
              variant="outline"
              onClick={onClose}
              className={isPreviewMode ? 'w-full' : 'shrink-0'}
              size="sm"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cerrar
            </ZenButton>
            {!isPreviewMode && mostrarBotonAutorizar && (
              <ZenButton
                onClick={() => setShowAutorizarModal(true)}
                className="flex-1"
                size="sm"
                disabled={!selectedCondicionId}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Autorizar
              </ZenButton>
            )}
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
          promiseData={promiseData}
          dateSoldOut={dateSoldOut}
          precioLista={precioLista}
          montoCortesias={montoCortesias}
          cortesiasCount={cortesiasCount}
          montoBono={montoBono}
          precioFinalCierre={precioFinal}
          ajusteCierre={ajusteCierre}
          condicionesComercialesId={
            // Si está en negociación, usar la condición comercial definida
            currentCotizacion.status === 'negociacion' && currentCotizacion.condiciones_comerciales?.id
              ? currentCotizacion.condiciones_comerciales.id
              : selectedCondicionId
          }
          condicionesComercialesMetodoPagoId={selectedMetodoPagoId}
          precioCalculado={
            // Si está en negociación, calcular precio con la condición definida
            currentCotizacion.status === 'negociacion' && currentCotizacion.condiciones_comerciales?.id
              ? (() => {
                const condicion = currentCotizacion.condiciones_comerciales;
                if (!condicion) return precioCalculado;

                const precioBase = precioBaseParaCondicion;
                const descuentoCondicion = condicion.discount_percentage ?? 0;
                const precioConDescuento = descuentoCondicion > 0
                  ? precioBase - (precioBase * descuentoCondicion) / 100
                  : precioBase;

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
              })()
              : precioCalculado
          }
          showPackages={showPackages}
          autoGenerateContract={autoGenerateContract}
          onSuccess={() => {
            // onSuccess oculta la UI de cotización/paquete en PromisePageClient
            // Solo cerrar el modal interno
            setShowAutorizarModal(false);
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

