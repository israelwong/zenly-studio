import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface GanttProgressCellProps {
    item: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'][0];
}

export function GanttProgressCell({ item }: GanttProgressCellProps) {
    // Obtener progreso desde gantt_task si existe
    const progress = item.gantt_task?.progress_percent ?? 0;

    return (
        <div className="text-sm text-zinc-400">
            {progress}%
        </div>
    );
}
