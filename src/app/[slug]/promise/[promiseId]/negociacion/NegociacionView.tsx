'use client';

import React, { useMemo, useCallback, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ZenButton, ZenBadge, SeparadorZen } from '@/components/ui/zen';
import { PromiseHeroSection } from '@/components/promise/PromiseHeroSection';
import { PublicServiciosTree } from '@/components/promise/PublicServiciosTree';
import { PrecioDesglose } from '@/components/promise/shared/PrecioDesglose';
import { AutorizarCotizacionModal } from '@/components/promise/AutorizarCotizacionModal';
import { TerminosCondiciones } from '@/components/promise/shared/TerminosCondiciones';
import { ProgressOverlay } from '@/components/promise/ProgressOverlay';
import type { PublicCotizacion } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { useState } from 'react';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
import { getPublicPromiseData } from '@/lib/actions/public/promesas.actions';

interface NegociacionViewProps {
  promise: {
    id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
  };
  studio: {
    studio_name: string;
    slogan: string | null;
    logo_url: string | null;
    id: string;
    representative_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    promise_share_default_show_packages: boolean;
    promise_share_default_show_categories_subtotals: boolean;
    promise_share_default_show_items_prices: boolean;
    promise_share_default_min_days_to_hire: number;
    promise_share_default_show_standard_conditions: boolean;
    promise_share_default_show_offer_conditions: boolean;
    promise_share_default_portafolios: boolean;
    promise_share_default_auto_generate_contract: boolean;
  };
  cotizacion: PublicCotizacion;
  condicionesComerciales: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
  };
  terminosCondiciones?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  shareSettings: PromiseShareSettings;
  studioSlug: string;
  promiseId: string;
}

export function NegociacionView({
  promise,
  studio,
  cotizacion,
  condicionesComerciales,
  terminosCondiciones,
  shareSettings,
  studioSlug,
  promiseId,
}: NegociacionViewProps) {
  const router = useRouter();
  const {
    onSuccess,
    showProgressOverlay,
    progressStep,
    progressError,
    autoGenerateContract,
    setShowProgressOverlay,
    setProgressStep,
    setProgressError,
  } = usePromisePageContext();
  const [showAutorizarModal, setShowAutorizarModal] = useState(false);
  
  // ⚠️ TAREA 1: Hook de navegación para prevenir race conditions
  const { isNavigating, setNavigating, getIsNavigating, clearNavigating } = usePromiseNavigation();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Obtener precio original (usar negociacion_precio_original si existe, sino el precio de la cotización)
  const precioOriginal = useMemo(() => {
    return cotizacion.negociacion_precio_original ?? cotizacion.price;
  }, [cotizacion]);

  // Calcular precio base (precio original con descuento de cotización si aplica)
  const precioBase = useMemo(() => {
    if (!cotizacion.discount) return precioOriginal;
    return precioOriginal - (precioOriginal * cotizacion.discount) / 100;
  }, [precioOriginal, cotizacion.discount]);

  // Calcular total de cortesías (suma de subtotales de items con is_courtesy: true)
  const totalCortesias = useMemo(() => {
    let total = 0;
    cotizacion.servicios.forEach((seccion) => {
      seccion.categorias.forEach((categoria) => {
        categoria.servicios.forEach((servicio) => {
          if (servicio.is_courtesy && servicio.price && servicio.quantity) {
            total += servicio.price * servicio.quantity;
          }
        });
      });
    });
    return total;
  }, [cotizacion]);

  // Calcular precio con condición comercial
  // Si hay precio personalizado negociado, ese es el precio final a pagar
  const precioCalculado = useMemo(() => {
    // Si hay precio personalizado negociado, usarlo como precio final
    const precioFinal = cotizacion.negociacion_precio_personalizado ?? null;
    
    // Calcular precio con descuento de condición comercial (para referencia)
    const descuentoCondicion = condicionesComerciales.discount_percentage ?? 0;
    const precioConDescuento = descuentoCondicion > 0
      ? precioBase - (precioBase * descuentoCondicion) / 100
      : precioBase;

    // Si hay precio personalizado, ese es el precio a pagar (ya incluye todo)
    // Si no, usar el precio con descuento de condición comercial
    const precioAPagar = precioFinal ?? precioConDescuento;

    const advanceType: 'percentage' | 'fixed_amount' = (condicionesComerciales.advance_type === 'fixed_amount' || condicionesComerciales.advance_type === 'percentage')
      ? condicionesComerciales.advance_type
      : 'percentage';
    
    // Calcular anticipo basado en el precio a pagar
    const anticipo = advanceType === 'fixed_amount' && condicionesComerciales.advance_amount
      ? condicionesComerciales.advance_amount
      : (condicionesComerciales.advance_percentage ?? 0) > 0
        ? (precioAPagar * (condicionesComerciales.advance_percentage ?? 0)) / 100
        : 0;
    const anticipoPorcentaje = advanceType === 'percentage' ? (condicionesComerciales.advance_percentage ?? 0) : null;
    const diferido = precioAPagar - anticipo;

    return {
      precioBase,
      precioOriginal,
      precioFinalNegociado: precioFinal,
      descuentoCondicion,
      precioConDescuento,
      precioAPagar,
      advanceType,
      anticipoPorcentaje,
      anticipo,
      diferido,
    };
  }, [precioBase, precioOriginal, cotizacion.negociacion_precio_personalizado, condicionesComerciales, totalCortesias]);

  // Función para verificar cambios de estado y redirigir si es necesario
  const checkAndRedirect = useCallback(async () => {
    // ⚠️ TAREA 1: Bloquear sincronización durante navegación
    if (getIsNavigating()) {
      console.log('[NegociacionView] Ignorando checkAndRedirect durante navegación');
      return;
    }

    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        const cotizaciones = result.data.cotizaciones as Array<PublicCotizacion & {
          status: string;
          selected_by_prospect?: boolean;
        }>;

        // Verificar si la cotización actual ya no está en negociación
        const cotizacionActual = cotizaciones.find((c) => c.id === cotizacion.id);
        
        // Si la cotización pasó a en_cierre con selected_by_prospect: true, redirigir a cierre
        const cotizacionEnCierre = cotizaciones.find(
          (cot) => cot.selected_by_prospect === true && cot.status === 'en_cierre'
        );
        if (cotizacionEnCierre) {
          // ⚠️ TAREA 1 y 3: Activar flag de navegación y cerrar overlays
          setNavigating('cierre');
          window.dispatchEvent(new CustomEvent('close-overlays'));
          
          startTransition(() => {
            router.push(`/${studioSlug}/promise/${promiseId}/cierre`);
            clearNavigating(1000);
          });
          return;
        }

        // Si la cotización actual ya no está en negociación o no existe
        if (!cotizacionActual || cotizacionActual.status !== 'negociacion' || cotizacionActual.selected_by_prospect === true) {
          // Verificar si hay otra cotización en negociación
          const otraCotizacionNegociacion = cotizaciones.find(
            (cot) => cot.status === 'negociacion' && cot.selected_by_prospect !== true && cot.id !== cotizacion.id
          );
          
          if (!otraCotizacionNegociacion) {
            // No hay cotización en negociación, redirigir a pendientes
            // ⚠️ TAREA 1 y 3: Activar flag de navegación y cerrar overlays
            setNavigating('pendientes');
            window.dispatchEvent(new CustomEvent('close-overlays'));
            
            startTransition(() => {
              router.push(`/${studioSlug}/promise/${promiseId}/pendientes`);
              clearNavigating(1000);
            });
          }
        }
      }
    } catch (error) {
      console.error('[NegociacionView] Error verificando estado:', error);
    }
  }, [studioSlug, promiseId, cotizacion.id, router, getIsNavigating, setNavigating, clearNavigating]);

  // Escuchar cambios en tiempo real de cotizaciones
  // ⚠️ TAREA 1: Bloquear sincronización durante navegación
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: checkAndRedirect,
    onCotizacionInserted: checkAndRedirect,
  });

  const handleSuccess = () => {
    setShowAutorizarModal(false);
    if (onSuccess) {
      onSuccess();
    }
    // NO redirigir aquí - la redirección ocurrirá cuando el proceso termine
  };

  // Redirigir a cierre cuando el proceso esté completado y el overlay se haya cerrado
  useEffect(() => {
    if (progressStep === 'completed' && !showProgressOverlay) {
      // Pequeño delay para asegurar que el overlay se haya cerrado completamente
      const timer = setTimeout(() => {
        // ⚠️ TAREA 1 y 3: Activar flag de navegación y cerrar overlays
        setNavigating('cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        
        startTransition(() => {
          router.push(`/${studioSlug}/promise/${promiseId}/cierre`);
          clearNavigating(1000);
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progressStep, showProgressOverlay, router, studioSlug, promiseId, setNavigating, clearNavigating]);

  return (
    <>
      {/* Hero Section */}
      <PromiseHeroSection
        contactName={promise.contact_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        studioName={studio.studio_name}
        studioLogoUrl={studio.logo_url}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Propuesta de Negociación
          </h2>
          <p className="text-zinc-400">
            Revisa la propuesta especial que hemos preparado para ti
          </p>
        </div>

        {/* Cotización */}
        <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 mb-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-1">
              {cotizacion.name}
            </h3>
            {cotizacion.description && (
              <p className="text-sm text-zinc-400">
                {cotizacion.description}
              </p>
            )}
          </div>

          {/* Precio principal */}
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-2">Precio Total</p>
            <p className="text-4xl font-bold text-blue-400">
              {formatPrice(precioBase)}
            </p>
          </div>

          <SeparadorZen />

          {/* Servicios incluidos */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Servicios Incluidos
            </h3>
            <PublicServiciosTree
              servicios={cotizacion.servicios}
              showPrices={shareSettings.show_items_prices}
              showSubtotals={shareSettings.show_categories_subtotals}
            />
          </div>

          <SeparadorZen />

          {/* Condición comercial definida */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Condiciones Comerciales
            </h3>
            <div className="bg-blue-950/30 rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-white mb-1">
                    {condicionesComerciales.name}
                  </h4>
                  {condicionesComerciales.description && (
                    <p className="text-sm text-zinc-400">
                      {condicionesComerciales.description}
                    </p>
                  )}
                </div>
                <ZenBadge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">Definida</ZenBadge>
              </div>
            </div>

            {/* Cálculo de precio con la condición comercial */}
            <PrecioDesglose
              precioBase={precioCalculado.precioOriginal}
              descuentoCondicion={precioCalculado.descuentoCondicion}
              precioConDescuento={precioCalculado.precioConDescuento}
              precioFinalNegociado={precioCalculado.precioFinalNegociado}
              advanceType={precioCalculado.advanceType}
              anticipoPorcentaje={precioCalculado.anticipoPorcentaje}
              anticipo={precioCalculado.anticipo}
              diferido={precioCalculado.diferido}
              cortesias={totalCortesias}
            />
          </div>

          {/* Términos y condiciones */}
          {terminosCondiciones && terminosCondiciones.length > 0 && (
            <>
              <SeparadorZen />
              <div className="mt-6">
                <TerminosCondiciones terminos={terminosCondiciones} />
              </div>
            </>
          )}

          {/* Botón autorizar */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <ZenButton
              onClick={() => setShowAutorizarModal(true)}
              className="w-full"
              size="lg"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Autorizar Contratación
            </ZenButton>
          </div>
        </div>
      </div>

      {/* Modal de contratación */}
      {showAutorizarModal && (
        <AutorizarCotizacionModal
          cotizacion={cotizacion}
          isOpen={showAutorizarModal}
          onClose={() => setShowAutorizarModal(false)}
          promiseId={promiseId}
          studioSlug={studioSlug}
          condicionesComercialesId={condicionesComerciales.id}
          condicionesComercialesMetodoPagoId={null}
          precioCalculado={{
            ...precioCalculado,
            // Si hay precio negociado, usar ese; sino ajustar con cortesías
            precioConDescuento: precioCalculado.precioFinalNegociado ?? (precioCalculado.precioConDescuento - totalCortesias),
            diferido: precioCalculado.diferido,
          }}
          showPackages={shareSettings.show_packages}
          autoGenerateContract={shareSettings.auto_generate_contract}
          onSuccess={handleSuccess}
          isFromNegociacion={true}
        />
      )}

      {/* Overlay de progreso */}
      <ProgressOverlay
        show={showProgressOverlay}
        currentStep={progressStep}
        error={progressError}
        autoGenerateContract={autoGenerateContract}
        onClose={() => {
          setShowProgressOverlay(false);
          setProgressError(null);
          setProgressStep('validating');
        }}
        onRetry={() => {
          setProgressError(null);
          setProgressStep('validating');
          setShowProgressOverlay(false);
        }}
      />
    </>
  );
}
