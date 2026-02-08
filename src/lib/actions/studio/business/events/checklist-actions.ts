'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { SchedulerChecklistItem, SchedulerChecklistTemplateItem } from '@/types/scheduler-checklist';
import type { TaskCategory } from '@prisma/client';

export interface ChecklistTemplateRow {
  id: string;
  task_category: TaskCategory;
  name: string | null;
  items: unknown;
  is_default: boolean;
}

export interface GetChecklistTemplatesResult {
  success: boolean;
  data?: ChecklistTemplateRow[];
  error?: string;
}

export interface ImportChecklistToTaskResult {
  success: boolean;
  data?: { addedCount: number };
  error?: string;
}

/**
 * Lista plantillas de checklist del estudio. Opcionalmente filtradas por categoría de tarea.
 * Un estudio puede tener N plantillas para la misma TaskCategory (stacking).
 */
export async function getChecklistTemplates(
  studioSlug: string,
  taskCategory?: TaskCategory
): Promise<GetChecklistTemplatesResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const templates = await prisma.studio_scheduler_checklist_templates.findMany({
      where: {
        studio_id: studio.id,
        ...(taskCategory && { task_category: taskCategory }),
      },
      select: {
        id: true,
        task_category: true,
        name: true,
        items: true,
        is_default: true,
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: templates as ChecklistTemplateRow[],
    };
  } catch (e) {
    console.error('[checklist] getChecklistTemplates:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al obtener plantillas',
    };
  }
}

function parseTemplateItems(items: unknown): SchedulerChecklistTemplateItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (x): x is SchedulerChecklistTemplateItem =>
      x != null && typeof x === 'object' && typeof (x as SchedulerChecklistTemplateItem).label === 'string'
  );
}

function parseTaskChecklistItems(items: unknown): SchedulerChecklistItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (x): x is SchedulerChecklistItem =>
      x != null &&
      typeof x === 'object' &&
      typeof (x as SchedulerChecklistItem).id === 'string' &&
      typeof (x as SchedulerChecklistItem).label === 'string' &&
      typeof (x as SchedulerChecklistItem).done === 'boolean'
  );
}

/**
 * Importa ítems de una o varias plantillas a la tarea (append, sin borrar lo existente).
 * Permite prefijo opcional por plantilla para diferenciar en UI (ej. "Foto", "Video").
 */
export async function importChecklistToTask(
  studioSlug: string,
  eventId: string,
  taskId: string,
  templateIds: string[],
  options?: { prefix?: string; prefixPerTemplate?: Record<string, string> }
): Promise<ImportChecklistToTaskResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, checklist_items: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    if (templateIds.length === 0) {
      return { success: true, data: { addedCount: 0 } };
    }

    const templates = await prisma.studio_scheduler_checklist_templates.findMany({
      where: {
        id: { in: templateIds },
        studio_id: studio.id,
      },
      select: { id: true, name: true, items: true },
    });

    const existing = parseTaskChecklistItems(task.checklist_items);
    const existingIds = new Set(existing.map((i) => i.id));
    const added: SchedulerChecklistItem[] = [];

    const globalPrefix = options?.prefix?.trim();
    const prefixMap = options?.prefixPerTemplate ?? {};

    const formatPrefix = (raw: string) =>
      raw ? (raw.startsWith('[') ? raw + ' ' : `[${raw}] `) : '';

    for (const t of templates) {
      const items = parseTemplateItems(t.items);
      const rawPrefix = prefixMap[t.id] ?? globalPrefix ?? (t.name ?? '');
      const prefix = formatPrefix(rawPrefix.trim());

      for (const it of items) {
        const label = prefix ? `${prefix}${it.label}` : it.label;
        let id: string;
        do {
          id = crypto.randomUUID();
        } while (existingIds.has(id));
        existingIds.add(id);

        added.push({
          id,
          label,
          done: false,
          completed_at: null,
          source: t.name || undefined,
        });
      }
    }

    const newChecklist = [...existing, ...added];

    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { checklist_items: newChecklist as unknown as object },
    });

    revalidatePath(`/[slug]/studio/business/events/[eventId]/scheduler`, 'page');
    revalidatePath(`/[slug]/studio/business/events/[eventId]`, 'page');

    return { success: true, data: { addedCount: added.length } };
  } catch (e) {
    console.error('[checklist] importChecklistToTask:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al importar plantilla',
    };
  }
}
