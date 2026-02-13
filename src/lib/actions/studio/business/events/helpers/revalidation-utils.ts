'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Revalida todos los paths relacionados con un evento
 * Centraliza la lógica de revalidación para evitar duplicación
 */
export async function revalidateEventPaths(studioSlug: string, eventId: string): Promise<void> {
  revalidatePath(`/${studioSlug}/studio/business/events`, 'page');
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`, 'page');
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`, 'page');
  revalidateTag(`events-list-${studioSlug}`, 'page' as any);
}

/**
 * Revalida paths del scheduler específicamente
 */
export async function revalidateSchedulerPaths(studioSlug: string, eventId: string): Promise<void> {
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`, 'page');
  revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`, 'page');
}

/**
 * Revalida paths de la lista de eventos
 */
export async function revalidateEventsListPaths(studioSlug: string): Promise<void> {
  revalidatePath(`/${studioSlug}/studio/business/events`, 'page');
  revalidateTag(`events-list-${studioSlug}`, 'page' as any);
}
