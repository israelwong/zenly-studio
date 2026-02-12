'use client';

import React, { useMemo } from 'react';
import { format, isSameMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { getTotalGridWidth, getTodayLocalDateOnly, toLocalDateOnly } from '../../utils/coordinate-utils';
import { toUtcDateOnly, dateToDateOnlyString } from '@/lib/utils/date-only';
import { SchedulerHeaderDatePopover } from './SchedulerHeaderDatePopover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';

type ReminderItem = { id: string; reminder_date: Date | string; subject_text: string; description: string | null };

interface SchedulerHeaderProps {
  dateRange: DateRange;
  columnWidth?: number;
  studioSlug?: string;
  eventId?: string;
  schedulerDateReminders?: ReminderItem[];
  onReminderAdd?: (reminderDate: Date, subjectText: string, description: string | null) => Promise<void>;
  onReminderUpdate?: (reminderId: string, subjectText: string, description: string | null) => Promise<void>;
  onReminderMoveDateOptimistic?: (reminderId: string, newDate: Date) => void;
  onReminderMoveDateRevert?: (reminderId: string, previousDate: Date) => void;
  onReminderDelete?: (reminderId: string) => Promise<void>;
}

/** Clave YYYY-MM-DD en UTC (Guía Maestra SSoT). */
function dateToKey(d: Date | string): string {
  const normalized = toUtcDateOnly(typeof d === 'string' ? d : d);
  return normalized ? dateToDateOnlyString(normalized) ?? '' : '';
}

export const SchedulerHeader = React.memo(({ dateRange, columnWidth = 60, studioSlug, eventId, schedulerDateReminders = [], onReminderAdd, onReminderUpdate, onReminderMoveDateOptimistic, onReminderMoveDateRevert, onReminderDelete }: SchedulerHeaderProps) => {
  const remindersByDate = useMemo(() => {
    const map = new Map<string, ReminderItem>();
    for (const r of schedulerDateReminders) {
      map.set(dateToKey(r.reminder_date), r);
    }
    return map;
  }, [schedulerDateReminders]);

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

  const totalWidth = getTotalGridWidth(dateRange, columnWidth);

  return (
    <div
      className="flex h-12 min-h-12 max-h-12 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex-shrink-0 sticky top-0 z-[25] box-border"
      style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
    >
      {days.map((day, index) => {
        const todayLocal = getTodayLocalDateOnly();
        const cellLocal = toLocalDateOnly(day);
        const isToday = cellLocal.getTime() === todayLocal.getTime();

        const reminder = remindersByDate.get(dateToKey(day));
        const cellContent = (
          <>
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
            {reminder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-0.5 cursor-default"
                    aria-hidden
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[180px]">
                  {reminder.subject_text}
                </TooltipContent>
              </Tooltip>
            )}
          </>
        );

        return studioSlug && eventId ? (
          <SchedulerHeaderDatePopover
            key={day.toISOString()}
            studioSlug={studioSlug}
            eventId={eventId}
            day={day}
            isToday={isToday}
            columnWidth={columnWidth}
            existingReminder={reminder}
            onReminderAdd={onReminderAdd}
            onReminderUpdate={onReminderUpdate}
            onReminderMoveDateOptimistic={onReminderMoveDateOptimistic}
            onReminderMoveDateRevert={onReminderMoveDateRevert}
            onReminderDelete={onReminderDelete}
          >
            {cellContent}
          </SchedulerHeaderDatePopover>
        ) : (
          <div
            key={day.toISOString()}
            className={`flex-shrink-0 h-full flex flex-col items-center justify-center border-r border-zinc-800/50 ${isToday ? 'bg-emerald-500/10' : ''}`}
            style={{ width: columnWidth, minWidth: columnWidth }}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const columnWidthEqual = prevProps.columnWidth === nextProps.columnWidth;
  const idsEqual = prevProps.studioSlug === nextProps.studioSlug && prevProps.eventId === nextProps.eventId;
  const remindersEqual = prevProps.schedulerDateReminders === nextProps.schedulerDateReminders;
  return prevFrom === nextFrom && prevTo === nextTo && columnWidthEqual && idsEqual && remindersEqual;
});

SchedulerHeader.displayName = 'SchedulerHeader';

