'use server';

import { prisma } from '@/lib/prisma';
import { validateStudio } from './helpers/studio-validator';
import { obtenerOCrearSchedulerInstance } from './scheduler-tasks.actions';
import { revalidateSchedulerPaths, revalidateEventPaths } from './helpers/revalidation-utils';

/** Categoría operativa: solo existe para este evento (no impacta studio_service_categories). */
export interface CustomCategoryOperativa {
  id: string;
  name: string;
  section_id: string;
  stage: string;
  order: number;
}

/**
 * Obtiene la instancia del scheduler validando que el evento pertenezca al estudio.
 */
async function getInstanceForEvent(studioSlug: string, eventId: string) {
  const studioResult = await validateStudio(studioSlug);
  if (!studioResult.success || !studioResult.studioId) {
    return { success: false as const, error: studioResult.error };
  }
  const instance = await prisma.studio_scheduler_event_instances.findFirst({
    where: {
      event_id: eventId,
      event: { studio_id: studioResult.studioId },
    },
    select: { id: true },
  });
  if (!instance) {
    return { success: false as const, error: 'Scheduler no encontrado para este evento' };
  }
  return { success: true as const, instanceId: instance.id };
}

/**
 * Crea una categoría operativa en studio_scheduler_custom_categories (solo para este evento).
 * No toca studio_service_categories.
 */
export async function crearCategoriaOperativa(
  studioSlug: string,
  eventId: string,
  params: { sectionId: string; stage: string; name: string }
): Promise<{ success: boolean; data?: CustomCategoryOperativa; error?: string }> {
  const instanceResult = await obtenerOCrearSchedulerInstance(studioSlug, eventId);
  if (!instanceResult.success || !instanceResult.data) {
    return { success: false, error: instanceResult.error };
  }
  const instanceId = instanceResult.data.id;

  const count = await prisma.studio_scheduler_custom_categories.count({
    where: {
      scheduler_instance_id: instanceId,
      section_id: params.sectionId,
      stage: params.stage,
    },
  });
  const order = count;

  const name = (params.name || 'Categoría Personalizada').trim();
  const created = await prisma.studio_scheduler_custom_categories.create({
    data: {
      scheduler_instance_id: instanceId,
      section_id: params.sectionId,
      stage: params.stage,
      name,
      order,
    },
    select: { id: true, name: true, section_id: true, stage: true, order: true },
  });

  await revalidateSchedulerPaths(studioSlug, eventId);
  await revalidateEventPaths(studioSlug, eventId);

  return {
    success: true,
    data: { id: created.id, name: created.name, section_id: created.section_id, stage: created.stage, order: created.order },
  };
}

/**
 * Lista categorías operativas del evento (por instancia del scheduler), ordenadas por section_id, stage, order.
 */
export async function listarCategoriasOperativas(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; data?: CustomCategoryOperativa[]; error?: string }> {
  const r = await getInstanceForEvent(studioSlug, eventId);
  if (!r.success) return { success: false, error: r.error };

  const rows = await prisma.studio_scheduler_custom_categories.findMany({
    where: { scheduler_instance_id: r.instanceId },
    orderBy: [{ section_id: 'asc' }, { stage: 'asc' }, { order: 'asc' }],
    select: { id: true, name: true, section_id: true, stage: true, order: true },
  });

  return {
    success: true,
    data: rows.map((x) => ({ id: x.id, name: x.name, section_id: x.section_id, stage: x.stage, order: x.order })),
  };
}

/**
 * Reordena categorías operativas: categoryIds es el orden deseado (ids en ese orden = 0, 1, 2...).
 */
export async function reordenarCategoriasOperativas(
  studioSlug: string,
  eventId: string,
  categoryIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const r = await getInstanceForEvent(studioSlug, eventId);
  if (!r.success) return { success: false, error: r.error };

  await prisma.$transaction(
    categoryIds.map((id, index) =>
      prisma.studio_scheduler_custom_categories.updateMany({
        where: { id, scheduler_instance_id: r.instanceId },
        data: { order: index, updated_at: new Date() },
      })
    )
  );

  await revalidateSchedulerPaths(studioSlug, eventId);
  await revalidateEventPaths(studioSlug, eventId);
  return { success: true };
}

/**
 * Actualiza el nombre de una categoría operativa.
 */
export async function actualizarNombreCategoriaOperativa(
  studioSlug: string,
  eventId: string,
  categoryId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const r = await getInstanceForEvent(studioSlug, eventId);
  if (!r.success) return { success: false, error: r.error };

  await prisma.studio_scheduler_custom_categories.updateMany({
    where: { id: categoryId, scheduler_instance_id: r.instanceId },
    data: { name: name.trim() || 'Categoría Personalizada', updated_at: new Date() },
  });

  await revalidateSchedulerPaths(studioSlug, eventId);
  await revalidateEventPaths(studioSlug, eventId);
  return { success: true };
}

/**
 * Resuelve un ID de categoría (puede ser de catálogo o operativa) para crear tarea manual.
 * Retorna qué campos usar: scheduler_custom_category_id y/o catalog_category_id.
 */
export async function resolveCategoryIdForManualTask(
  studioSlug: string,
  eventId: string,
  categoryId: string | null
): Promise<{ scheduler_custom_category_id: string | null; catalog_category_id: string | null } | null> {
  if (categoryId == null) return { scheduler_custom_category_id: null, catalog_category_id: null };
  const r = await getInstanceForEvent(studioSlug, eventId);
  if (!r.success) return null;
  const found = await prisma.studio_scheduler_custom_categories.findFirst({
    where: { id: categoryId, scheduler_instance_id: r.instanceId },
    select: { id: true },
  });
  if (found) return { scheduler_custom_category_id: categoryId, catalog_category_id: null };
  return { scheduler_custom_category_id: null, catalog_category_id: categoryId };
}

/**
 * Información para decidir si se puede eliminar una categoría operativa (cascada + escudo financiero).
 */
export async function obtenerInfoCategoriaParaEliminar(
  studioSlug: string,
  eventId: string,
  categoryId: string
): Promise<{ success: boolean; taskCount?: number; hasPaidPayroll?: boolean; error?: string }> {
  const r = await getInstanceForEvent(studioSlug, eventId);
  if (!r.success) return { success: false, error: r.error };

  const taskIds = await prisma.studio_scheduler_event_tasks.findMany({
    where: {
      scheduler_instance_id: r.instanceId,
      scheduler_custom_category_id: categoryId,
    },
    select: { id: true, cotizacion_item_id: true },
  });
  const taskCount = taskIds.length;

  const itemIds = taskIds.map((t) => t.cotizacion_item_id).filter((id): id is string => id != null);
  let hasPaidPayroll = false;
  if (itemIds.length > 0) {
    const nominaNoPendiente = await prisma.studio_nominas.findFirst({
      where: {
        evento_id: eventId,
        status: { not: 'pendiente' },
        payroll_services: {
          some: { quote_service_id: { in: itemIds } },
        },
      },
      select: { id: true },
    });
    hasPaidPayroll = nominaNoPendiente != null;
  }

  return { success: true, taskCount, hasPaidPayroll };
}

/**
 * Elimina una categoría operativa. Las tareas que la referencian quedan con scheduler_custom_category_id = null.
 */
export async function eliminarCategoriaOperativa(
  studioSlug: string,
  eventId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const r = await getInstanceForEvent(studioSlug, eventId);
  if (!r.success) return { success: false, error: r.error };

  await prisma.studio_scheduler_custom_categories.deleteMany({
    where: { id: categoryId, scheduler_instance_id: r.instanceId },
  });

  await revalidateSchedulerPaths(studioSlug, eventId);
  await revalidateEventPaths(studioSlug, eventId);
  return { success: true };
}
