import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface DayCellProps {
    date: Date;
    isHeader?: boolean;
    onDayClick?: (date: Date) => void;
    onTaskClick?: (taskId: string, date: Date) => void;
    itemId?: string;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(date);
    cellDate.setHours(0, 0, 0, 0);
    const isTodayCell = cellDate.getTime() === today.getTime();

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
}: DayCellProps) {
    if (isHeader) {
        return <DayCellHeader date={date} showMonth={showMonth} isToday={isToday} />;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(date);
    cellDate.setHours(0, 0, 0, 0);
    const isTodayCell = cellDate.getTime() === today.getTime();

    const tasksThisDay = tasks.filter(task => {
        const taskStart = new Date(task.start_date);
        const taskEnd = new Date(task.end_date);
        const dayDate = new Date(date);

        const normalizeDate = (d: Date) => {
            const normalized = new Date(d);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };

        const normalizedDay = normalizeDate(dayDate);
        const normalizedStart = normalizeDate(taskStart);
        const normalizedEnd = normalizeDate(taskEnd);

        return normalizedDay >= normalizedStart && normalizedDay <= normalizedEnd;
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

    return (
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
}
