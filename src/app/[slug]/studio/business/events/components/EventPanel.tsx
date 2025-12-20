'use client';

import React from 'react';
import { ContactEventInfoCard } from '@/components/shared/contact-info';
import { EventCotizacionesCard } from '../[eventId]/components/EventCotizacionesCard';
import { EventPaymentsCard } from '../[eventId]/components/EventPaymentsCard';
import { EventContractCard } from '../[eventId]/components/EventContractCard';
import { EventAgendamiento } from '../[eventId]/components/EventAgendamiento';
import { EventDeliverablesCard } from '../[eventId]/components/EventDeliverablesCard';
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
        {/* Columna 1: Información */}
        <div className="lg:col-span-1 space-y-6">
          <ContactEventInfoCard
            studioSlug={studioSlug}
            contactId={eventData.contact_id}
            contactData={{
              name: eventData.contact?.name || 'Sin nombre',
              phone: eventData.contact?.phone || '',
              email: eventData.contact?.email || null,
            }}
            eventData={{
              event_type_id: eventData.event_type_id,
              event_type_name: eventData.event_type?.name || null,
              event_location: eventData.promise?.event_location || eventData.event_location || null,
              event_name: eventData.promise?.name || eventData.name || null,
              event_date: eventData.event_date,
              address: eventData.address,
              sede: eventData.event_location || null,
              interested_dates: eventData.promise?.interested_dates || null,
            }}
            acquisitionData={eventData.promise && eventData.contact ? {
              acquisition_channel_id: eventData.promise.acquisition_channel_id,
              acquisition_channel_name: eventData.contact.acquisition_channel?.name || null,
              social_network_id: eventData.promise.social_network_id,
              social_network_name: eventData.contact.social_network?.name || null,
              referrer_contact_id: eventData.promise.referrer_contact_id,
              referrer_name: eventData.promise.referrer_name,
              referrer_contact_name: eventData.contact.referrer_contact?.name || null,
              referrer_contact_email: eventData.contact.referrer_contact?.email || null,
            } : null}
            promiseId={eventData.promise_id}
            eventId={eventId}
            promiseData={eventData.promise ? {
              id: eventData.promise.contact?.id || '',
              name: eventData.promise.contact?.name || '',
              phone: eventData.promise.contact?.phone || '',
              email: eventData.promise.contact?.email || null,
              event_type_id: eventData.promise.event_type_id,
              event_location: eventData.promise.event_location,
              event_name: eventData.promise.name || null,
              interested_dates: eventData.promise.interested_dates,
              acquisition_channel_id: eventData.promise.acquisition_channel_id,
              social_network_id: eventData.promise.social_network_id,
              referrer_contact_id: eventData.promise.referrer_contact_id,
              referrer_name: eventData.promise.referrer_name,
            } : null}
            onUpdated={onEventUpdated}
            context="event"
          />
        </div>

        {/* Columna 2: Cotizaciones + Pagos */}
        <div className="lg:col-span-1 space-y-6">
          <EventCotizacionesCard
            studioSlug={studioSlug}
            eventId={eventId}
            promiseId={eventData.promise_id}
            cotizaciones={eventData.cotizaciones || []}
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

        {/* Columna 3: Agenda + Contrato + Entregables + TODO */}
        <div className="lg:col-span-1 space-y-6">
          <EventAgendamiento
            studioSlug={studioSlug}
            eventId={eventId}
            eventDate={eventData.promise?.event_date || eventData.event_date}
            onAgendaUpdated={onEventUpdated}
          />

          <EventContractCard
            studioSlug={studioSlug}
            eventId={eventId}
            eventTypeId={eventData.event_type_id || undefined}
            onContractUpdated={onEventUpdated}
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
