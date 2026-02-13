'use server';

import { getPromiseFinancials } from '@/lib/utils/promise-financials';
import type { EventWithContact } from '@/lib/actions/schemas/events-schemas';

/**
 * Serializa un evento de Prisma al formato EventWithContact
 * Centraliza la lógica de cálculo de financials y mapeo de campos desde promise
 */
export async function serializeEventWithContact(evento: any): Promise<EventWithContact> {
  // Calcular montos desde promesa si existe
  let contractValue = null;
  let paidAmount = 0;
  let pendingAmount = 0;

  if (evento.promise_id) {
    const financials = await getPromiseFinancials(evento.promise_id);
    contractValue = financials.contractValue;
    paidAmount = financials.paidAmount;
    pendingAmount = financials.pendingAmount;
  }

  // Leer campos desde promesa
  const eventName = evento.promise?.name || null;
  const eventAddress = evento.promise?.address || null;
  const eventDate = evento.promise?.event_date || evento.event_date;

  return {
    id: evento.id,
    studio_id: evento.studio_id,
    contact_id: evento.contact_id,
    promise_id: evento.promise_id || null,
    cotizacion_id: evento.cotizacion_id,
    event_type_id: evento.event_type_id,
    stage_id: evento.stage_id,
    name: eventName,
    event_date: eventDate,
    address: eventAddress,
    sede: evento.promise?.event_location || null,
    status: evento.status,
    contract_value: contractValue,
    paid_amount: paidAmount,
    pending_amount: pendingAmount,
    created_at: evento.created_at,
    updated_at: evento.updated_at,
    event_type: evento.event_type,
    contact: evento.contact,
    promise: evento.promise,
    stage: evento.stage,
    agenda: evento.agenda?.[0] || evento.agenda || null,
    reminder:
      evento.promise?.reminder && !evento.promise.reminder.is_completed
        ? evento.promise.reminder
        : null,
    last_log: evento.promise?.logs?.[0] ?? null,
  };
}

/**
 * Serializa múltiples eventos en paralelo
 */
export async function serializeEventsWithContact(eventos: any[]): Promise<EventWithContact[]> {
  return Promise.all(eventos.map(serializeEventWithContact));
}
