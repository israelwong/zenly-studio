'use client';

import React from 'react';
import { format, isSameMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { getTotalGridWidth } from '../utils/coordinate-utils';

interface SchedulerHeaderProps {
  dateRange: DateRange;
}

export const SchedulerHeader = React.memo(({ dateRange }: SchedulerHeaderProps) => {
  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="h-[60px] flex items-center justify-center bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-600">Configurar fechas</span>
      </div>
    );
  }

  const days = eachDayOfInterval({
    start: dateRange.from,
    end: dateRange.to,
  });

  const shouldShowMonth = (day: Date, index: number) => {
    if (index === 0) return true;
    const prevDay = days[index - 1];
    return !isSameMonth(day, prevDay);
  };

  const totalWidth = getTotalGridWidth(dateRange);

  return (
    <div
      className="flex h-[60px] bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
    >
      {days.map((day, index) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cellDate = new Date(day);
        cellDate.setHours(0, 0, 0, 0);
        const isToday = cellDate.getTime() === today.getTime();

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
              <span className="text-[9px] font-semibold text-zinc-400 uppercase mb-0.5">
                {format(day, 'MMM', { locale: es })}
              </span>
            )}
            <span className="text-[10px] font-medium text-zinc-500 uppercase">
              {format(day, 'EEE', { locale: es })}
            </span>
            <span
              className={`
                text-xs font-bold mt-0.5
                ${isToday ? 'text-emerald-400' : 'text-zinc-300'}
              `}
            >
              {format(day, 'd')}
            </span>
            {isToday && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
          </div>
        );
      })}
    </div>
  );
});

SchedulerHeader.displayName = 'SchedulerHeader';

