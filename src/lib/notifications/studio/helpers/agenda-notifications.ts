'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyAgendaCreated(
  studioId: string,
  agendaId: string,
  promiseId: string | null,
  eventId: string | null,
  date: Date,
  concept: string | null
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });

  // Obtener datos del agendamiento
  const agenda = await prisma.studio_agenda.findUnique({
    where: { id: agendaId },
    select: {
      agenda_tipo: true,
      promise: {
        include: {
          contact: {
            select: { name: true },
          },
          event_type: {
            select: { name: true },
          },
        },
      },
      eventos: {
        include: {
          contact: {
            select: { name: true },
          },
          event_type: {
            select: { name: true },
          },
        },
      },
    },
  });

  let contactName: string | null = null;
  let eventTypeName: string | null = null;
  let agendaTipoName: string | null = null;

  if (promiseId && agenda?.promise) {
    contactName = agenda.promise.contact?.name || null;
    eventTypeName = agenda.promise.event_type?.name || null;
    agendaTipoName = agenda.agenda_tipo || null;
  } else if (eventId && agenda?.eventos) {
    contactName = agenda.eventos.contact?.name || null;
    eventTypeName = agenda.eventos.event_type?.name || null;
    agendaTipoName = agenda.agenda_tipo || null;
  }

  // Construir mensaje: para promesas "{nombre_contacto} - {tipo_evento} - {tipo_cita}"
  let message = 'Nuevo agendamiento creado';
  
  if (promiseId) {
    // Para promesas: nombre contacto - tipo evento - tipo cita
    const parts: string[] = [];
    if (contactName) parts.push(contactName);
    if (eventTypeName) parts.push(eventTypeName);
    if (agendaTipoName) parts.push(agendaTipoName);
    
    if (parts.length > 0) {
      message = parts.join(' - ');
    }
  } else if (eventId) {
    // Para eventos: nombre contacto - tipo evento
    if (contactName && eventTypeName) {
      message = `${contactName} - ${eventTypeName}`;
    } else if (contactName) {
      message = contactName;
    } else if (eventTypeName) {
      message = eventTypeName;
    }
  }

  // Determinar contexto y ruta
  // La agenda ahora es un sheet, así que redirigimos al dashboard comercial
  let route = '/{slug}/studio/commercial/dashboard';
  
  if (promiseId) {
    route = '/{slug}/studio/commercial/promises/{promise_id}';
  } else if (eventId) {
    route = '/{slug}/studio/business/events/{event_id}';
  }
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.AGENDA_CREATED,
    studio_id: studioId,
    title: 'Nuevo agendamiento',
    message,
    category: 'agenda',
    priority: NotificationPriority.MEDIUM,
    route,
    route_params: {
      slug: studio?.slug,
      promise_id: promiseId || undefined,
      event_id: eventId || undefined,
      agenda_id: agendaId,
    },
    metadata: {
      concept: concept || null,
      date: date.toISOString(),
      contact_name: contactName,
      event_type: eventTypeName,
      agenda_tipo: agendaTipoName,
    },
    promise_id: promiseId || undefined,
    event_id: eventId || undefined,
    agenda_id: agendaId,
  });
}

