'use server';

import type { TaskCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COTIZACION_ITEMS_SELECT_STANDARD } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { validateStudio } from './helpers/studio-validator';

/** Tipo mínimo para ordenar ítems por jerarquía catálogo (Sección → Categoría → Ítem). */
type ItemConJerarquia = {
  id: string;
  order?: number | null;
  service_categories?: {
    order?: number | null;
    section_categories?: { order?: number | null; service_sections?: { order?: number | null } } | null;
  } | null;
  items?: {
    order?: number | null;
    service_categories?: {
      order?: number | null;
      section_categories?: { order?: number | null; service_sections?: { order?: number | null } } | null;
    } | null;
  } | null;
};

/**
 * Ordena ítems por jerarquía canónica: Sección → Categoría → Ítem (catálogo).
 * Ítems sin categoría (custom) van al final. El índice en el array resultante es el order secuencial (0, 1, 2...).
 */
function aplanarOrdenCanonico<T extends ItemConJerarquia>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const secA = a.service_categories?.section_categories?.service_sections?.order ?? a.items?.service_categories?.section_categories?.service_sections?.order ?? 999;
    const secB = b.service_categories?.section_categories?.service_sections?.order ?? b.items?.service_categories?.section_categories?.service_sections?.order ?? 999;
    if (secA !== secB) return secA - secB;

    const catA = a.service_categories?.section_categories?.order ?? a.items?.service_categories?.section_categories?.order ?? 999;
    const catB = b.service_categories?.section_categories?.order ?? b.items?.service_categories?.section_categories?.order ?? 999;
    if (catA !== catB) return catA - catB;

    const itemOrderA = a.items?.order ?? a.order ?? 0;
    const itemOrderB = b.items?.order ?? b.order ?? 0;
    return itemOrderA - itemOrderB;
  });
}

/**
 * Interfaces para eventos con schedulers
 */
export interface EventoSchedulerItem {
  id: string;
  name: string;
  eventDate: Date;
  contactName: string;
  status: string;
  totalItems: number; // Total de items de todas las cotizaciones del evento
  schedulers: Array<{
    cotizacionId: string;
    cotizacionName: string;
    startDate: Date;
    endDate: Date;
    tasks: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      progress: number;
      category: string;
      assignedToUserId: string | null;
    }>;
  }>;
}

export interface EventosSchedulerResponse {
  success: boolean;
  data?: EventoSchedulerItem[];
  error?: string;
}

/**
 * Obtener eventos activos con schedulers para la vista de cronogramas
 */
export async function obtenerEventosConSchedulers(
  studioSlug: string
): Promise<EventosSchedulerResponse> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error };
    }

    const eventos = await prisma.studio_events.findMany({
      where: {
        studio_id: studioResult.studioId,
        status: 'ACTIVE',
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
          },
        },
        promise: {
          select: {
            id: true,
            name: true,
            event_date: true,
            quotes: {
              where: {
                status: {
                  in: ['aprobada', 'autorizada', 'approved', 'seleccionada'],
                },
              },
              select: {
                id: true,
                name: true,
                cotizacion_items: {
                  select: {
                    id: true,
                    scheduler_task: {
                      select: {
                        id: true,
                        name: true,
                        start_date: true,
                        end_date: true,
                        status: true,
                        progress_percent: true,
                        category: true,
                        assigned_to_user_id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        event_date: 'desc',
      },
    });

    const eventosMapeados: EventoSchedulerItem[] = eventos.map((evento) => {
      // Mapear status de TaskStatus a string compatible con el componente
      const mapTaskStatus = (status: string): string => {
        switch (status) {
          case 'COMPLETED':
            return 'COMPLETED';
          case 'IN_PROGRESS':
            return 'IN_PROGRESS';
          case 'PENDING':
            return 'PENDING';
          case 'BLOCKED':
            return 'DELAYED';
          default:
            return 'PENDING';
        }
      };

      // Mapear category de TaskCategory a string compatible
      const mapTaskCategory = (category: string): string => {
        // Si el componente espera PRE_PRODUCTION pero la DB no lo tiene,
        // podemos mapear PRODUCTION o crear una lógica
        switch (category) {
          case 'PLANNING':
            return 'PLANNING';
          case 'PRODUCTION':
            return 'PRODUCTION';
          case 'POST_PRODUCTION':
            return 'POST_PRODUCTION';
          case 'REVIEW':
          case 'DELIVERY':
          case 'WARRANTY':
            return 'POST_PRODUCTION'; // Agrupar estos en post-producción
          default:
            return 'PLANNING';
        }
      };

      // Obtener todas las cotizaciones autorizadas
      const cotizacionesAutorizadas = evento.promise?.quotes || [];

      // Calcular total de items de todas las cotizaciones
      const totalItems = cotizacionesAutorizadas.reduce(
        (sum, cot) => sum + (cot.cotizacion_items?.length || 0),
        0
      );

      // Mapear schedulers por cotización
      const schedulersPorCotizacion = cotizacionesAutorizadas.map((cot) => {
        // Obtener todas las tareas de esta cotización
        const tasks = (cot.cotizacion_items || [])
          .filter((item) => item.scheduler_task != null)
          .map((item) => {
            const task = item.scheduler_task!;
            return {
              id: task.id,
              name: task.name,
              startDate: task.start_date,
              endDate: task.end_date,
              status: mapTaskStatus(task.status),
              progress: task.progress_percent,
              category: mapTaskCategory(task.category),
              assignedToUserId: task.assigned_to_user_id,
            };
          });

        // Calcular fechas del scheduler basándose en las tareas
        let startDate = evento.event_date;
        let endDate = evento.event_date;

        if (tasks.length > 0) {
          const taskDates = tasks.map((t) => t.startDate.getTime());
          const taskEndDates = tasks.map((t) => t.endDate.getTime());
          startDate = new Date(Math.min(...taskDates));
          endDate = new Date(Math.max(...taskEndDates));
        }

        return {
          cotizacionId: cot.id,
          cotizacionName: cot.name,
          startDate,
          endDate,
          tasks,
        };
      });

      return {
        id: evento.id,
        name: evento.promise?.name || evento.contact?.name || 'Evento sin nombre',
        eventDate: evento.event_date,
        contactName: evento.contact?.name || 'Sin contacto',
        status: evento.status,
        totalItems,
        schedulers: schedulersPorCotizacion,
      };
    });

    return {
      success: true,
      data: eventosMapeados,
    };
  } catch (error) {
    console.error('[SCHEDULER] Error obteniendo eventos con schedulers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener eventos',
    };
  }
}

/** Normaliza nombre de categoría: trim, lowercase, sin tildes (para reglas de etapa). */
function normalizarNombreCategoria(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Mapeo por categoría operativa (v5.0): item.items.operational_category es la fuente de verdad primaria.
 * Única clasificación: PLANNING, PRODUCTION, POST_PRODUCTION, DELIVERY (operativa del Scheduler).
 * Devuelve null si debe usarse el fallback (mapearCategoriaDesdeNombre).
 */
function mapearOperationalCategoryATaskCategory(
  operationalCategory: string | null | undefined
): TaskCategory | null {
  if (operationalCategory == null || operationalCategory === '') return null;
  const v = operationalCategory.toUpperCase();
  if (v === 'PRODUCTION') return 'PRODUCTION';
  if (v === 'PLANNING') return 'PLANNING';
  if (v === 'POST_PRODUCTION') return 'POST_PRODUCTION';
  if (v === 'DELIVERY' || v === 'DIGITAL_DELIVERY' || v === 'PHYSICAL_DELIVERY') return 'DELIVERY';
  return null;
}

/**
 * Fallback: mapea nombre de categoría a TaskCategory cuando operational_category es nulo o el ítem no tiene catálogo.
 * Normalización: trim, lowercase, sin tildes.
 */
function mapearCategoriaDesdeNombre(categoryName: string | null | undefined): TaskCategory {
  const n = normalizarNombreCategoria(categoryName);
  if (!n) return 'UNASSIGNED';
  if (n.includes('produccion') || n.includes('shooting') || n.includes('evento') || n.includes('sesion')) return 'PRODUCTION';
  if (n.includes('entrega')) return 'DELIVERY';
  if (n.includes('revelado') || n.includes('edicion')) return 'POST_PRODUCTION';
  if (n.includes('planeacion') || n.includes('planeación') || n.includes('preparativos') || n.includes('cita')) return 'PLANNING';
  return 'UNASSIGNED';
}

/**
 * Obtiene o crea la instancia del scheduler para un evento (evita recursión con events.actions).
 */
async function obtenerOCrearInstancia(
  eventId: string,
  studioId: string
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  let instance = await prisma.studio_scheduler_event_instances.findFirst({
    where: { event_id: eventId },
    select: { id: true },
  });
  if (instance) return { success: true, instanceId: instance.id };

  const event = await prisma.studio_events.findFirst({
    where: { id: eventId, studio_id: studioId },
    select: { event_date: true },
  });
  if (!event) return { success: false, error: 'Evento no encontrado' };

  const startDate = event.event_date ? new Date(event.event_date) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const created = await prisma.studio_scheduler_event_instances.create({
    data: {
      event_id: eventId,
      event_date: event.event_date,
      start_date: startDate,
      end_date: endDate,
    },
    select: { id: true },
  });
  return { success: true, instanceId: created.id };
}

/**
 * Sincronización secuencial canónica (v5.0): order lineal 0,1,2...; category desde operational_category (catálogo).
 * Función única de sincronización scheduler ↔ cotización. Sin distinción primera vez / re-sync.
 *
 * - Etapa (category): solo operational_category del catálogo o fallback mapearCategoriaDesdeNombre. Estados: PLANNING, PRODUCTION, POST_PRODUCTION, DELIVERY.
 * - Orden: array aplanado Sección → Categoría → Ítem; order = índice de iteración.
 * - Upsert solo por cotizacion_item_id: las tareas manuales (sin cotizacion_item_id) no se tocan; coexisten con las importadas sin ser eliminadas ni remapeadas.
 * - Limpieza de huérfanos: se eliminan tareas con catalog_category_id que no están vinculadas a un cotizacion_item_id real de este evento (residuos de plantilla o ítems sacados de la cotización).
 * - No se modifican studio_scheduler_custom_categories ni las tareas que referencian scheduler_custom_category_id (sincronización no destructiva).
 * - Update: solo order, category, duration_days, name, catalog_category_id. No notes, status ni progress_percent.
 */
export async function sincronizarTareasEvento(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; created?: number; updated?: number; skipped?: number; error?: string }> {
  try {
    const studioResult = await validateStudio(studioSlug);
    if (!studioResult.success || !studioResult.studioId) {
      return { success: false, error: studioResult.error ?? 'Studio no encontrado' };
    }
    const studioId = studioResult.studioId;

    const instanceResult = await obtenerOCrearInstancia(eventId, studioId);
    if (!instanceResult.success || !instanceResult.instanceId) {
      return { success: false, error: instanceResult.error ?? 'No se pudo obtener instancia del scheduler' };
    }
    const schedulerInstanceId = instanceResult.instanceId;

    const event = await prisma.studio_events.findFirst({
      where: { id: eventId, studio_id: studioId },
      select: { event_date: true, cotizacion_id: true },
    });
    if (!event) return { success: false, error: 'Evento no encontrado' };

    const orClause: Array<{ evento_id: string } | { id: string }> = [{ evento_id: eventId }];
    if (event.cotizacion_id) orClause.push({ id: event.cotizacion_id });

    const cotizacionesRows = await prisma.studio_cotizaciones.findMany({
      where: {
        OR: orClause,
        status: { in: ['autorizada', 'aprobada', 'approved'] },
      },
      select: {
        id: true,
        cotizacion_items: {
          orderBy: [{ order: 'asc' }],
          select: {
            ...COTIZACION_ITEMS_SELECT_STANDARD,
            id: true,
            scheduler_task_id: true,
            service_category_id: true,
            internal_delivery_days: true,
            client_delivery_days: true,
            scheduler_task: {
              select: {
                id: true,
                catalog_category_id: true,
                order: true,
                category: true,
                duration_days: true,
                name: true,
              },
            },
            service_categories: {
              select: {
                name: true,
                order: true,
                section_categories: {
                  select: {
                    order: true,
                    service_sections: { select: { id: true, name: true, order: true } },
                  },
                },
              },
            },
            items: {
              select: {
                name: true,
                order: true,
                service_category_id: true,
                default_duration_days: true,
                operational_category: true,
                service_categories: {
                  select: {
                    name: true,
                    order: true,
                    section_categories: {
                      select: {
                        order: true,
                        service_sections: { select: { id: true, name: true, order: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Item-First: solo ítems de cotizaciones autorizadas
    const allItems = cotizacionesRows.flatMap((c) => c.cotizacion_items ?? []);
    const orderedItems = aplanarOrdenCanonico(allItems);

    console.log('[SYNC] Sincronizando scheduler con cotización', {
      eventId,
      cotizaciones: cotizacionesRows.length,
      itemsEnCotizacion: orderedItems.length,
      migrando: orderedItems.slice(0, 10).map((it, idx) => ({
        orden: idx,
        nombre: it.name ?? it.name_snapshot ?? '?',
        seccion: (it.service_categories?.section_categories ?? it.items?.service_categories?.section_categories)?.service_sections?.name ?? '?',
        categoria: it.category_name_snapshot ?? it.category_name ?? it.service_categories?.name ?? '?',
      })),
    });

    const eventDate = event.event_date ? new Date(event.event_date) : new Date();
    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedItems.length; i++) {
        const item = orderedItems[i]!;
        const order = i;

        const catalogCategoryId =
          item.scheduler_task?.catalog_category_id ??
          item.service_category_id ??
          item.items?.service_category_id ??
          null;
        const categoryName =
          item.category_name_snapshot ??
          item.category_name ??
          item.service_categories?.name ??
          item.items?.service_categories?.name ??
          null;
        const category =
          mapearOperationalCategoryATaskCategory(item.items?.operational_category) ??
          mapearCategoriaDesdeNombre(categoryName);
        const durationDays =
          item.internal_delivery_days ??
          item.client_delivery_days ??
          item.items?.default_duration_days ??
          1;
        const name = item.name ?? item.name_snapshot ?? 'Tarea';

        // Snapshots solo desde el ítem procesado (no catálogo global)
        const sectionRef = item.service_categories?.section_categories ?? item.items?.service_categories?.section_categories;
        const snapshotSectionId = sectionRef?.service_sections?.id ?? null;
        const snapshotSectionName = sectionRef?.service_sections?.name ?? 'Sin sección';
        const snapshotCategoryName = categoryName ?? 'Sin categoría';

        const endDate = new Date(eventDate);
        endDate.setDate(endDate.getDate() + Math.max(1, durationDays));

        const hadTask = Boolean(item.scheduler_task_id ?? item.scheduler_task?.id);

        const task = await tx.studio_scheduler_event_tasks.upsert({
          where: { cotizacion_item_id: item.id },
          create: {
            scheduler_instance_id: schedulerInstanceId,
            cotizacion_item_id: item.id,
            name,
            start_date: eventDate,
            end_date: endDate,
            duration_days: durationDays,
            category,
            priority: 'MEDIUM',
            status: 'PENDING',
            progress_percent: 0,
            sync_status: 'DRAFT',
            order,
            ...(catalogCategoryId != null ? { catalog_category_id: catalogCategoryId } : {}),
            catalog_category_name_snapshot: snapshotCategoryName,
            catalog_section_id_snapshot: snapshotSectionId,
            catalog_section_name_snapshot: snapshotSectionName,
          },
          update: {
            order,
            category,
            duration_days: durationDays,
            name,
            ...(catalogCategoryId != null ? { catalog_category_id: catalogCategoryId } : {}),
            catalog_category_name_snapshot: snapshotCategoryName,
            catalog_section_id_snapshot: snapshotSectionId,
            catalog_section_name_snapshot: snapshotSectionName,
          },
        });

        if (!hadTask) {
          await tx.studio_cotizacion_items.update({
            where: { id: item.id },
            data: { scheduler_task_id: task.id },
          });
          created++;
        } else {
          updated++;
        }
      }

      // Limpieza de huérfanos: tareas con catalog_category_id no vinculadas a un ítem real de la cotización autorizada
      const validItemIds = new Set(orderedItems.map((it) => it.id));
      const orphanWhere = {
        scheduler_instance_id: schedulerInstanceId,
        catalog_category_id: { not: null },
        OR: validItemIds.size > 0
          ? [
              { cotizacion_item_id: null },
              { cotizacion_item_id: { notIn: [...validItemIds] } },
            ]
          : [{ cotizacion_item_id: null }],
      } as const;
      const orphans = await tx.studio_scheduler_event_tasks.findMany({
        where: orphanWhere,
        select: { id: true },
      });
      const orphanIds = orphans.map((o) => o.id);
      if (orphanIds.length > 0) {
        await tx.studio_scheduler_event_tasks.updateMany({
          where: { scheduler_instance_id: schedulerInstanceId, depends_on_task_id: { in: orphanIds } },
          data: { depends_on_task_id: null },
        });
        await tx.studio_cotizacion_items.updateMany({
          where: { scheduler_task_id: { in: orphanIds } },
          data: { scheduler_task_id: null },
        });
        await tx.studio_scheduler_event_tasks.deleteMany({
          where: { id: { in: orphanIds } },
        });
      }
    });

    // Inicialización automática: activar estados que tienen tareas
    if (created > 0) {
      const tasksWithStages = await prisma.studio_scheduler_event_tasks.findMany({
        where: { scheduler_instance_id: schedulerInstanceId, catalog_section_id_snapshot: { not: null } },
        select: { catalog_section_id_snapshot: true, category: true },
      });
      
      const validStages = new Set(['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY']);
      const stageKeys = new Set<string>();
      
      for (const task of tasksWithStages) {
        if (task.catalog_section_id_snapshot && task.category && validStages.has(task.category)) {
          const stageKey = `${task.catalog_section_id_snapshot}-${task.category}`;
          stageKeys.add(stageKey);
        }
      }
      
      if (stageKeys.size > 0) {
        await prisma.studio_scheduler_event_instances.update({
          where: { id: schedulerInstanceId },
          data: { explicitly_activated_stage_ids: Array.from(stageKeys) },
        });
      }
    }

    if (created > 0 || updated > 0) {
      const { revalidateSchedulerPaths } = await import('./helpers/revalidation-utils');
      await revalidateSchedulerPaths(studioSlug, eventId);
    }

    console.log('[SYNC] Sincronización completada', { eventId, created, updated, totalItems: orderedItems.length });

    return { success: true, created, updated, skipped: 0 };
  } catch (error) {
    console.error('[sincronizarTareasEvento] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar tareas',
    };
  }
}
