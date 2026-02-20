'use client';

import React, { useMemo, useCallback, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ZenButton, SeparadorZen } from '@/components/ui/zen';
import { PublicServiciosTree } from '@/components/promise/PublicServiciosTree';
import { PrecioDesglose } from '@/components/promise/shared/PrecioDesglose';
import { AutorizarCotizacionModal } from '@/components/promise/AutorizarCotizacionModal';
import { TerminosCondiciones } from '@/components/promise/shared/TerminosCondiciones';
import type { PublicCotizacion } from '@/types/public-promise';
import type { PromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { usePromisePageContext } from '@/components/promise/PromisePageContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { calculateCotizacionTotals } from '@/lib/utils/cotizacion-calculation-engine';
import { formatMoney } from '@/lib/utils/package-price-formatter';

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
  pipelineStages?: PipelineStage[];
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
  pipelineStages = [],
}: NegociacionViewProps) {
  const router = useRouter();
  const { onSuccess } = usePromisePageContext();
  const [showAutorizarModal, setShowAutorizarModal] = useState(false);
  
  // ⚠️ TAREA 1: Hook de navegación para prevenir race conditions
  const { isNavigating, setNavigating, getIsNavigating, clearNavigating } = usePromiseNavigation();

  // Totales resueltos por el motor SSoT (misma lógica que servidor/PDF)
  const precioCalculado = useMemo(() => {
    const engineOut = calculateCotizacionTotals({
      price: Number(cotizacion.price),
      discount: cotizacion.discount != null ? Number(cotizacion.discount) : null,
      negociacion_precio_original: cotizacion.negociacion_precio_original != null ? Number(cotizacion.negociacion_precio_original) : null,
      negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado != null ? Number(cotizacion.negociacion_precio_personalizado) : null,
      condiciones_comerciales_discount_percentage_snapshot: null,
      condiciones_comerciales_advance_percentage_snapshot: null,
      condiciones_comerciales_advance_type_snapshot: null,
      condiciones_comerciales_advance_amount_snapshot: null,
      condiciones_comerciales: {
        discount_percentage: condicionesComerciales.discount_percentage ?? null,
        advance_percentage: condicionesComerciales.advance_percentage ?? null,
        advance_type: condicionesComerciales.advance_type ?? null,
        advance_amount: condicionesComerciales.advance_amount ?? null,
      },
    });
    const advanceType: 'percentage' | 'fixed_amount' = (condicionesComerciales.advance_type === 'fixed_amount' || condicionesComerciales.advance_type === 'percentage')
      ? condicionesComerciales.advance_type
      : 'percentage';
    const anticipoPorcentaje = advanceType === 'percentage' ? (condicionesComerciales.advance_percentage ?? 0) : null;
    return {
      precioBase: engineOut.precioBaseReal,
      precioOriginal: engineOut.precioOriginalParaComparativa ?? engineOut.precioBaseReal,
      precioFinalNegociado: cotizacion.negociacion_precio_personalizado != null ? Number(cotizacion.negociacion_precio_personalizado) : null,
      descuentoCondicion: engineOut.descuentoPorcentaje ?? 0,
      precioConDescuento: engineOut.totalAPagar,
      precioAPagar: engineOut.totalAPagar,
      advanceType,
      anticipoPorcentaje,
      anticipo: engineOut.anticipo,
      diferido: engineOut.diferido,
    };
  }, [cotizacion.price, cotizacion.discount, cotizacion.negociacion_precio_original, cotizacion.negociacion_precio_personalizado, condicionesComerciales]);

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

  // ⚠️ SIN LÓGICA DE REDIRECCIÓN: El Gatekeeper en el layout maneja toda la redirección
  // Esta página solo se preocupa por mostrar sus datos

  const handleSuccess = () => {
    setShowAutorizarModal(false);
    if (onSuccess) {
      onSuccess();
    }
    // NO redirigir aquí - la redirección ocurrirá cuando el proceso termine
  };

  return (
    <>
      {/* ⚠️ HIGIENE UI: PromiseHeroSection ya se renderiza en NegociacionPageBasic */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Propuesta Especial
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

          {/* Precio principal (total a pagar del motor SSoT) */}
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-2">Total a pagar</p>
            <p className="text-4xl font-bold text-blue-400">
              {formatMoney(precioCalculado.precioAPagar)}
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

          {/* Condición comercial: solo desglose de precio */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Condiciones Comerciales
            </h3>
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
    </>
  );
}
