'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Revalida todos los paths relacionados con un evento
 * Centraliza la lógica de revalidación para evitar duplicación
 */
export async function revalidateEventPaths(studioSlug: string, eventId: string): Promise<void> {
  revalidatePath(`/${studioSlug}/studio/business/events`);
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
  revalidateTag(`events-list-${studioSlug}`, 'max');
}

/**
 * Revalida paths del scheduler específicamente
 */
export async function revalidateSchedulerPaths(studioSlug: string, eventId: string): Promise<void> {
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
}

/**
 * Revalida paths de la lista de eventos
 */
export async function revalidateEventsListPaths(studioSlug: string): Promise<void> {
  revalidatePath(`/${studioSlug}/studio/business/events`);
  revalidateTag(`events-list-${studioSlug}`, 'max');
}
