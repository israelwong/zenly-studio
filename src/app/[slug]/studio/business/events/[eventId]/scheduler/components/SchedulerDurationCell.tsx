import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface SchedulerDurationCellProps {
    item: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'][0];
}

export function SchedulerDurationCell({ item }: SchedulerDurationCellProps) {
    // Obtener duración desde gantt_task si existe, sino mostrar guión
    const duration = item.gantt_task?.start_date && item.gantt_task?.end_date
        ? Math.ceil((new Date(item.gantt_task.end_date).getTime() - new Date(item.gantt_task.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <div className="text-sm text-zinc-400">
            {duration > 0 ? `${duration} días` : '—'}
        </div>
    );
}
