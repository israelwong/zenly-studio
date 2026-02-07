'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenDialog,
} from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { ResumenCotizacionAutorizada, type CotizacionItem as ResumenCotizacionItem } from './ResumenCotizacionAutorizada';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

type CotizacionAprobada = NonNullable<EventoDetalle['cotizaciones']>[number];

interface EventCotizacionesCardProps {
  studioSlug: string;
  eventId: string;
  promiseId?: string | null;
  cotizaciones?: EventoDetalle['cotizaciones'];
  eventData?: EventoDetalle;
  onUpdated?: () => void;
}

export function EventCotizacionesCard({
  studioSlug,
  eventId,
  promiseId,
  cotizaciones,
  eventData,
}: EventCotizacionesCardProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    discount: number;
    status: string;
    cotizacion_items: ResumenCotizacionItem[];
  } | null>(null);
  const [resumen, setResumen] = useState<{ cotizacion?: { description?: string | null } } | null>(null);

  const cotizacionAprobada = (cotizaciones || []).find(
    (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
  ) as CotizacionAprobada | undefined;

  useEffect(() => {
    if (!cotizacionAprobada) return;
    let cancelled = false;
    obtenerResumenEventoCreado(studioSlug, eventId).then((result) => {
      if (!cancelled && result.success && result.data) setResumen(result.data);
    });
    return () => { cancelled = true; };
  }, [studioSlug, eventId, cotizacionAprobada?.id]);

  const description = cotizacionAprobada ? (resumen?.cotizacion?.description ?? null) : null;

  const handlePreview = async () => {
    if (!cotizacionAprobada) return;
    setLoadingCotizacion(true);
    setShowViewModal(true);
    try {
      const result = await getCotizacionById(cotizacionAprobada.id, studioSlug);
      if (result.success && result.data) {
        const discountPct = cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot != null
          ? Number(cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot)
          : null;
        const discount = discountPct ? result.data.price * (discountPct / 100) : 0;
        setCotizacionCompleta({
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          price: result.data.price,
          discount,
          status: result.data.status,
          cotizacion_items: result.data.items.map((item: {
            id: string;
            item_id: string | null;
            quantity: number;
            name_snapshot?: string | null;
            name: string;
            description_snapshot?: string | null;
            description: string | null;
            unit_price: number;
            subtotal: number;
            cost: number;
            seccion_name_snapshot?: string | null;
            seccion_name: string | null;
            category_name_snapshot?: string | null;
            category_name: string | null;
          }) => ({
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
        });
      } else {
        toast.error(result.error || 'Error al cargar la cotización');
        setShowViewModal(false);
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
      toast.error('Error al cargar la cotización');
      setShowViewModal(false);
    } finally {
      setLoadingCotizacion(false);
    }
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Cotización
            </ZenCardTitle>
            {cotizacionAprobada && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 shrink-0"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {cotizacionAprobada ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-200 font-medium">{cotizacionAprobada.name}</p>
              {description && (
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{description}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500">No hay cotización autorizada</p>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal Preview Cotización */}
      <ZenDialog
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setCotizacionCompleta(null);
        }}
        title={`Cotización: ${cotizacionAprobada?.name || ''}`}
        description="Vista previa completa de la cotización con desglose y condiciones comerciales"
        maxWidth="4xl"
        onCancel={() => {
          setShowViewModal(false);
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
          cotizacionCompleta.cotizacion_items && cotizacionCompleta.cotizacion_items.length > 0 ? (
            <ResumenCotizacionAutorizada
              cotizacion={cotizacionCompleta}
              studioSlug={studioSlug}
              promiseId={cotizacionAprobada?.promise_id || undefined}
            />
          ) : (
            <ResumenCotizacion
              cotizacion={{
                id: cotizacionCompleta.id,
                name: cotizacionCompleta.name,
                description: cotizacionCompleta.description,
                price: cotizacionCompleta.price,
                status: cotizacionCompleta.status,
                items: [],
              }}
              studioSlug={studioSlug}
              promiseId={cotizacionAprobada?.promise_id || undefined}
            />
          )
        ) : null}
      </ZenDialog>
    </>
  );
}
