import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, UserPlus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import { asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';

interface DayCellProps {
    date: Date;
    isHeader?: boolean;
    onDayClick?: (date: Date) => void;
    onTaskClick?: (taskId: string, date: Date) => void;
    itemId?: string;
    studioSlug?: string;
    onItemUpdate?: () => void;
    tasks?: Array<{
        id: string;
        name: string;
        start_date: Date;
        end_date: Date;
        status: string;
    }>;
    showMonth?: boolean;
    isToday?: boolean;
}

interface DayCellHeaderProps {
    date: Date;
    showMonth?: boolean;
    isToday?: boolean;
}

function DayCellHeader({ date, showMonth = false }: DayCellHeaderProps) {
    // Comparar fechas usando métodos UTC para evitar problemas de zona horaria
    const todayUtc = new Date();
    const todayDateOnly = new Date(Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate()
    ));
    const cellDateOnly = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ));
    const isTodayCell = cellDateOnly.getTime() === todayDateOnly.getTime();

    return (
        <div className="w-[60px] flex-shrink-0 h-full flex flex-col items-center justify-center border-r border-zinc-800/50 bg-zinc-900/50 relative">
            {showMonth && (
                <span className="text-[9px] font-semibold text-zinc-400 uppercase mb-0.5">
                    {format(date, 'MMM', { locale: es })}
                </span>
            )}
            <span className="text-[10px] font-medium text-zinc-500 uppercase">
                {format(date, 'EEE', { locale: es })}
            </span>
            <span className={`
                text-xs font-bold mt-0.5
                ${isTodayCell ? 'text-emerald-400' : 'text-zinc-300'}
            `}>
                {format(date, 'd')}
            </span>
            {isTodayCell && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
        </div>
    );
}

export function DayCell({
    date,
    isHeader = false,
    onDayClick,
    onTaskClick,
    tasks = [],
    showMonth = false,
    isToday = false,
    itemId,
    studioSlug,
    onItemUpdate,
}: DayCellProps) {
    const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);

    if (isHeader) {
        return <DayCellHeader date={date} showMonth={showMonth} isToday={isToday} />;
    }

    const handleAssignCrew = async (crewMemberId: string | null) => {
        if (!itemId || !studioSlug) return;

        try {
            const result = await asignarCrewAItem(studioSlug, itemId, crewMemberId);
            if (!result.success) {
                throw new Error(result.error || 'Error al asignar personal');
            }
            toast.success(crewMemberId ? 'Personal asignado correctamente' : 'Asignación removida');
            if (onItemUpdate) {
                onItemUpdate();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
        }
    };

    // Comparar fechas usando métodos UTC para evitar problemas de zona horaria
    const todayUtc = new Date();
    const todayDateOnly = new Date(Date.UTC(
        todayUtc.getUTCFullYear(),
        todayUtc.getUTCMonth(),
        todayUtc.getUTCDate(),
        12, 0, 0
    ));
    const cellDateUtc = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        12, 0, 0
    ));
    const isTodayCell = cellDateUtc.getTime() === todayDateOnly.getTime();

    const tasksThisDay = tasks.filter(task => {
        // Normalizar fechas usando métodos UTC
        const normalizeDate = (d: Date) => {
            return new Date(Date.UTC(
                d.getUTCFullYear(),
                d.getUTCMonth(),
                d.getUTCDate(),
                12, 0, 0
            ));
        };

        const normalizedDay = normalizeDate(date);
        const normalizedStart = normalizeDate(task.start_date);
        const normalizedEnd = normalizeDate(task.end_date);

        return normalizedDay.getTime() >= normalizedStart.getTime() && normalizedDay.getTime() <= normalizedEnd.getTime();
    });


    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-task-card]')) {
            return;
        }

        if (onDayClick) {
            e.stopPropagation();
            onDayClick(date);
        }
    };

    const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (onTaskClick) {
            onTaskClick(taskId, date);
        }
    };

    const hasTasks = tasksThisDay.length > 0;
    const canShowContextMenu = !isHeader && itemId && studioSlug;

    const cellContent = (
        <div
            data-day-cell={date.toISOString()}
            className="w-[60px] flex-shrink-0 h-full relative hover:bg-zinc-800/30 transition-colors group cursor-pointer border-r border-zinc-800/50"
            onClick={handleClick}
        >
            {/* Indicador de hoy - full height */}
            {isTodayCell && (
                <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
            )}

            {/* Tareas del día - ocupan todo el espacio */}
            {hasTasks ? (
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                    {tasksThisDay.map(task => (
                        <div key={task.id} className="min-h-[50px] pointer-events-auto">
                            <TaskCard
                                task={task}
                                day={date}
                                onClick={(e) => handleTaskClick(e, task.id)}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                /* Botón + solo cuando NO hay tareas */
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center ">
                    <Plus className="h-4 w-4 text-zinc-600" />
                </div>
            )}
        </div>
    );

    // Si no puede mostrar context menu, retornar solo el contenido
    if (!canShowContextMenu) {
        return cellContent;
    }

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {cellContent}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56 bg-zinc-900 border-zinc-800 z-50">
                    <ContextMenuItem
                        onClick={() => setSelectCrewModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                    >
                        <UserPlus className="h-4 w-4 text-zinc-400" />
                        <span>Asignar personal</span>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <SelectCrewModal
                isOpen={selectCrewModalOpen}
                onClose={() => setSelectCrewModalOpen(false)}
                onSelect={handleAssignCrew}
                studioSlug={studioSlug}
            />
        </>
    );
}
