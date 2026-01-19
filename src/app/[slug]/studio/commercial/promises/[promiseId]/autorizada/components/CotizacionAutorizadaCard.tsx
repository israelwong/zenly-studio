'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { startTransition } from 'react';
import { CheckCircle2, ArrowRight, FileText, Calendar, DollarSign, Loader2, Eye, CreditCard, Tag, Clock, Receipt, CheckCircle } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton,
} from '@/components/ui/zen';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { getCondicionesComerciales, getContrato } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import { ContractPreviewForPromiseModal } from '../../cierre/components/contratos/ContractPreviewForPromiseModal';
import { CondicionesComercialesDesglose } from '@/components/shared/condiciones-comerciales';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { formatNumber } from '@/lib/actions/utils/formatting';

interface CotizacionAutorizadaCardProps {
  cotizacion: CotizacionListItem;
  eventoId: string;
  studioSlug: string;
}

export function CotizacionAutorizadaCard({
  cotizacion,
  eventoId,
  studioSlug,
}: CotizacionAutorizadaCardProps) {
  const router = useRouter();
  const params = useParams();
  const promiseId = params?.promiseId as string || '';
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContractPreview, setShowContractPreview] = useState(false);

  // Cargar resumen del evento creado
  useEffect(() => {
    const loadResumen = async () => {
      setLoading(true);
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventoId);
        if (result.success && result.data) {
          setResumen(result.data);
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      } finally {
        setLoading(false);
      }
    };
    loadResumen();
  }, [studioSlug, eventoId]);

  // Obtener datos procesados desde snapshots inmutables
  const cotizacionData = resumen?.cotizacion || cotizacion;
  const condiciones = resumen?.cotizacion
    ? getCondicionesComerciales(resumen.cotizacion)
    : getCondicionesComerciales(cotizacionData);
  const contrato = resumen?.cotizacion
    ? getContrato(resumen.cotizacion)
    : getContrato(cotizacionData);

  // Obtener datos de negociación desde resumen (prioridad) o cotizacion prop
  const negociacionPrecioOriginal = resumen?.cotizacion?.negociacion_precio_original ??
    cotizacion.negociacion_precio_original ?? null;
  const negociacionPrecioPersonalizado = resumen?.cotizacion?.negociacion_precio_personalizado ??
    cotizacion.negociacion_precio_personalizado ?? null;

  // Calcular precio base para condiciones comerciales
  // Si hay precio negociado y existe precio original de negociación, usar ese como base
  // Si no, usar el precio de la cotización (que puede tener descuento de cotización aplicado)
  const precioBaseParaCondiciones = negociacionPrecioPersonalizado !== null && negociacionPrecioPersonalizado !== undefined && negociacionPrecioPersonalizado > 0 && negociacionPrecioOriginal !== null && negociacionPrecioOriginal !== undefined
    ? negociacionPrecioOriginal
    : cotizacionData.price;

  // Información del pago inicial
  const pagoInicial = resumen?.montoInicial || null;
  const hayPagoInicial = pagoInicial && pagoInicial > 0;
  const primerPago = resumen?.pagos?.[0];

  // Loading state - Skeleton
  if (loading) {
    return (
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse mb-1" />
              <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6 flex-1 flex flex-col overflow-y-auto">
          <div className="space-y-6">
            {/* Nombre skeleton */}
            <div>
              <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mt-1" />
            </div>

            {/* Desglose skeleton */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-5">
              <div className="h-4 w-36 bg-zinc-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-zinc-700/50">
                  <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-zinc-700/50">
                  <div className="h-4 w-12 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Pago inicial skeleton */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {/* Monto destacado skeleton */}
                <div className="flex items-baseline justify-between pb-3 border-b border-zinc-700/50">
                  <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
                </div>
                {/* Detalles skeleton */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-zinc-800/50 rounded-md shrink-0 mt-0.5">
                      <div className="w-3.5 h-3.5 bg-zinc-700 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-3 w-16 bg-zinc-700 rounded animate-pulse mb-1" />
                      <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-zinc-800/50 rounded-md shrink-0 mt-0.5">
                      <div className="w-3.5 h-3.5 bg-zinc-700 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-3 w-28 bg-zinc-700 rounded animate-pulse mb-1" />
                      <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-zinc-800/50 rounded-md shrink-0 mt-0.5">
                      <div className="w-3.5 h-3.5 bg-zinc-700 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse mb-1" />
                      <div className="h-4 w-36 bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contrato skeleton */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-3 w-40 bg-zinc-700 rounded animate-pulse" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 bg-zinc-700 rounded animate-pulse shrink-0" />
                        <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse" />
                      </div>
                      <div className="pl-5">
                        <div className="h-3 w-36 bg-zinc-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse shrink-0 mt-0.5" />
              </div>
            </div>

            {/* Fecha skeleton */}
            <div className="flex items-center gap-2 pt-2">
              <div className="w-3.5 h-3.5 bg-zinc-800 rounded animate-pulse shrink-0" />
              <div className="h-3 w-48 bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Botón skeleton */}
            <div className="pt-2">
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-56 bg-zinc-800 rounded animate-pulse mt-3 mx-auto" />
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <>
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <ZenCardTitle className="text-sm">Cotización Autorizada</ZenCardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Evento creado exitosamente
              </p>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 flex flex-col overflow-y-auto">
          <div className="space-y-6">
            {/* Nombre de la cotización */}
            <div>
              <h3 className="text-base font-semibold text-zinc-200">
                {cotizacionData.name}
              </h3>
              {cotizacionData.description && (
                <p className="text-sm text-zinc-400 mt-1">
                  {cotizacionData.description}
                </p>
              )}
            </div>

            {/* Desglose de Cotización */}
            {condiciones ? (
              <CondicionesComercialesDesglose
                precioBase={precioBaseParaCondiciones}
                condicion={{
                  id: cotizacionData.condiciones_comerciales_id || '',
                  name: condiciones.name || '',
                  description: condiciones.description ?? null,
                  discount_percentage: condiciones.discount_percentage ?? null,
                  advance_type: condiciones.advance_type || 'percentage',
                  advance_percentage: condiciones.advance_percentage ?? null,
                  advance_amount: condiciones.advance_amount ?? null,
                }}
                negociacionPrecioOriginal={negociacionPrecioOriginal}
                negociacionPrecioPersonalizado={negociacionPrecioPersonalizado}
              />
            ) : (
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">
                  Desglose de Cotización
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <dt className="text-zinc-400">Subtotal:</dt>
                    <dd className="text-zinc-200 font-medium">
                      ${formatNumber(cotizacionData.price, 2)} MXN
                    </dd>
                  </div>
                  {cotizacionData.discount && cotizacionData.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <dt className="text-zinc-400">Descuento:</dt>
                      <dd className="text-emerald-400 font-medium">
                        -${formatNumber(cotizacionData.discount, 2)} MXN
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-zinc-700/50 font-semibold">
                    <dt className="text-zinc-200">Total:</dt>
                    <dd className="text-white text-lg">
                      ${formatNumber(cotizacionData.price - (cotizacionData.discount || 0), 2)} MXN
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Pago Inicial */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  Pago Inicial
                </h3>
              </div>
              {hayPagoInicial && primerPago ? (
                <div className="space-y-3">
                  {/* Monto destacado */}
                  <div className="flex items-baseline justify-between pb-3 border-b border-zinc-700/50">
                    <span className="text-xs text-zinc-500">Monto:</span>
                    <span className="text-lg font-bold text-emerald-400">
                      ${formatNumber(pagoInicial, 2)} MXN
                    </span>
                  </div>

                  {/* Detalles del pago */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-zinc-800/50 rounded-md shrink-0 mt-0.5">
                        <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 mb-1">Concepto</p>
                        <p className="text-zinc-200 font-medium leading-tight">{primerPago.concept}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-zinc-800/50 rounded-md shrink-0 mt-0.5">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 mb-1">Método de Pago</p>
                        <p className="text-zinc-300 leading-tight">{primerPago.metodo_pago}</p>
                      </div>
                    </div>

                    {primerPago.payment_date && (
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-zinc-800/50 rounded-md shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-500 mb-1">Fecha de Pago</p>
                          <p className="text-zinc-300 leading-tight">
                            {new Date(primerPago.payment_date).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-500">
                    Promesa de pago
                  </p>
                </div>
              )}
            </div>

            {/* Contrato Inmutable */}
            {contrato && contrato.content ? (
              <div
                className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => setShowContractPreview(true)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3 className="text-sm font-semibold text-blue-300">
                        Contrato v{contrato.version || 1}
                      </h3>
                      {contrato.template_name && (
                        <p className="text-xs text-blue-400/80">
                          Plantilla: {contrato.template_name}
                        </p>
                      )}
                      <div className="space-y-1">
                        {contrato.signed_at ? (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <p className="text-xs text-emerald-400/90 font-medium">
                                Firmado
                              </p>
                            </div>
                            <div className="pl-5">
                              <p className="text-xs text-blue-400/80">
                                {new Date(contrato.signed_at).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <p className="text-xs text-amber-400/90 font-medium">
                              Pendiente de firma
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                </div>
              </div>
            ) : resumen?.cotizacion?.contract_content_snapshot ? (
              <div
                className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => setShowContractPreview(true)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3 className="text-sm font-semibold text-blue-300">
                        Contrato v{resumen.cotizacion.contract_version_snapshot || 1}
                      </h3>
                      {resumen.cotizacion.contract_template_name_snapshot && (
                        <p className="text-xs text-blue-400/80">
                          Plantilla: {resumen.cotizacion.contract_template_name_snapshot}
                        </p>
                      )}
                      <div className="space-y-1">
                        {resumen.cotizacion.contract_signed_at_snapshot ? (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <p className="text-xs text-emerald-400/90 font-medium">
                                Firmado
                              </p>
                            </div>
                            <div className="pl-5">
                              <p className="text-xs text-blue-400/80">
                                {new Date(resumen.cotizacion.contract_signed_at_snapshot).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <p className="text-xs text-amber-400/90 font-medium">
                              Pendiente de firma
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                </div>
              </div>
            ) : null}

            {/* Fecha de creación del evento */}
            {resumen?.evento?.created_at && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Evento creado el {new Date(resumen.evento.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {/* Botón para ir al evento */}
            <div className="pt-2">
              <ZenButton
                variant="primary"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('close-overlays'));
                  startTransition(() => {
                    router.push(`/${studioSlug}/studio/business/events/${eventoId}`);
                  });
                }}
                className="w-full"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Gestionar Evento
              </ZenButton>
              <p className="text-xs text-zinc-500 text-center mt-3">
                Este evento ya fue creado y está en gestión
              </p>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal de previsualización de contrato */}
      {showContractPreview && (contrato?.content || resumen?.cotizacion?.contract_content_snapshot) && (
        <ContractPreviewForPromiseModal
          isOpen={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          onConfirm={() => setShowContractPreview(false)}
          onEdit={() => { }}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacion.id}
          eventId={eventoId}
          template={{
            id: contrato?.template_id || resumen?.cotizacion?.contract_template_id_snapshot || '',
            name: contrato?.template_name || resumen?.cotizacion?.contract_template_name_snapshot || 'Contrato',
            content: contrato?.content || resumen?.cotizacion?.contract_content_snapshot || '',
            studio_id: '',
            slug: '',
            is_active: true,
            is_default: false,
            version: resumen?.cotizacion?.contract_version_snapshot || 1,
            created_at: new Date(),
            updated_at: new Date(),
          }}
          customContent={contrato?.content || resumen?.cotizacion?.contract_content_snapshot || null}
          condicionesComerciales={condiciones ? {
            id: cotizacionData?.condiciones_comerciales_id || resumen?.cotizacion?.condiciones_comerciales_id || '',
            name: condiciones.name || '',
            description: condiciones.description || null,
            discount_percentage: condiciones.discount_percentage || null,
            advance_percentage: condiciones.advance_percentage || null,
            advance_type: condiciones.advance_type || null,
            advance_amount: condiciones.advance_amount || null,
          } : undefined}
          isContractSigned={!!(contrato?.signed_at || resumen?.cotizacion?.contract_signed_at_snapshot)}
        />
      )}

    </>
  );
}
