import { type DateRange } from 'react-day-picker';
import { eachDayOfInterval, isSameMonth } from 'date-fns';
import { DayCell } from './DayCell';

interface SchedulerTimelineRowProps {
    dateRange?: DateRange;
    isHeader?: boolean;
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
    onDayClick?: (date: Date) => void;
    onTaskClick?: (taskId: string, date: Date) => void;
}

export function SchedulerTimelineRow({
    dateRange,
    isHeader = false,
    itemId,
    studioSlug,
    onItemUpdate,
    tasks = [],
    onDayClick,
    onTaskClick
}: SchedulerTimelineRowProps) {
    if (!dateRange?.from || !dateRange?.to) {
        return (
            <div className={`h-full w-full min-h-[40px] flex items-center justify-center ${isHeader ? '' : 'bg-zinc-900/20 rounded border border-zinc-800/50 border-dashed'}`}>
                <span className="text-xs text-zinc-600 px-2">
                    {isHeader ? 'Configurar fechas' : 'Sin rango'}
                </span>
            </div>
        );
    }

    const days = eachDayOfInterval({
        start: dateRange.from,
        end: dateRange.to,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determinar si mostrar mes para cada día (mostrar en el primer día de cada mes)
    const shouldShowMonth = (day: Date, index: number) => {
        if (index === 0) return true;
        const prevDay = days[index - 1];
        return !isSameMonth(day, prevDay);
    };

    return (
        <div className="flex h-full min-h-[60px] relative">
            {days.map((day, index) => {
                // Comparar fechas usando métodos UTC
                const dayDateUtc = new Date(Date.UTC(
                  day.getUTCFullYear(),
                  day.getUTCMonth(),
                  day.getUTCDate(),
                  12, 0, 0
                ));
                const isToday = dayDateUtc.getTime() === todayDateOnly.getTime();

                return (
                    <DayCell
                        key={day.toISOString()}
                        date={day}
                        isHeader={isHeader}
                        itemId={itemId}
                        studioSlug={studioSlug}
                        onItemUpdate={onItemUpdate}
                        tasks={tasks}
                        onDayClick={isHeader ? undefined : onDayClick}
                        onTaskClick={onTaskClick}
                        showMonth={isHeader && shouldShowMonth(day, index)}
                        isToday={isToday}
                    />
                );
            })}
        </div>
    );
}
