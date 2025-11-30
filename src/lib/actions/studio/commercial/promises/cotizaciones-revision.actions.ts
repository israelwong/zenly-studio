'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  crearRevisionCotizacionSchema,
  autorizarRevisionCotizacionSchema,
  type CrearRevisionCotizacionData,
  type AutorizarRevisionCotizacionData,
  type CotizacionResponse,
} from '@/lib/actions/schemas/cotizaciones-schemas';
import { guardarEstructuraCotizacionAutorizada } from './cotizacion-pricing';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';

/**
 * Crear revisión de cotización autorizada
 * Crea una nueva cotización basada en una autorizada, permitiendo modificaciones
 */
export async function crearRevisionCotizacion(
  data: CrearRevisionCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = crearRevisionCotizacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotización original
    const cotizacionOriginal = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_original_id,
        studio_id: studio.id,
      },
      include: {
        promise: {
          select: {
            id: true,
            event_type_id: true,
            contact_id: true,
          },
        },
        cotizacion_items: {
          select: {
            item_id: true,
            quantity: true,
          },
        },
      },
    });

    if (!cotizacionOriginal) {
      return { success: false, error: 'Cotización original no encontrada' };
    }

    // Validar que la cotización original esté autorizada/aprobada
    if (cotizacionOriginal.status !== 'aprobada' && cotizacionOriginal.status !== 'autorizada') {
      return {
        success: false,
        error: 'Solo se pueden crear revisiones de cotizaciones autorizadas o aprobadas',
      };
    }

    // Calcular número de revisión
    const revisionesExistentes = await prisma.studio_cotizaciones.count({
      where: {
        revision_of_id: validatedData.cotizacion_original_id,
      },
    });

    const revisionNumber = revisionesExistentes + 1;

    // Transacción para crear revisión
    const nuevaRevision = await prisma.$transaction(async (tx) => {
      // 1. Crear nueva cotización como revisión
      const revision = await tx.studio_cotizaciones.create({
        data: {
          studio_id: studio.id,
          promise_id: cotizacionOriginal.promise_id,
          contact_id: cotizacionOriginal.contact_id || cotizacionOriginal.promise?.contact_id || null,
          event_type_id: cotizacionOriginal.event_type_id,
          name: validatedData.nombre,
          description: validatedData.descripcion || null,
          price: validatedData.precio,
          status: 'pendiente',
          revision_of_id: validatedData.cotizacion_original_id,
          revision_number: revisionNumber,
          revision_status: 'pending_revision',
        },
      });

      // 2. Crear items de la revisión desde catálogo (no snapshots)
      const itemsToCreate = Object.entries(validatedData.items)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity], index) => ({
          cotizacion_id: revision.id,
          item_id: itemId,
          quantity,
          position: index,
        }));

      if (itemsToCreate.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: itemsToCreate,
        });
      }

      // 3. Marcar original como "pending_revision" si no tiene otras revisiones activas
      const tieneRevisionesActivas = await tx.studio_cotizaciones.count({
        where: {
          revision_of_id: validatedData.cotizacion_original_id,
          revision_status: { in: ['pending_revision', 'active'] },
        },
      });

      if (tieneRevisionesActivas === 0) {
        await tx.studio_cotizaciones.update({
          where: { id: validatedData.cotizacion_original_id },
          data: { revision_status: 'pending_revision' },
        });
      }

      return revision;
    });

    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${cotizacionOriginal.promise_id}`);
    if (cotizacionOriginal.evento_id) {
      revalidatePath(`/${validatedData.studio_slug}/studio/business/events/${cotizacionOriginal.evento_id}`);
    }

    return {
      success: true,
      data: {
        id: nuevaRevision.id,
        name: nuevaRevision.name,
        evento_id: cotizacionOriginal.evento_id || undefined,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error creando revisión:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear revisión de cotización',
    };
  }
}

/**
 * Autorizar revisión de cotización con migración de dependencias
 * Migra scheduler tasks y crew assignments de la cotización original a la revisión
 */
export async function autorizarRevisionCotizacion(
  data: AutorizarRevisionCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = autorizarRevisionCotizacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener revisión y original
    const revision = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.revision_id,
        studio_id: studio.id,
      },
      include: {
        cotizacion_items: {
          select: {
            id: true,
            item_id: true,
            quantity: true,
          },
        },
        revision_of: {
          include: {
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                scheduler_task_id: true,
                assigned_to_crew_member_id: true,
              },
            },
          },
        },
      },
    });

    if (!revision || !revision.revision_of) {
      return { success: false, error: 'Revisión o cotización original no encontrada' };
    }

    const original = revision.revision_of;

    // Validar que la revisión esté pendiente
    if (revision.status !== 'pendiente') {
      return { success: false, error: 'La revisión ya fue procesada' };
    }

    // Obtener evento asociado a la original
    const eventoOriginal = await prisma.studio_events.findFirst({
      where: {
        cotizacion_id: original.id,
        studio_id: studio.id,
      },
      select: {
        id: true,
        event_date: true,
      },
    });

    if (!eventoOriginal) {
      return { success: false, error: 'No se encontró evento asociado a la cotización original' };
    }

    // Obtener configuración de precios
    const configResult = await obtenerConfiguracionPrecios(validatedData.studio_slug);
    const configPrecios = {
      utilidad_servicio: Number(configResult?.utilidad_servicio) || 0,
      utilidad_producto: Number(configResult?.utilidad_producto) || 0,
      comision_venta: Number(configResult?.comision_venta) || 0,
      sobreprecio: Number(configResult?.sobreprecio) || 0,
    };

    // Calcular descuento
    const descuento = revision.price > validatedData.monto ? revision.price - validatedData.monto : 0;

    // Transacción para autorizar revisión y migrar dependencias
    await prisma.$transaction(async (tx) => {
      // 1. Guardar snapshots de la revisión
      await guardarEstructuraCotizacionAutorizada(
        tx,
        validatedData.revision_id,
        configPrecios,
        validatedData.studio_slug
      );

      // 2. Actualizar revisión a "aprobada"
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.revision_id },
        data: {
          status: 'aprobada' as const,
          condiciones_comerciales_id: validatedData.condiciones_comerciales_id,
          evento_id: eventoOriginal.id,
          updated_at: new Date(),
          payment_promise_date: new Date(),
          payment_registered: false,
          discount: descuento > 0 ? descuento : null,
          revision_status: 'active',
        },
      });

      // 3. Archivar y marcar original como "replaced"
      await tx.studio_cotizaciones.update({
        where: { id: original.id },
        data: {
          archived: true,
          revision_status: 'replaced',
        },
      });

      // 4. Migrar dependencias si se solicita
      if (validatedData.migrar_dependencias) {
        // Crear mapa de item_id original → item_id revisión
        const itemsOriginalMap = new Map(
          original.cotizacion_items.map((item) => [item.item_id || '', item.id])
        );
        const itemsRevisionMap = new Map(
          revision.cotizacion_items.map((item) => [item.item_id || '', item.id])
        );

        // Migrar scheduler tasks
        for (const itemOriginal of original.cotizacion_items) {
          if (!itemOriginal.item_id || !itemOriginal.scheduler_task_id) continue;

          const itemRevisionId = itemsRevisionMap.get(itemOriginal.item_id);
          if (!itemRevisionId) continue; // Item no existe en revisión

          // Actualizar scheduler task para apuntar al nuevo item
          await tx.studio_scheduler_event_tasks.update({
            where: { cotizacion_item_id: itemOriginal.id },
            data: {
              cotizacion_item_id: itemRevisionId,
            },
          });

          // Actualizar referencia en cotizacion_item
          await tx.studio_cotizacion_items.update({
            where: { id: itemRevisionId },
            data: {
              scheduler_task_id: itemOriginal.scheduler_task_id,
            },
          });
        }

        // Migrar crew assignments
        for (const itemOriginal of original.cotizacion_items) {
          if (!itemOriginal.item_id || !itemOriginal.assigned_to_crew_member_id) continue;

          const itemRevisionId = itemsRevisionMap.get(itemOriginal.item_id);
          if (!itemRevisionId) continue;

          await tx.studio_cotizacion_items.update({
            where: { id: itemRevisionId },
            data: {
              assigned_to_crew_member_id: itemOriginal.assigned_to_crew_member_id,
            },
          });
        }
      }

      // 5. Actualizar evento para usar la revisión como cotización activa
      await tx.studio_events.update({
        where: { id: eventoOriginal.id },
        data: {
          cotizacion_id: validatedData.revision_id,
        },
      });
    });

    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${validatedData.promise_id}`);
    revalidatePath(`/${validatedData.studio_slug}/studio/business/events/${eventoOriginal.id}`);

    return {
      success: true,
      data: {
        id: revision.id,
        name: revision.name,
        evento_id: eventoOriginal.id,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error autorizando revisión:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al autorizar revisión de cotización',
    };
  }
}
