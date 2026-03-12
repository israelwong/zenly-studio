import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface SchedulerCostCellProps {
  item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
}

export function SchedulerCostCell({ item }: SchedulerCostCellProps) {
  // Database-first: presupuesto solo desde budget_amount de la tarea (sin cálculos al vuelo)
  const budgetAmount = item.scheduler_task?.budget_amount != null ? Number(item.scheduler_task.budget_amount) : null;

  return (
    <div className="text-sm text-zinc-300 font-medium">
      {budgetAmount != null && budgetAmount > 0 ? formatCurrency(budgetAmount) : '—'}
    </div>
  );
}
