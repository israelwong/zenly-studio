'use client';

import React from 'react';
import { ResumenEvento } from '../[eventId]/components/ResumenEvento';
import { EventFinancialSummaryCard } from '../[eventId]/components/EventFinancialSummaryCard';
import { EventAgendamiento } from '../[eventId]/components/EventAgendamiento';
import { EventSchedulerControlCard } from '../[eventId]/components/EventSchedulerControlCard';
import { EventDeliverablesCard } from '../[eventId]/components/EventDeliverablesCard';
import { QuickNoteCard } from '@/app/[slug]/studio/commercial/promises/[promiseId]/components/QuickNoteCard';
// import { EventItinerarioCard } from '../[eventId]/components/EventItinerarioCard';

import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface EventPanelProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  onEventUpdated?: () => void;
}

export function EventPanel({
  studioSlug,
  eventId,
  eventData,
  onEventUpdated,
}: EventPanelProps) {
  return (
    <div className="space-y-6">
      {/* Layout de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Contacto + Resumen financiero + Bitácora heredada */}
        <div className="lg:col-span-1 space-y-6">
          <ResumenEvento
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
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
            }))}
            studioSlug={studioSlug}
            cotizacionId={eventData.cotizacion?.id ?? null}
            onPaymentAdded={onEventUpdated}
            contractValueFallback={eventData.contract_value}
            paidAmountFallback={eventData.paid_amount}
            pendingAmountFallback={eventData.pending_amount}
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

        {/* Columna 2: Agenda + Entregables */}
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

        {/* Columna 3: Cronograma */}
        <div className="lg:col-span-1 space-y-6">
          <EventSchedulerControlCard
            studioSlug={studioSlug}
            eventId={eventId}
            eventDate={eventData.promise?.event_date || eventData.event_date || null}
            onUpdated={onEventUpdated}
          />
        </div>
      </div>
    </div>
  );
}
