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
  // Mostrar costo total interno: costo (unitario) * cantidad
  // Este es el costo que se paga al personal, no el precio al cliente
  const unitaryCost = item.cost ?? 0;
  const totalCost = unitaryCost * item.quantity;

  return (
    <div className="text-sm text-zinc-300 font-medium">
      {totalCost > 0 ? formatCurrency(totalCost) : '—'}
    </div>
  );
}
