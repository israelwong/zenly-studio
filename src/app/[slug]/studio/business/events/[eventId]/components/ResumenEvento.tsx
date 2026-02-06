'use client';

import React, { useState, useEffect } from 'react';
import { Eye, FileText, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenDialog, ZenBadge } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { ContractPreviewForPromiseModal } from '@/app/[slug]/studio/commercial/promises/[promiseId]/cierre/components/contratos/ContractPreviewForPromiseModal';
import { ResumenCotizacionAutorizada } from './ResumenCotizacionAutorizada';
import { getCondicionesComerciales, getContrato } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';

interface ResumenEventoProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
}

export function ResumenEvento({ studioSlug, eventId, eventData }: ResumenEventoProps) {
  const [showCotizacionPreview, setShowCotizacionPreview] = useState(false);
  const [showContratoPreview, setShowContratoPreview] = useState(false);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<any>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingResumen, setLoadingResumen] = useState(true);

  // Cargar resumen del evento con snapshots inmutables
  useEffect(() => {
    const loadResumen = async () => {
      setLoadingResumen(true);
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventId);
        if (result.success && result.data) {
          setResumen(result.data);
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      } finally {
        setLoadingResumen(false);
      }
    };
    loadResumen();
  }, [studioSlug, eventId]);

  // Obtener datos procesados desde snapshots inmutables (igual que CotizacionAutorizadaCard)
  const cotizacionData = resumen?.cotizacion || eventData.cotizacion;
  const condiciones = resumen?.cotizacion
    ? getCondicionesComerciales(resumen.cotizacion)
    : cotizacionData
      ? getCondicionesComerciales(cotizacionData)
      : null;
  const contrato = resumen?.cotizacion
    ? getContrato(resumen.cotizacion)
    : cotizacionData
      ? getContrato(cotizacionData)
      : null;

  // Calcular totales
  const subtotal = cotizacionData?.price || 0;
  const descuento = condiciones?.discount_percentage
    ? subtotal * (condiciones.discount_percentage / 100)
    : (cotizacionData?.discount || 0);
  const total = subtotal - descuento;

  // Calcular anticipo
  const anticipo = condiciones?.advance_type === 'percentage' && condiciones?.advance_percentage
    ? total * (condiciones.advance_percentage / 100)
    : condiciones?.advance_type === 'amount' && condiciones?.advance_amount
      ? condiciones.advance_amount
      : 0;

  const isContratoFirmado = contrato?.signed_at !== null && contrato?.signed_at !== undefined;

  const handlePreviewCotizacion = async () => {
    if (!cotizacionData) return;

    setLoadingCotizacion(true);
    setShowCotizacionPreview(true);
    try {
      const result = await getCotizacionById(cotizacionData.id, studioSlug);
      if (result.success && result.data) {
        // Convertir al formato esperado por ResumenCotizacionAutorizada
        const cotizacionFormateada = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          price: result.data.price,
          discount: descuento,
          status: result.data.status,
          cotizacion_items: result.data.items.map((item: any) => ({
            id: item.id,
            item_id: item.item_id,
            quantity: item.quantity,
            name: item.name_snapshot || item.name,
            description: item.description_snapshot || item.description,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            cost: item.cost,
            cost_snapshot: item.cost,
            profit_type: null,
            profit_type_snapshot: null,
            task_type: null,
            assigned_to_crew_member_id: null,
            scheduler_task_id: null,
            assignment_date: null,
            delivery_date: null,
            internal_delivery_days: null,
            client_delivery_days: null,
            status: 'active',
            seccion_name: item.seccion_name_snapshot || item.seccion_name,
            category_name: item.category_name_snapshot || item.category_name,
            seccion_name_snapshot: item.seccion_name_snapshot,
            category_name_snapshot: item.category_name_snapshot,
          })),
        };
        setCotizacionCompleta(cotizacionFormateada);
      } else {
        toast.error(result.error || 'Error al cargar cotización');
        setShowCotizacionPreview(false);
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
      toast.error('Error al cargar cotización');
      setShowCotizacionPreview(false);
    } finally {
      setLoadingCotizacion(false);
    }
  };

  const handlePreviewContrato = () => {
    if (contrato?.content) {
      setShowContratoPreview(true);
    }
  };

  const fechaEvento = resumen?.evento?.event_date || eventData.promise?.event_date || eventData.event_date;

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Resumen del Evento
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="space-y-4">
            {/* Información básica */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-0.5">Cliente</p>
                <p className="text-sm text-zinc-200">
                  {eventData.contact?.name || eventData.promise?.contact?.name || 'Sin nombre'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-0.5">Teléfono</p>
                <p className="text-sm text-zinc-200">
                  {eventData.contact?.phone || eventData.promise?.contact?.phone || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-0.5">Correo</p>
                <p className="text-sm text-zinc-200">
                  {eventData.contact?.email || eventData.promise?.contact?.email || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">Tipo de evento</p>
                {eventData.event_type?.name ? (
                  <ZenBadge variant="success" size="sm">{eventData.event_type.name}</ZenBadge>
                ) : (
                  <p className="text-xs text-zinc-500">Sin tipo</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-0.5">Nombre del evento</p>
                <p className="text-sm text-zinc-200">
                  {eventData.promise?.name || eventData.name || 'Sin nombre'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-0.5">Locación/Sede</p>
                <p className="text-sm text-zinc-200">
                  {eventData.promise?.event_location || eventData.event_location || 'Sin locación'}
                </p>
              </div>
            </div>

            {/* Contrato */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              {loadingResumen ? (
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-400 mb-1">Contrato</p>
                      <div className="flex items-center gap-2">
                        {isContratoFirmado ? (
                          <ZenBadge variant="success" size="sm">Firmado</ZenBadge>
                        ) : contrato ? (
                          <ZenBadge variant="warning" size="sm">Pendiente de firma</ZenBadge>
                        ) : (
                          <ZenBadge variant="secondary" size="sm">Sin contrato</ZenBadge>
                        )}
                      </div>
                    </div>
                    {contrato?.content && (
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={handlePreviewContrato}
                        className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 shrink-0"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </ZenButton>
                    )}
                  </div>

                  {isContratoFirmado && fechaEvento && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-0.5">Fecha de evento</p>
                      <p className="text-xs text-zinc-300">{formatDisplayDateLong(toUtcDateOnly(fechaEvento))}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal Preview Cotización */}
      <ZenDialog
        isOpen={showCotizacionPreview}
        onClose={() => {
          setShowCotizacionPreview(false);
          setCotizacionCompleta(null);
        }}
        title={`Cotización: ${cotizacionData?.name || ''}`}
        description="Vista previa completa de la cotización con desglose y condiciones comerciales"
        maxWidth="4xl"
        onCancel={() => {
          setShowCotizacionPreview(false);
          setCotizacionCompleta(null);
        }}
        cancelLabel="Cerrar"
        zIndex={10070}
      >
        {loadingCotizacion ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : cotizacionCompleta ? (
          <ResumenCotizacionAutorizada
            cotizacion={cotizacionCompleta}
            studioSlug={studioSlug}
            promiseId={eventData.promise_id || undefined}
          />
        ) : null}
      </ZenDialog>

      {/* Modal Preview Contrato */}
      {showContratoPreview && contrato?.content && (
        <ContractPreviewForPromiseModal
          isOpen={showContratoPreview}
          onClose={() => setShowContratoPreview(false)}
          onConfirm={() => setShowContratoPreview(false)}
          onEdit={() => { }}
          studioSlug={studioSlug}
          promiseId={eventData.promise_id || ''}
          cotizacionId={cotizacionData?.id || ''}
          eventId={eventId}
          template={{
            id: contrato.template_id || '',
            name: contrato.template_name || 'Contrato',
            slug: contrato.template_id || '',
            content: contrato.content,
            studio_id: '',
            is_active: true,
            is_default: false,
            version: contrato.version || 1,
            created_at: new Date(),
            updated_at: new Date(),
          }}
          customContent={contrato.content}
          condicionesComerciales={condiciones ? {
            id: '',
            name: condiciones.name || '',
            description: condiciones.description || null,
            discount_percentage: condiciones.discount_percentage || null,
            advance_percentage: condiciones.advance_percentage || null,
            advance_type: condiciones.advance_type || null,
            advance_amount: condiciones.advance_amount || null,
          } : undefined}
          isContractSigned={isContratoFirmado}
        />
      )}
    </>
  );
}

