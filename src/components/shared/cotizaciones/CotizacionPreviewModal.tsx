'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ResumenCotizacionAutorizada } from '@/app/[slug]/studio/business/events/[eventId]/components/ResumenCotizacionAutorizada';
import { toast } from 'sonner';

export interface CotizacionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacionId: string | null;
  studioSlug: string;
  promiseId?: string | null;
  /** Título del modal (ej. nombre de la cotización). */
  title?: string;
}

function mapItemForResumen(item: Record<string, unknown>) {
  return {
    id: item.id,
    item_id: item.item_id ?? null,
    quantity: item.quantity ?? 1,
    name: (item.name_snapshot ?? item.name) ?? null,
    description: (item.description_snapshot ?? item.description) ?? null,
    unit_price: Number(item.unit_price ?? 0),
    subtotal: Number(item.subtotal ?? 0),
    cost: Number(item.cost ?? 0),
    cost_snapshot: Number((item as { cost_snapshot?: number }).cost_snapshot ?? item.cost ?? 0),
    profit_type: null,
    profit_type_snapshot: null,
    task_type: item.task_type ?? null,
    assigned_to_crew_member_id: item.assigned_to_crew_member_id ?? null,
    scheduler_task_id: item.scheduler_task_id ?? null,
    assignment_date: item.assignment_date ?? null,
    delivery_date: item.delivery_date ?? null,
    internal_delivery_days: item.internal_delivery_days ?? null,
    client_delivery_days: item.client_delivery_days ?? null,
    status: (item.status as string) ?? 'active',
    seccion_name: (item.seccion_name_snapshot ?? item.seccion_name) ?? null,
    category_name: (item.category_name_snapshot ?? item.category_name) ?? null,
    seccion_name_snapshot: item.seccion_name_snapshot ?? null,
    category_name_snapshot: item.category_name_snapshot ?? null,
  };
}

/**
 * Modal compartido para mostrar vista previa de una cotización (desglose de servicios + total).
 * Usa getCotizacionById y ResumenCotizacionAutorizada. Para uso interno del estudio (event_review, etc.).
 */
export function CotizacionPreviewModal({
  isOpen,
  onClose,
  cotizacionId,
  studioSlug,
  promiseId = null,
  title = 'Cotización',
}: CotizacionPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [cotizacion, setCotizacion] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    discount: number | null;
    status: string;
    cotizacion_items: ReturnType<typeof mapItemForResumen>[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !cotizacionId || !studioSlug) {
      setCotizacion(null);
      return;
    }
    setLoading(true);
    setCotizacion(null);
    getCotizacionById(cotizacionId, studioSlug)
      .then((result) => {
        if (result.success && result.data) {
          const data = result.data;
          const discount = data.discount != null ? Number(data.discount) : null;
          setCotizacion({
            id: data.id,
            name: data.name,
            description: data.description ?? null,
            price: Number(data.price ?? 0),
            discount,
            status: data.status,
            cotizacion_items: (data.items ?? []).map((item: Record<string, unknown>) => mapItemForResumen(item)),
          });
        } else {
          toast.error(result.error ?? 'No se pudo cargar la cotización');
          onClose();
        }
      })
      .catch((err) => {
        console.error('[CotizacionPreviewModal]', err);
        toast.error('Error al cargar la cotización');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [isOpen, cotizacionId, studioSlug, onClose]);

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={cotizacion?.name ?? title}
      description="Vista previa de la cotización con desglose de servicios"
      maxWidth="4xl"
      onCancel={onClose}
      cancelLabel="Cerrar"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      ) : cotizacion ? (
        <ResumenCotizacionAutorizada
          cotizacion={cotizacion}
          studioSlug={studioSlug}
          promiseId={promiseId ?? undefined}
          hideCardTitle
        />
      ) : null}
    </ZenDialog>
  );
}
