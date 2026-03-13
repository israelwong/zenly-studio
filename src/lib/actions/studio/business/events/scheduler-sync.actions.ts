'use server';

import type { TaskCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COTIZACION_ITEMS_SELECT_STANDARD } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { validateStudio } from './helpers/studio-validator';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';

/**
 * Serializa el resultado a un Plain Object para que Next.js pueda pasarlo al cliente.
 * Elimina instancias de Decimal (y Date se convierten a string ISO).
 * Usar en cualquier return de Server Action que envíe datos al cliente.
 */
function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

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
 *
 * DICCIONARIO DE MAPEO (entrada → TaskCategory):
 * - Entrada esperada: string del catálogo (Prisma enum OperationalCategory o literal).
 * - 'PRODUCTION'        → 'PRODUCTION'
 * - 'PLANNING'          → 'PLANNING'  (no existe en enum OperationalCategory; puede venir de otro origen)
 * - 'POST_PRODUCTION'   → 'POST_PRODUCTION'
 * - 'DELIVERY' | 'DIGITAL_DELIVERY' | 'PHYSICAL_DELIVERY' → 'DELIVERY'
 * - Cualquier otro valor o null/undefined → null (se usa mapearCategoriaDesdeNombre → UNASSIGNED si nombre vacío)
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
 * - Update: solo order, category, duration_days, name, catalog_category_id, budget_amount. No notes, status ni progress_percent.
 * - budget_amount: costo proveedor; si billing_type === 'HOUR' se aplica multiplicador por horas de cobertura (event_duration ?? promise.duration_hours).
 * - duration_days: SSoT catálogo (items.default_duration_days / dias_ejecucion); fallback internal_delivery_days, client_delivery_days, 1.
 * - category: SSoT operational_category del catálogo (Producción/Post/Planeación); fallback mapearCategoriaDesdeNombre.
 */
export interface SincronizarTareasOptions {
  batchOffset?: number;
  batchSize?: number;
  /** Si true, tareas de anexos (is_annex) se agrupan en sección separada para fechas independientes. */
  groupAnnexInSeparateSection?: boolean;
}

export async function sincronizarTareasEvento(
  studioSlug: string,
  eventId: string,
  options?: SincronizarTareasOptions
): Promise<{ success: boolean; created?: number; updated?: number; skipped?: number; totalExpanded?: number; error?: string }> {
    const { batchOffset = 0, batchSize = 0, groupAnnexInSeparateSection = false } = options ?? {};
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
      select: { event_date: true, cotizacion_id: true, promise_id: true },
    });
    if (!event) return { success: false, error: 'Evento no encontrado' };

    // Consolidación multi-cotización: todas las cotizaciones de la promesa en autorizada/aprobada (principal + anexos)
    const promiseId = event.promise_id;
    if (!promiseId) return { success: false, error: 'Evento sin promesa vinculada' };

    const cotizacionesRows = await prisma.studio_cotizaciones.findMany({
      where: {
        promise_id: promiseId,
        status: { in: ['autorizada', 'aprobada', 'approved'] },
      },
      select: {
        id: true,
        is_annex: true,
        parent_cotizacion_id: true,
        anexo_entrega_independent: true,
        event_duration: true,
        promise: { select: { duration_hours: true } },
        cotizacion_items: {
          orderBy: [{ order: 'asc' }],
          select: {
            ...COTIZACION_ITEMS_SELECT_STANDARD,
            id: true,
            cost: true,
            quantity: true,
            profit_type: true,
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
            // Relación con catálogo (studio_items): necesaria para operational_category y default_duration_days
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

    // Item-First: consolidar ítems de todas las cotizaciones autorizadas (principal + anexos)
    const allItems = cotizacionesRows.flatMap((c) => c.cotizacion_items ?? []);
    const orderedItems = aplanarOrdenCanonico(allItems);

    // Horas de cobertura por cotización (prioridad: event_duration > promise.duration_hours) para multiplicador HOUR
    const itemToDurationHours = new Map<string, number | null>();
    const itemToIsAnnex = new Map<string, boolean>();
    const itemToAnnexIndependentDates = new Map<string, boolean>();
    const itemToAnnexSection = new Map<string, { id: string; name: string }>();
    for (const c of cotizacionesRows) {
      const hours =
        c.event_duration != null
          ? Number(c.event_duration)
          : c.promise?.duration_hours != null
            ? Number(c.promise.duration_hours)
            : null;
      const isAnnex = !!(c as { is_annex?: boolean }).is_annex;
      const annexIndependent = !!(c as { anexo_entrega_independent?: boolean }).anexo_entrega_independent;
      const annexSection = isAnnex && annexIndependent
        ? { id: `annex-${c.id}`, name: `Anexo (entrega independiente)` }
        : null;
      for (const it of c.cotizacion_items ?? []) {
        itemToDurationHours.set(it.id, hours);
        itemToIsAnnex.set(it.id, isAnnex);
        itemToAnnexIndependentDates.set(it.id, isAnnex && annexIndependent);
        if (annexSection) itemToAnnexSection.set(it.id, annexSection);
      }
    }

    /** Entrada expandida: 1 ítem → 1 o N tareas según billing_type y cantidad_efectiva (desglose 1-a-N). */
    type ExpandedEntry = {
      item: (typeof orderedItems)[number];
      instanceIndex: number;
      taskName: string;
      budgetAmount: number;
    };
    const expandedEntries: ExpandedEntry[] = [];
    for (const item of orderedItems) {
      const billingType = (item.billing_type ?? 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
      const quantity = Number(item.quantity ?? 1);
      const durationHours = itemToDurationHours.get(item.id) ?? null;
      const cantidadEfectiva = calcularCantidadEfectiva(billingType, quantity, durationHours);
      const costUnit = Number((item as { cost?: number | null }).cost ?? 0);
      const totalBudget = costUnit * cantidadEfectiva;
      const baseName = item.name ?? item.name_snapshot ?? 'Tarea';

      const splitByQuantity =
        (billingType === 'SERVICE' || billingType === 'UNIT') && cantidadEfectiva > 1;
      const N = splitByQuantity ? Math.max(1, Math.round(cantidadEfectiva)) : 1;

      for (let instanceIndex = 0; instanceIndex < N; instanceIndex++) {
        const taskName =
          N > 1 ? `${baseName} (${instanceIndex + 1}/${N})` : baseName;
        const budgetAmount = N > 1 ? totalBudget / N : totalBudget;
        expandedEntries.push({ item, instanceIndex, taskName, budgetAmount });
      }
    }

    // Deduplicar por (item.id, instanceIndex) por si hay ítems repetidos (ej. múltiples cotizaciones con mismo ítem)
    const seenKey = new Set<string>();
    const expandedEntriesDedup = expandedEntries.filter((e) => {
      const key = `${e.item.id}:${e.instanceIndex}`;
      if (seenKey.has(key)) return false;
      seenKey.add(key);
      return true;
    });

    // Huérfanas DRAFT (soft-delete operativo): tareas con cotizacion_item_id = null que "ocupan" un slot de servicio
    const orphanDrafts = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance_id: schedulerInstanceId,
        sync_status: 'DRAFT',
        cotizacion_item_id: null,
      },
      select: {
        catalog_category_id: true,
        category: true,
        catalog_section_id_snapshot: true,
      },
    });
    const serviceKey = (catId: string | null, sectionId: string | null, cat: string) =>
      `${catId ?? ''}|${sectionId ?? ''}|${cat}`;
    const orphanBudget = new Map<string, number>();
    for (const t of orphanDrafts) {
      const key = serviceKey(t.catalog_category_id, t.catalog_section_id_snapshot, t.category);
      orphanBudget.set(key, (orphanBudget.get(key) ?? 0) + 1);
    }

    console.log('[SYNC] Sincronizando scheduler con cotización', {
      eventId,
      cotizaciones: cotizacionesRows.length,
      itemsEnCotizacion: orderedItems.length,
      expandedEntries: expandedEntries.length,
      migrando: expandedEntries.slice(0, 10).map((e, idx) => ({
        orden: idx,
        nombre: e.taskName,
        instanceIndex: e.instanceIndex,
        budgetAmount: e.budgetAmount,
      })),
    });

    const eventDate = event.event_date ? new Date(event.event_date) : new Date();
    let created = 0;
    let updated = 0;
    const orderIndexStart = batchOffset;
    let orderIndex = orderIndexStart;
    const skippedByOrphan = new Set<string>();

    // Pre-sync: cargar tareas existentes por (scheduler_instance_id, cotizacion_item_id) para actualizar en lugar de insertar
    const itemIds = orderedItems.map((it) => it.id);
    const existingTasksPre =
      itemIds.length === 0
        ? []
        : await prisma.studio_scheduler_event_tasks.findMany({
            where: {
              scheduler_instance_id: schedulerInstanceId,
              cotizacion_item_id: { in: itemIds },
            },
            select: { id: true, cotizacion_item_id: true, sync_instance_index: true },
          });
    const existingTaskByKey = new Map<string, { id: string }>();
    const existingTaskByItemId = new Map<string, string>(); // primer task id por cotizacion_item_id (fallback 1 tarea por ítem)
    for (const t of existingTasksPre) {
      if (t.cotizacion_item_id != null) {
        existingTaskByKey.set(`${t.cotizacion_item_id}:${t.sync_instance_index}`, { id: t.id });
        if (!existingTaskByItemId.has(t.cotizacion_item_id)) existingTaskByItemId.set(t.cotizacion_item_id, t.id);
      }
    }

    let coberturaTaskId: string | null = null;
    if (itemIds.length > 0) {
      const cobertura = await prisma.studio_scheduler_event_tasks.findFirst({
        where: {
          scheduler_instance_id: schedulerInstanceId,
          name: { contains: 'Cobertura', mode: 'insensitive' },
        },
        select: { id: true },
      });
      coberturaTaskId = cobertura?.id ?? null;
    }

    // Cuando la BD solo permite una tarea por cotizacion_item_id, no crear instancias adicionales (instanceIndex > 0)
    const itemsWithOneTaskOnly = new Set<string>();

    const entriesToProcess =
      batchSize > 0
        ? expandedEntriesDedup.slice(batchOffset, batchOffset + batchSize)
        : expandedEntriesDedup;
    const isLastBatch = batchSize === 0 || batchOffset + batchSize >= expandedEntriesDedup.length;

    await prisma.$transaction(async (tx) => {
      for (const { item, instanceIndex, taskName, budgetAmount } of entriesToProcess) {
        if (itemsWithOneTaskOnly.has(item.id) && instanceIndex > 0) continue;

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
        // Etapa (Producción/Post/Planeación): operational_category del catálogo es SSoT; fallback por nombre
        const category =
          mapearOperationalCategoryATaskCategory(item.items?.operational_category) ??
          mapearCategoriaDesdeNombre(categoryName);
        // Días de ejecución: catálogo (dias_ejecucion/default_duration_days) es SSoT; luego snapshot en cotización
        const durationDaysRaw =
          item.items?.default_duration_days ??
          item.internal_delivery_days ??
          item.client_delivery_days ??
          1;
        const durationDays = Math.max(1, Number(durationDaysRaw));

        const billingType = (item.billing_type ?? 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
        const profitTypeRaw = (item as { profit_type?: string | null }).profit_type ?? (item as { profit_type_snapshot?: string | null }).profit_type_snapshot ?? null;
        const profitTypeSnapshot = profitTypeRaw != null ? String(profitTypeRaw).toLowerCase() : null;
        const durationHours = itemToDurationHours.get(item.id) ?? null;
        const durationHoursSnapshot = durationHours != null ? durationHours : undefined;

        // Snapshots: anexo con fechas independientes → nueva sección; aditivo → categoría del catálogo
        const annexSection = itemToAnnexSection.get(item.id);
        const sectionRef = item.service_categories?.section_categories ?? item.items?.service_categories?.section_categories;
        const snapshotSectionId = annexSection?.id ?? sectionRef?.service_sections?.id ?? null;
        const snapshotSectionName = annexSection?.name ?? sectionRef?.service_sections?.name ?? 'Sin sección';
        const snapshotCategoryName = categoryName ?? 'Sin categoría';

        // Exclusión: ítem cuyo “servicio” ya está ocupado por una tarea huérfana DRAFT (soft-delete operativo)
        if (!skippedByOrphan.has(item.id)) {
          const itemServiceKey = serviceKey(catalogCategoryId, snapshotSectionId, category);
          const budget = orphanBudget.get(itemServiceKey) ?? 0;
          if (budget > 0) {
            orphanBudget.set(itemServiceKey, budget - 1);
            skippedByOrphan.add(item.id);
            continue;
          }
        } else {
          continue;
        }

        const itemNameForMatch = (item.name ?? item.name_snapshot ?? '').toLowerCase();
        const isHoraExtra = itemNameForMatch.includes('hora extra');
        if (isHoraExtra && coberturaTaskId) {
          const durationDaysCobertura = Math.max(1, Number(item.items?.default_duration_days ?? item.internal_delivery_days ?? 1));
          const endDateCobertura = new Date(eventDate);
          endDateCobertura.setDate(endDateCobertura.getDate() + Math.max(0, durationDaysCobertura - 1));
          await tx.studio_scheduler_event_tasks.update({
            where: { id: coberturaTaskId },
            data: {
              duration_days: durationDaysCobertura,
              end_date: endDateCobertura,
              ...(budgetAmount > 0 ? { budget_amount: budgetAmount } : {}),
            },
          });
          updated++;
          continue;
        }

        const order = orderIndex++;
        const endDate = new Date(eventDate);
        endDate.setDate(endDate.getDate() + Math.max(0, durationDays - 1));

        const existingTaskId = existingTaskByKey.get(`${item.id}:${instanceIndex}`)?.id ?? null;
        let hadTask = Boolean(existingTaskId);

        const createData = {
            scheduler_instance_id: schedulerInstanceId,
            cotizacion_item_id: item.id,
            name: taskName,
            start_date: eventDate,
            end_date: endDate,
            duration_days: durationDays,
            category,
            priority: 'MEDIUM' as const,
            status: 'PENDING' as const,
            progress_percent: 0,
            sync_status: 'DRAFT' as const,
            order,
            ...(catalogCategoryId != null ? { catalog_category_id: catalogCategoryId } : {}),
            catalog_category_name_snapshot: snapshotCategoryName,
            catalog_section_id_snapshot: snapshotSectionId,
            catalog_section_name_snapshot: snapshotSectionName,
            billing_type_snapshot: billingType,
            duration_hours_snapshot: durationHoursSnapshot,
            profit_type_snapshot: profitTypeSnapshot,
            budget_amount: budgetAmount,
          };
        const updateData = {
            order,
            category,
            duration_days: durationDays,
            name: taskName,
            ...(catalogCategoryId != null ? { catalog_category_id: catalogCategoryId } : {}),
            catalog_category_name_snapshot: snapshotCategoryName,
            catalog_section_id_snapshot: snapshotSectionId,
            catalog_section_name_snapshot: snapshotSectionName,
            billing_type_snapshot: billingType,
            duration_hours_snapshot: durationHoursSnapshot,
            profit_type_snapshot: profitTypeSnapshot,
            budget_amount: budgetAmount,
          };

        // Cero queries en el bucle: solo mapas pre-cargados. Sin upsert para no violar unique cotizacion_item_id.
        let task: { id: string };
        if (existingTaskId) {
          task = await tx.studio_scheduler_event_tasks.update({
            where: { id: existingTaskId },
            data: updateData,
          });
        } else {
          const existingIdByItem = existingTaskByItemId.get(item.id);
          if (existingIdByItem) {
            task = await tx.studio_scheduler_event_tasks.update({
              where: { id: existingIdByItem },
              data: updateData,
            });
            hadTask = true;
            itemsWithOneTaskOnly.add(item.id);
          } else {
            task = await tx.studio_scheduler_event_tasks.create({
              data: createData,
            });
            // BD con unique solo en cotizacion_item_id: evitar crear más tareas para este ítem en el mismo lote
            itemsWithOneTaskOnly.add(item.id);
            existingTaskByItemId.set(item.id, task.id);
          }
        }

        if (instanceIndex === 0 && !hadTask) {
          await tx.studio_cotizacion_items.update({
            where: { id: item.id },
            data: { scheduler_task_id: task.id },
          });
        }
        if (!hadTask) created++;
        else updated++;
      }

      // Limpieza de huérfanos solo en el último lote para no tocar tareas que aún no se han procesado
      if (isLastBatch) {
        const validItemIds = new Set(orderedItems.map((it) => it.id));
        const orphanWhere = {
          scheduler_instance_id: schedulerInstanceId,
          catalog_category_id: { not: null },
          NOT: { sync_status: 'DRAFT', cotizacion_item_id: null },
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
      }
    }, { timeout: 20000 });

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

    // Stay on Event: revalidar sin redirect. Nancy permanece en el evento actual.
    if (created > 0 || updated > 0) {
      const { revalidateSchedulerPaths } = await import('./helpers/revalidation-utils');
      await revalidateSchedulerPaths(studioSlug, eventId);
    }

    const totalExpanded = expandedEntriesDedup.length;
    console.log('[SYNC] Sincronización completada', { eventId, created, updated, totalItems: orderedItems.length, totalTasks: totalExpanded, batchOffset, batchSize: batchSize || totalExpanded });

    return toPlainObject({ success: true, created, updated, skipped: 0, totalExpanded });
  } catch (error) {
    console.error('[sincronizarTareasEvento] Error:', error);
    return toPlainObject({
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar tareas',
    });
  }
}
