'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Revalida todos los paths relacionados con un evento
 * Centraliza la lógica de revalidación para evitar duplicación
 */
export function revalidateEventPaths(studioSlug: string, eventId: string): void {
  revalidatePath(`/${studioSlug}/studio/business/events`);
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
  revalidateTag(`events-list-${studioSlug}`);
}

/**
 * Revalida paths del scheduler específicamente
 */
export function revalidateSchedulerPaths(studioSlug: string, eventId: string): void {
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
}

/**
 * Revalida paths de la lista de eventos
 */
export function revalidateEventsListPaths(studioSlug: string): void {
  revalidatePath(`/${studioSlug}/studio/business/events`);
  revalidateTag(`events-list-${studioSlug}`);
}
