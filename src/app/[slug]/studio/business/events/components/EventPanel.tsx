'use client';

import React from 'react';
import { ResumenEvento } from '../[eventId]/components/ResumenEvento';
import { CondicionesComerciales } from '../[eventId]/components/CondicionesComerciales';
import { EventCotizacionesCard } from '../[eventId]/components/EventCotizacionesCard';
import { EventPaymentsCard } from '../[eventId]/components/EventPaymentsCard';
import { EventAgendamiento } from '../[eventId]/components/EventAgendamiento';
import { EventCronogramaCard } from '../[eventId]/components/EventCronogramaCard';
import { EventDeliverablesCard } from '../[eventId]/components/EventDeliverablesCard';
import { QuickNoteCard } from '@/app/[slug]/studio/commercial/promises/[promiseId]/components/QuickNoteCard';
// import { EventTodoCard } from '../[eventId]/components/EventTodoCard';
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
        {/* Columna 1: Resumen del Evento + Bitácora heredada */}
        <div className="lg:col-span-1 space-y-6">
          <ResumenEvento
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
          />
          {eventData.promise_id && (
            <QuickNoteCard
              studioSlug={studioSlug}
              promiseId={eventData.promise_id}
              onLogAdded={onEventUpdated}
            />
          )}
          <CondicionesComerciales
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
          />
        </div>

        {/* Columna 2: Cotizaciones + Pagos */}
        <div className="lg:col-span-1 space-y-6">
          <EventCotizacionesCard
            studioSlug={studioSlug}
            eventId={eventId}
            promiseId={eventData.promise_id}
            cotizaciones={eventData.cotizaciones || []}
            eventData={eventData}
            onUpdated={onEventUpdated}
          />

          <EventPaymentsCard
            studioSlug={studioSlug}
            cotizacionId={eventData.cotizacion?.id}
            contractValue={eventData.contract_value ?? undefined}
            paidAmount={eventData.paid_amount}
            pendingAmount={eventData.pending_amount}
            payments={(eventData.payments ?? []).map(payment => ({
              id: payment.id,
              amount: payment.amount,
              payment_method: payment.payment_method,
              payment_date: payment.payment_date,
              concept: payment.concept || '',
            }))}
            onPaymentAdded={onEventUpdated}
          />
        </div>

        {/* Columna 3: Agenda + Entregables + TODO */}
        <div className="lg:col-span-1 space-y-6">
          <EventAgendamiento
            studioSlug={studioSlug}
            eventId={eventId}
            eventDate={eventData.promise?.event_date || eventData.event_date || null}
            onAgendaUpdated={onEventUpdated}
          />

          <EventCronogramaCard
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            onUpdated={onEventUpdated}
          />

          <EventDeliverablesCard
            studioSlug={studioSlug}
            eventId={eventId}
            onUpdated={onEventUpdated}
          />

          {/* TODO: Funcionalidad futura - EventTodoCard
          <EventTodoCard
            studioSlug={studioSlug}
            eventId={eventId}
          />
          */}

          {/* TODO: Funcionalidad futura - EventItinerarioCard
          <EventItinerarioCard
            studioSlug={studioSlug}
            eventId={eventId}
          />
          */}

        </div>
      </div>
    </div>
  );
}
