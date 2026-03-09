'use server';

import { prisma } from '@/lib/prisma';

export type SystemEventActionType =
  | 'PROMISE_ARCHIVED'
  | 'PROMISE_RESTORED'
  | 'QUOTE_ARCHIVED'
  | 'QUOTE_RESTORED'
  | 'PROMISE_CANCELLED'
  | 'PROMISE_MOVED_TO_CLOSING';

export interface DispatchSystemEventPayload {
  promiseName?: string;
  contactName?: string;
  quoteName?: string;
  reason?: string;
}

const fallback = (v: string | undefined) => v?.trim() || 'Sin nombre';

const MESSAGES: Record<
  SystemEventActionType,
  (p: DispatchSystemEventPayload) => { log: string; title: string; notification: string }
> = {
  PROMISE_ARCHIVED: (p) => {
    const contactName = fallback(p.contactName);
    const promiseName = fallback(p.promiseName);
    return {
      log: `Se archivó el seguimiento del evento '${promiseName}'.`,
      title: `Promesa Archivada - ${contactName}`,
      notification: `Se archivó el seguimiento del evento '${promiseName}'.`,
    };
  },
  PROMISE_RESTORED: (p) => {
    const contactName = fallback(p.contactName);
    const promiseName = fallback(p.promiseName);
    return {
      log: `Se habilitó nuevamente la promesa para '${promiseName}'.`,
      title: `Promesa Restaurada - ${contactName}`,
      notification: `Se habilitó nuevamente la promesa para '${promiseName}'.`,
    };
  },
  QUOTE_ARCHIVED: (p) => {
    const contactName = fallback(p.contactName);
    const quoteName = fallback(p.quoteName);
    const promiseName = fallback(p.promiseName);
    return {
      log: `Cotización '${quoteName}' archivada.`,
      title: `Cotización Archivada - ${contactName}`,
      notification: `Se archivó la cotización '${quoteName}' de '${promiseName}'.`,
    };
  },
  QUOTE_RESTORED: (p) => {
    const contactName = fallback(p.contactName);
    const quoteName = fallback(p.quoteName);
    const promiseName = fallback(p.promiseName);
    return {
      log: `Cotización '${quoteName}' restaurada y disponible para selección.`,
      title: `Cotización Restaurada - ${contactName}`,
      notification: `Se restauró la cotización '${quoteName}' de '${promiseName}'.`,
    };
  },
  PROMISE_CANCELLED: (p) => {
    const contactName = fallback(p.contactName);
    const promiseName = fallback(p.promiseName);
    const reason = p.reason?.trim() || 'Sin motivo indicado';
    return {
      log: `Promesa cancelada. Motivo: ${reason}.`,
      title: `Promesa Cancelada - ${contactName}`,
      notification: `Evento '${promiseName}' cancelado. Motivo: ${reason}.`,
    };
  },
  PROMISE_MOVED_TO_CLOSING: (p) => {
    const quoteName = fallback(p.quoteName);
    return {
      log: `La promesa se publicó y se movió a Cierre con la cotización '${quoteName}'.`,
      title: 'Promesa en Cierre',
      notification: `¡Éxito! La promesa se publicó y se movió a Cierre con la cotización '${quoteName}'.`,
    };
  },
};

/**
 * Orquestador central de eventos del sistema: bitácora + notificación panel.
 * El cliente debe emitir `promise-logs-invalidate` tras la acción para refrescar la QuickNoteCard.
 */
export async function dispatchSystemEvent(
  promiseId: string,
  studioSlug: string,
  _userId: string | null | undefined,
  actionType: SystemEventActionType,
  payload: DispatchSystemEventPayload = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const { log, title, notification } = MESSAGES[actionType](payload);

    const { createPromiseLog } = await import('@/lib/actions/studio/commercial/promises/promise-logs.actions');
    await createPromiseLog(studioSlug, {
      promise_id: promiseId,
      content: log,
      log_type: 'system_event',
      origin_context: 'PROMISE',
    }).catch((err) => {
      console.error('[SYSTEM_EVENTS] Error registrando log:', err);
    });

    const { createStudioNotification } = await import('@/lib/notifications/studio/studio-notification.service');
    const { StudioNotificationScope, StudioNotificationType, NotificationPriority } = await import('@/lib/notifications/studio/types');
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.PROMISE_UPDATED,
      studio_id: studio.id,
      title,
      message: notification,
      category: 'promises',
      priority: NotificationPriority.MEDIUM,
      route: '/{slug}/studio/commercial/promises/{promise_id}',
      route_params: { slug: studioSlug, promise_id: promiseId },
      promise_id: promiseId,
    }).catch((err) => {
      console.error('[SYSTEM_EVENTS] Error creando notificación:', err);
    });

    return { success: true };
  } catch (error) {
    console.error('[SYSTEM_EVENTS] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error en evento del sistema',
    };
  }
}
