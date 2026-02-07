'use server';

import { prisma } from '@/lib/prisma';
import { ActionResponse } from '@/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { normalizePaymentDate } from '@/lib/actions/utils/payment-date';

/**
 * Obtiene los métodos de pago activos del estudio
 * Helper para el modal de autorización
 */
export async function getPaymentMethodsForAuthorization(
  studioSlug: string
): Promise<ActionResponse<Array<{ id: string; name: string }>>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const paymentMethods = await prisma.studio_metodos_pago.findMany({
      where: {
        studio_id: studio.id,
        status: 'active',
      },
      select: {
        id: true,
        payment_method_name: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return {
      success: true,
      data: paymentMethods.map((pm) => ({
        id: pm.id,
        name: pm.payment_method_name,
      })),
    };
  } catch (error) {
    console.error('[getPaymentMethodsForAuthorization] Error:', error);
    return {
      success: false,
      error: 'Error al obtener métodos de pago',
    };
  }
}

// Schema para autorización legacy (crea evento inmediatamente)
const AutorizarCotizacionLegacySchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  cotizacion_id: z.string().cuid('ID de cotización inválido'),
  promise_id: z.string().cuid('ID de promesa inválido'),
  condiciones_comerciales_id: z.string().cuid('ID de condiciones comerciales inválido'),
  monto: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
  registrar_pago: z.boolean().default(false),
  pago_data: z.object({
    concepto: z.string().min(1, 'Concepto requerido'),
    monto: z.number().min(0, 'Monto inválido'),
    fecha: z.date(),
    payment_method_id: z.string().cuid('ID de método de pago inválido'),
  }).optional(),
  generar_contrato: z.boolean().default(false),
  contract_template_id: z.string().cuid('ID de plantilla de contrato inválido').optional(),
});

type AutorizarCotizacionLegacyInput = z.infer<typeof AutorizarCotizacionLegacySchema>;

/**
 * Autoriza una cotización en modo LEGACY (cliente existente/importado)
 * - Crea el evento inmediatamente (sin flujo de contrato digital)
 * - Opcionalmente registra un pago inicial
 * - Cambia la promesa a etapa "approved"
 * - Archiva otras cotizaciones de la misma promesa
 */
export async function autorizarCotizacionLegacy(
  data: AutorizarCotizacionLegacyInput
): Promise<ActionResponse<{ eventId: string; cotizacionStatus: string }>> {
  try {
    const validated = AutorizarCotizacionLegacySchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: validated.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotización con relaciones
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validated.cotizacion_id,
        studio_id: studio.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        promise: {
          select: {
            id: true,
            contact_id: true,
            event_type_id: true,
            event_location: true,
            event_date: true,
            name: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Validar que la promesa tenga fecha de evento
    if (!cotizacion.promise?.event_date) {
      return {
        success: false,
        error: 'Debes confirmar la fecha del evento antes de autorizar la cotización.',
      };
    }

    const contactId = cotizacion.contact_id || cotizacion.promise?.contact_id;
    if (!contactId) {
      return { success: false, error: 'La cotización no tiene contacto asociado' };
    }

    // Primera etapa del Event Pipeline (menor order, ej. Planeación) — orderBy para no depender del valor fijo
    const initialStage = await prisma.studio_manager_pipeline_stages.findFirst({
      where: { studio_id: studio.id, is_active: true },
      orderBy: { order: 'asc' },
    });

    if (!initialStage) {
      return { success: false, error: 'No se encontró una etapa inicial activa en el pipeline de eventos.' };
    }

    // Obtener etapa "approved" del pipeline de promises
    const etapaAprobado = await prisma.studio_promise_pipeline_stages.findFirst({
      where: {
        studio_id: studio.id,
        slug: 'approved',
        is_active: true,
      },
    });

    let eventId: string;

    // Transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Crear el evento inmediatamente
      const nuevoEvento = await tx.studio_events.create({
        data: {
          studio_id: studio.id,
          contact_id: contactId,
          promise_id: validated.promise_id,
          cotizacion_id: validated.cotizacion_id,
          event_type_id: cotizacion.promise?.event_type_id || null,
          stage_id: initialStage.id,
          event_date: cotizacion.promise.event_date,
          status: 'ACTIVE',
          name: cotizacion.promise.name || 'Evento de ' + cotizacion.contact?.name,
          address: cotizacion.contact?.address || cotizacion.promise?.event_location || null,
        },
      });
      eventId = nuevoEvento.id;

      // 1.1. Actualizar contacto de "prospecto" a "cliente" cuando se crea un evento
      const contacto = await tx.studio_contacts.findUnique({
        where: { id: contactId },
        select: { status: true },
      });
      if (contacto && contacto.status === 'prospecto') {
        await tx.studio_contacts.update({
          where: { id: contactId },
          data: {
            status: 'cliente',
            updated_at: new Date(),
          },
        });
      }

      // 2. Actualizar cotización a "autorizada"
      await tx.studio_cotizaciones.update({
        where: { id: validated.cotizacion_id },
        data: {
          status: 'autorizada',
          evento_id: eventId,
          condiciones_comerciales_id: validated.condiciones_comerciales_id,
          updated_at: new Date(),
          payment_promise_date: new Date(),
          payment_registered: validated.registrar_pago,
        },
      });

      // 3. Archivar otras cotizaciones de la promesa
      const otrasCotizaciones = await tx.studio_cotizaciones.findMany({
        where: {
          promise_id: validated.promise_id,
          id: { not: validated.cotizacion_id },
          archived: false,
          status: { not: 'cancelada' },
        },
        select: { id: true },
      });

      if (otrasCotizaciones.length > 0) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            id: { in: otrasCotizaciones.map((c) => c.id) },
          },
          data: {
            archived: true,
            updated_at: new Date(),
          },
        });
      }

      // 4. Cambiar etapa de la promesa a "approved"
      if (etapaAprobado) {
        await tx.studio_promises.update({
          where: { id: validated.promise_id },
          data: {
            pipeline_stage_id: etapaAprobado.id,
            updated_at: new Date(),
          },
        });

        // Eliminar etiqueta "Cancelada" si existe
        const tagCancelada = await tx.studio_promise_tags.findUnique({
          where: {
            studio_id_slug: {
              studio_id: studio.id,
              slug: 'cancelada',
            },
          },
        });

        if (tagCancelada) {
          const relacionCancelada = await tx.studio_promises_tags.findFirst({
            where: {
              promise_id: validated.promise_id,
              tag_id: tagCancelada.id,
            },
          });

          if (relacionCancelada) {
            await tx.studio_promises_tags.delete({
              where: { id: relacionCancelada.id },
            });
          }
        }
      }

      // 5. Registrar pago inicial si se solicitó
      if (validated.registrar_pago && validated.pago_data) {
        await tx.studio_pagos.create({
          data: {
            studio_id: studio.id,
            contact_id: contactId,
            evento_id: eventId,
            cotizacion_id: validated.cotizacion_id,
            amount: validated.pago_data.monto,
            payment_method_id: validated.pago_data.payment_method_id,
            payment_date: normalizePaymentDate(validated.pago_data.fecha),
            status: 'completed',
            notes: validated.pago_data.concepto,
          },
        });
      }

      // 6. Generar contrato si se solicitó
      if (validated.generar_contrato && validated.contract_template_id) {
        // TODO: Implementar generación de contrato
        // Por ahora solo registramos que se solicitó
        console.log('[autorizarCotizacionLegacy] Generación de contrato solicitada:', {
          eventId,
          templateId: validated.contract_template_id,
        });
      }
    });

    // Registrar log en promise
    try {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validated.studio_slug,
        validated.promise_id,
        'quotation_authorized',
        'user',
        null,
        {
          quotationName: cotizacion.name,
          amount: validated.monto,
          cotizacionStatus: 'autorizada',
          eventId,
          isLegacy: true,
        }
      );
    } catch (error) {
      console.error('[AUTORIZACION LEGACY] Error registrando log:', error);
    }

    // Sincronizar con Google Calendar en background
    try {
      const { tieneGoogleCalendarHabilitado, sincronizarEventoPrincipalEnBackground } =
        await import('@/lib/integrations/google/clients/calendar/helpers');

      if (await tieneGoogleCalendarHabilitado(validated.studio_slug)) {
        sincronizarEventoPrincipalEnBackground(eventId, validated.studio_slug);
      }
    } catch (error) {
      console.error('[Google Calendar] Error sincronizando evento (no crítico):', error);
    }

    // Crear notificación
    try {
      const { notifyQuoteApproved } = await import('@/lib/notifications/studio');
      const contactName = cotizacion.contact?.name || 'Cliente';

      await notifyQuoteApproved(
        studio.id,
        validated.cotizacion_id,
        contactName,
        validated.monto,
        eventId,
        validated.promise_id
      );
    } catch (notificationError) {
      console.error('[AUTORIZACION LEGACY] Error creando notificación:', notificationError);
    }

    revalidatePath(`/${validated.studio_slug}/studio/commercial/promises`);
    revalidatePath(`/${validated.studio_slug}/studio/commercial/promises/${validated.promise_id}`);
    revalidatePath(`/${validated.studio_slug}/studio/business/events`);
    revalidatePath(`/${validated.studio_slug}/studio/business/events/${eventId}`);
    // Agenda ahora es un sheet, no necesita revalidación de ruta

    return {
      success: true,
      data: {
        eventId,
        cotizacionStatus: 'autorizada',
      },
    };
  } catch (error) {
    console.error('[autorizarCotizacionLegacy] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al autorizar cotización legacy',
    };
  }
}

