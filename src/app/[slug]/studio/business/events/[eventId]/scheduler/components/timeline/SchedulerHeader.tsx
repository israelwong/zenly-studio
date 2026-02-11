'use client';

import React from 'react';
import { format, isSameMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { getTotalGridWidth, getTodayLocalDateOnly, toLocalDateOnly } from '../../utils/coordinate-utils';

interface SchedulerHeaderProps {
  dateRange: DateRange;
}

export const SchedulerHeader = React.memo(({ dateRange }: SchedulerHeaderProps) => {
  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="h-12 min-h-12 max-h-12 flex items-center justify-center bg-zinc-900/50 border-b border-white/5 box-border">
        <span className="text-xs text-zinc-600">Configurar fechas</span>
      </div>
    );
  }

  const fromLocal = toLocalDateOnly(dateRange.from);
  const toLocal = toLocalDateOnly(dateRange.to);
  const days = eachDayOfInterval({ start: fromLocal, end: toLocal });

  const shouldShowMonth = (day: Date, index: number) => {
    if (index === 0) return true;
    const prevDay = days[index - 1];
    return !isSameMonth(day, prevDay);
  };

  const totalWidth = getTotalGridWidth(dateRange);

  return (
    <div
      className="flex h-12 min-h-12 max-h-12 bg-zinc-900/95 backdrop-blur-sm border-b border-white/5 flex-shrink-0 sticky top-0 z-10 box-border"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
    >
      {days.map((day, index) => {
        const todayLocal = getTodayLocalDateOnly();
        const cellLocal = toLocalDateOnly(day);
        const isToday = cellLocal.getTime() === todayLocal.getTime();

        return (
          <div
            key={day.toISOString()}
            className={`
              w-[60px] flex-shrink-0 h-full flex flex-col items-center justify-center
              border-r border-zinc-800/50
              ${isToday ? 'bg-emerald-500/10' : ''}
            `}
          >
            {shouldShowMonth(day, index) && (
              <span className="text-[9px] font-semibold text-zinc-400 uppercase leading-tight">
                {format(day, 'MMM', { locale: es })}
              </span>
            )}
            <span className="text-[10px] font-medium text-zinc-500 uppercase leading-tight">
              {format(day, 'EEE', { locale: es })}
            </span>
            <span
              className={`text-xs font-bold leading-tight ${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}
            >
              {format(day, 'd')}
            </span>
          </div>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si las fechas cambian
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  return prevFrom === nextFrom && prevTo === nextTo;
});

SchedulerHeader.displayName = 'SchedulerHeader';

