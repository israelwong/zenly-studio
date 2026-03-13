'use server';

import { prisma } from '@/lib/prisma';

export interface TodoListTask {
  id: string;
  name: string;
  status: string;
  progress_percent: number;
  category: string;
  catalog_section_name_snapshot: string | null;
  catalog_category_name_snapshot: string | null;
  catalog_category: { id: string; name: string } | null;
  duration_days: number;
  duration_hours_snapshot: number | null;
  start_date: Date;
  end_date: Date;
  budget_amount: number | null;
  cotizacion_item_id: string | null;
  assigned_to_crew_member_id: string | null;
  assigned_to_crew_member: { id: string; name: string } | null;
  /** Si la tarea tiene registro de nómina (pago asignado/cerrado) */
  payroll_state?: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
  /** Datos del ítem de cotización para popover (solo si cotizacion_item_id) */
  item_meta?: {
    profit_type: string | null;
    billing_type: string | null;
    quantity: number;
    cost: number;
    duration_hours: number | null;
  };
}

export async function obtenerTareasParaTodoList(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; data: TodoListTask[]; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, data: [], error: 'Studio no encontrado' };

    const tasks = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: { event_id: eventId },
      },
      select: {
        id: true,
        name: true,
        status: true,
        progress_percent: true,
        category: true,
        catalog_section_name_snapshot: true,
        catalog_category_name_snapshot: true,
        catalog_category: { select: { id: true, name: true } },
        duration_days: true,
        duration_hours_snapshot: true,
        quantity_snapshot: true,
        billing_type_snapshot: true,
        profit_type_snapshot: true,
        start_date: true,
        end_date: true,
        budget_amount: true,
        cotizacion_item_id: true,
        assigned_to_crew_member_id: true,
        assigned_to_crew_member: {
          select: { id: true, name: true },
        },
        cotizacion_item: {
          select: {
            quantity: true,
            cost: true,
            cost_snapshot: true,
            billing_type: true,
            profit_type: true,
            items: { select: { billing_type: true } },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { end_date: 'asc' }],
    });

    const itemIds = tasks
      .map((t) => t.cotizacion_item_id)
      .filter((id): id is string => id != null);
    const payrollByItem = new Map<string, { hasPayroll: true; status: 'pendiente' | 'pagado' }>();
    if (itemIds.length > 0) {
      const servicios = await prisma.studio_nomina_servicios.findMany({
        where: {
          quote_service_id: { in: itemIds },
          payroll: { evento_id: eventId },
        },
        select: {
          quote_service_id: true,
          payroll: { select: { status: true } },
        },
      });
      for (const s of servicios) {
        if (s.quote_service_id) {
          const status = s.payroll.status === 'pagado' ? 'pagado' : 'pendiente';
          payrollByItem.set(s.quote_service_id, { hasPayroll: true, status });
        }
      }
    }

    const data: TodoListTask[] = tasks.map((t) => {
      const item = t.cotizacion_item as typeof t.cotizacion_item & { items?: { billing_type?: string } | null };
      const taskBilling = (t as { billing_type_snapshot?: string | null }).billing_type_snapshot;
      const billingType: string | null =
        taskBilling ??
        (item?.billing_type != null ? String(item.billing_type) : null) ??
        (item?.items?.billing_type != null ? String(item.items.billing_type) : null);
      const profitType =
        (t as { profit_type_snapshot?: string | null }).profit_type_snapshot ??
        item?.profit_type ??
        null;
      const durationHours = t.duration_hours_snapshot ?? null;
      const taskQuantity = (t as { quantity_snapshot?: number | null }).quantity_snapshot;
      const quantity = t.cotizacion_item_id ? (item?.quantity ?? 1) : (taskQuantity ?? 1);
      const budgetNum = t.budget_amount != null ? Number(t.budget_amount) : 0;
      const cost =
        t.cotizacion_item_id
          ? (item?.cost != null ? Number(item.cost) : (item?.cost_snapshot != null ? Number(item.cost_snapshot) : 0))
          : (taskBilling === 'HOUR' && durationHours && durationHours > 0
              ? budgetNum / durationHours
              : taskBilling === 'UNIT' && taskQuantity && taskQuantity > 0
                ? budgetNum / taskQuantity
                : budgetNum);

      return {
        id: t.id,
        name: t.name,
        status: t.status ?? 'PENDING',
        progress_percent: t.progress_percent ?? 0,
        category: t.category,
        catalog_section_name_snapshot: t.catalog_section_name_snapshot,
        catalog_category_name_snapshot: t.catalog_category_name_snapshot,
        catalog_category: t.catalog_category,
        duration_days: t.duration_days,
        duration_hours_snapshot: t.duration_hours_snapshot,
        start_date: t.start_date,
        end_date: t.end_date,
        budget_amount: t.budget_amount != null ? Number(t.budget_amount) : null,
        cotizacion_item_id: t.cotizacion_item_id,
        assigned_to_crew_member_id: t.assigned_to_crew_member_id,
        assigned_to_crew_member: t.assigned_to_crew_member
          ? { id: t.assigned_to_crew_member.id, name: t.assigned_to_crew_member.name }
          : null,
        payroll_state: t.cotizacion_item_id
          ? (payrollByItem.get(t.cotizacion_item_id) ?? { hasPayroll: false })
          : { hasPayroll: false } as const,
        item_meta:
          t.cotizacion_item_id
            ? {
                profit_type: profitType,
                billing_type: billingType,
                quantity: item?.quantity ?? 1,
                cost: item ? (item.cost != null ? Number(item.cost) : (item.cost_snapshot != null ? Number(item.cost_snapshot) : 0)) : 0,
                duration_hours: durationHours,
              }
            : (billingType || budgetNum > 0)
              ? {
                  profit_type: profitType,
                  billing_type: billingType,
                  quantity,
                  cost,
                  duration_hours: durationHours,
                }
              : undefined,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error('[TodoList] Error obteniendo tareas:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Error al obtener tareas',
    };
  }
}
