'use client';

import { cn } from '@/lib/utils';

interface TaskCardProps {
    task: {
        id: string;
        name: string;
        start_date: Date;
        end_date: Date;
        status: string;
    };
    day: Date;
    onClick?: (e: React.MouseEvent) => void;
}

export function TaskCard({ task, day, onClick }: TaskCardProps) {
    const isCompleted = task.status === 'COMPLETED';
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const dayDate = new Date(day);

    // Normalizar fechas para comparación (solo día, sin hora)
    const normalizeDate = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const normalizedDay = normalizeDate(dayDate);
    const normalizedStart = normalizeDate(taskStart);
    const normalizedEnd = normalizeDate(taskEnd);

    // Determinar si es el primer día, último día, o día intermedio
    const isFirstDay = normalizedDay.getTime() === normalizedStart.getTime();
    const isLastDay = normalizedDay.getTime() === normalizedEnd.getTime();
    const isMiddleDay = !isFirstDay && !isLastDay;

    // Calcular si es tarea de un solo día
    const isSingleDay = normalizedStart.getTime() === normalizedEnd.getTime();

    return (
        <div
            data-task-card
            onClick={onClick}
            className={cn(
                'h-full w-full cursor-pointer transition-all',
                'hover:opacity-80',
                isCompleted
                    ? 'bg-emerald-900/70 hover:bg-emerald-900/80'
                    : 'bg-blue-900/70 hover:bg-blue-900/80',
                // Bordes redondeados según posición
                isSingleDay && 'rounded',
                isFirstDay && !isLastDay && 'rounded-l rounded-r-none',
                isLastDay && !isFirstDay && 'rounded-r rounded-l-none',
                isMiddleDay && 'rounded-none'
            )}
            title={task.name}
        />
    );
}

