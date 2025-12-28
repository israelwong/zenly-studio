'use client';

import { useCallback } from 'react';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { SchedulerAgrupacionCell } from './SchedulerAgrupacionCell';
import { SchedulerTimelineRow } from '../timeline/SchedulerTimelineRow';
import { SchedulerItemDetailPopover } from './SchedulerItemDetailPopover';
import { useSchedulerItemSync } from '../../hooks/useSchedulerItemSync';

import { type DateRange } from 'react-day-picker';

interface SchedulerItemRowProps {
    item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
    itemData: {
        seccionNombre: string;
        categoriaNombre: string;
        servicioNombre: string;
        servicioId: string;
    };
    studioSlug: string;
    dateRange?: DateRange;
    onTaskClick?: (taskId: string, dayDate: Date, itemId: string) => void;
    onAddTaskClick?: (dayDate: Date, itemId: string, itemName: string) => void;
    onItemUpdate?: (updatedItem: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]) => void;
}

export function SchedulerItemRow({
    item,
    itemData,
    studioSlug,
    dateRange,
    onTaskClick,
    onAddTaskClick,
    onItemUpdate
}: SchedulerItemRowProps) {
    // Hook de sincronización (optimista + servidor)
    const { localItem } = useSchedulerItemSync(item, onItemUpdate);

    const handleDayClick = useCallback((date: Date) => {
        if (onAddTaskClick) {
            onAddTaskClick(date, localItem.id, itemData.servicioNombre);
        }
    }, [onAddTaskClick, localItem.id, itemData.servicioNombre]);

    // Obtener tareas del item (si existen)
    const tasks = localItem.scheduler_task ? [localItem.scheduler_task].map(task => ({
        id: task.id,
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        status: task.status,
    })) : [];

    // Calcular duración en días
    const duration = localItem.scheduler_task?.start_date && localItem.scheduler_task?.end_date
        ? Math.ceil((new Date(localItem.scheduler_task.end_date).getTime() - new Date(localItem.scheduler_task.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

    // Determinar si la tarea está completada
    const isCompleted = !!localItem.scheduler_task?.completed_at;

    return (
        <tr className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors group">
            {/* Agrupación (Sticky Left) */}
            <td className="px-4 py-3 sticky left-0 bg-zinc-950 z-20 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800/50 min-w-[360px]">
                <SchedulerItemDetailPopover
                    item={localItem}
                    studioSlug={studioSlug}
                    onItemUpdate={onItemUpdate}
                >
                    <button className="w-full text-left">
                        <SchedulerAgrupacionCell
                            servicio={itemData.servicioNombre}
                            isCompleted={isCompleted}
                            assignedCrewMember={localItem.assigned_to_crew_member}
                            duration={duration}
                            hasSlot={!!localItem.scheduler_task}
                        />
                    </button>
                </SchedulerItemDetailPopover>
            </td>

            {/* Timeline */}
            <td className="p-0 py-3 min-w-[400px]">
                <SchedulerTimelineRow
                    dateRange={dateRange}
                    itemId={localItem.id}
                    studioSlug={studioSlug}
                    onItemUpdate={onItemUpdate ? () => {
                        // Cuando se actualiza desde DayCell, actualizar el item local
                        // El hook useSchedulerItemSync se sincronizará automáticamente
                        // cuando el prop 'item' cambie desde el padre
                        if (onItemUpdate) {
                            onItemUpdate(localItem);
                        }
                    } : undefined}
                    tasks={tasks}
                    onDayClick={handleDayClick}
                    onTaskClick={(taskId, dayDate) => {
                        if (onTaskClick) {
                            onTaskClick(taskId, dayDate, localItem.id);
                        }
                    }}
                />
            </td>
        </tr>
    );
}
