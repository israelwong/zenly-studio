'use client';

import { useState, useCallback } from 'react';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { SchedulerAgrupacionCell } from './SchedulerAgrupacionCell';
import { SchedulerDurationCell } from './SchedulerDurationCell';
import { SchedulerProgressCell } from './SchedulerProgressCell';
import { SchedulerTimelineRow } from './SchedulerTimelineRow';
import { SchedulerItemDetailPopover } from './SchedulerItemDetailPopover';

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
    showDuration?: boolean;
    showProgress?: boolean;
    onTaskClick?: (taskId: string, dayDate: Date, itemId: string) => void;
    onAddTaskClick?: (dayDate: Date, itemId: string, itemName: string) => void;
}

export function SchedulerItemRow({
    item,
    itemData,
    studioSlug,
    dateRange,
    showDuration = false,
    showProgress = false,
    onTaskClick,
    onAddTaskClick
}: SchedulerItemRowProps) {
    // Estado local del item para actualización en tiempo real
    const [localItem, setLocalItem] = useState(item);

    // Callback para actualizar el crew member asignado
    const handleCrewMemberUpdate = useCallback((crewMemberId: string | null, crewMember?: { id: string; name: string; tipo: string } | null) => {
        if (crewMemberId && crewMember) {
            setLocalItem(prev => ({
                ...prev,
                assigned_to_crew_member_id: crewMemberId,
                assigned_to_crew_member: {
                    id: crewMember.id,
                    name: crewMember.name,
                    tipo: crewMember.tipo as 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR',
                    category: {
                        id: '',
                        name: crewMember.tipo || 'Sin categoría', // Usar tipo como fallback temporal
                    },
                },
            } as typeof prev));
        } else {
            // Quitar asignación
            setLocalItem(prev => ({
                ...prev,
                assigned_to_crew_member_id: null,
                assigned_to_crew_member: null,
            }));
        }
    }, []);

    const handleDayClick = useCallback((date: Date) => {
        if (onAddTaskClick) {
            onAddTaskClick(date, localItem.id, itemData.servicioNombre);
        }
    }, [onAddTaskClick, localItem.id, itemData.servicioNombre]);

    // Obtener tareas del item (si existen)
    const tasks = localItem.gantt_task ? [localItem.gantt_task].map(task => ({
        id: task.id,
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        status: task.status,
    })) : [];

    return (
        <tr className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors group">
            {/* Agrupación (Sticky Left) */}
            <td className="px-4 py-3 sticky left-0 bg-zinc-950 z-20 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800/50 min-w-[360px]">
                <SchedulerItemDetailPopover
                    item={localItem}
                    studioSlug={studioSlug}
                    onCrewMemberUpdate={handleCrewMemberUpdate}
                >
                    <button className="w-full text-left">
                        <SchedulerAgrupacionCell
                            servicio={itemData.servicioNombre}
                            assignedCrewMember={localItem.assigned_to_crew_member}
                        />
                    </button>
                </SchedulerItemDetailPopover>
            </td>

            {/* Duración */}
            {showDuration && (
                <td className="px-4 py-3 bg-zinc-950 group-hover:bg-zinc-900 transition-colors">
                    <SchedulerDurationCell item={item} />
                </td>
            )}

            {/* Progreso */}
            {showProgress && (
                <td className="px-4 py-3 bg-zinc-950 group-hover:bg-zinc-900 transition-colors">
                    <SchedulerProgressCell item={item} />
                </td>
            )}

            {/* Timeline */}
            <td className="p-0 py-3 min-w-[400px]">
                <SchedulerTimelineRow
                    dateRange={dateRange}
                    itemId={localItem.id}
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
