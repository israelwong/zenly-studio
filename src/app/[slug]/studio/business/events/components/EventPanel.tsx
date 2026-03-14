'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ResumenEvento } from '../[eventId]/components/ResumenEvento';
import { EventFinancialSummaryCard } from '../[eventId]/components/EventFinancialSummaryCard';
import { EventAgendamiento } from '../[eventId]/components/EventAgendamiento';
import { EventDeliverablesCard } from '../[eventId]/components/EventDeliverablesCard';
import { EventTodoCardCompact } from './EventTodoCardCompact';
import { QuickNoteCard } from '@/app/[slug]/studio/commercial/promises/[promiseId]/components/QuickNoteCard';

import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventoResumenData } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';

interface EventPanelProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  initialResumen?: EventoResumenData | null;
  onEventUpdated?: () => void;
  /** Callback para actualización optimista de eventData (sync). */
  onEventDataChange?: (data: EventoDetalle) => void;
  /** Si hay contrato(s) para el evento (muestra sección Documentos). */
  hasContract?: boolean;
}

export function EventPanel({
  studioSlug,
  eventId,
  eventData,
  initialResumen,
  onEventUpdated,
  onEventDataChange,
  hasContract = false,
}: EventPanelProps) {
  const col1Ref = useRef<HTMLDivElement>(null);
  const [col1Height, setCol1Height] = useState<number | null>(null);

  useEffect(() => {
    const el = col1Ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setCol1Height(entry.contentRect.height);
    });
    ro.observe(el);
    setCol1Height(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [eventData?.id]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div ref={col1Ref} className="lg:col-span-1 space-y-6">
          <ResumenEvento
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            initialResumen={initialResumen}
          />
          <EventFinancialSummaryCard
            initialQuote={
              eventData.cotizaciones?.length
                ? eventData.cotizaciones
                : eventData.cotizacion
                  ? [eventData.cotizacion]
                  : null
            }
            initialPayments={(eventData.payments ?? []).map((p) => ({
              id: p.id,
              amount: p.amount,
              payment_method: p.payment_method,
              payment_date: p.payment_date,
              concept: p.concept ?? '',
              cotizacion_id: p.cotizacion_id ?? null,
            }))}
            studioSlug={studioSlug}
            cotizacionId={eventData.cotizacion?.id ?? null}
            onPaymentAdded={onEventUpdated}
            contractValueFallback={eventData.contract_value}
            paidAmountFallback={eventData.paid_amount}
            pendingAmountFallback={eventData.pending_amount}
            mainCotizacionId={eventData.cotizacion?.id ?? null}
            eventId={eventId}
            hasContract={hasContract}
            promiseId={eventData.promise_id ?? null}
          />
          {eventData.promise_id && (
            <QuickNoteCard
              studioSlug={studioSlug}
              promiseId={eventData.promise_id}
              context="EVENT"
              onLogAdded={onEventUpdated}
            />
          )}
        </div>

        {/* Columna 2: Tareas (max-height = altura columna 1; lista con scroll interno) */}
        <div
          className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-10rem)]"
          style={col1Height != null ? { maxHeight: col1Height } : undefined}
        >
          <EventTodoCardCompact
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            secciones={eventData.secciones}
            onEventUpdated={onEventUpdated}
          />
        </div>

        {/* Columna 3: Agenda + Entregables */}
        <div className="lg:col-span-1 space-y-6">
          <EventAgendamiento
            studioSlug={studioSlug}
            eventId={eventId}
            eventDate={eventData.promise?.event_date || eventData.event_date || null}
            onAgendaUpdated={onEventUpdated}
          />
          <EventDeliverablesCard
            studioSlug={studioSlug}
            eventId={eventId}
            onUpdated={onEventUpdated}
          />
        </div>
      </div>
    </div>
  );
}
