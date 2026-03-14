'use client';

/**
 * Fase 4: CalendarDrawer - Vista compacta del Calendario Maestro.
 * Plan: .cursor/docs/plans/01-calendar-unification-master-plan.md
 * SSoT 10.05: Fechas con toUtcDateOnly, dateToDateOnlyString (alineado con scheduler/BD).
 * Prohibido: toLocaleDateString, new Date() local para comparar días.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CalendarDays, ChevronDown, CheckCircle2, Bell, ArrowUpRight, User, Briefcase, Banknote, MessageSquare } from 'lucide-react';
import { toUtcDateOnly, dateToDateOnlyString, parseDateOnlyToUtc } from '@/lib/utils/date-only';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenCalendar, ZenButton, ZenCalendarDayButton } from '@/components/ui/zen';
import { obtenerCalendarioMaestro } from '@/lib/actions/shared/calendar-maestro.actions';
import type {
  MasterCalendarItem,
  CalendarItemType,
  SchedulerTaskStats,
} from '@/lib/actions/shared/calendar-maestro.actions';
import { cn } from '@/lib/utils';

/** Paleta por tipo (Plan 8.13) */
const TYPE_LABELS: Record<CalendarItemType, string> = {
  PROMISE: 'Promesa',
  EVENT: 'Evento',
  AGENDA: 'Agenda',
  SCHEDULER_TASK: 'Tarea',
  REMINDER: 'Recordatorio',
  SCHEDULER_REMINDER: 'Record. Scheduler',
  EVENT_TASK: 'Tarea operativa',
  NOTIFICATION: 'Notificación',
};

const TYPE_COLORS: Record<CalendarItemType, string> = {
  EVENT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  PROMISE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  AGENDA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SCHEDULER_TASK: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  REMINDER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  SCHEDULER_REMINDER: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  EVENT_TASK: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  NOTIFICATION: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

/** SSoT 10.05: YYYY-MM-DD para comparación. Usa toUtcDateOnly (alineado con scheduler/BD). Prohibido toLocaleDateString. */
function toDateOnlyStr(date: Date | string): string | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  const normalized = toUtcDateOnly(d);
  return normalized ? dateToDateOnlyString(normalized) : null;
}

/** Principal: tipo evento + nombre evento. Si evento principal (EVENT): solo eso. Si solo tareas: + nombre tarea. */
function formatGroupTitles(group: { items: MasterCalendarItem[] }): { main: string; secondary: string | null } {
  const items = group.items;
  const eventItem = items.find((i) => i.type === 'EVENT');
  const promiseItem = items.find((i) => i.type === 'PROMISE');
  const taskItems = items.filter((i) => i.type === 'SCHEDULER_TASK' || i.type === 'EVENT_TASK');
  const hasEventPrincipal = !!eventItem;
  const sourceItem = eventItem ?? promiseItem ?? items[0]!;
  const meta = (sourceItem.metadata ?? {}) as Record<string, unknown>;
  const typeLabel = (meta.event_type_name as string) || TYPE_LABELS[sourceItem.type];
  const eventName =
    (meta.event_title as string) ||
    (meta.title as string) ||
    (meta.contact_name as string) ||
    'Sin título';
  const contactName = (meta.contact_name as string) || null;
  const hasEventOrPromise = sourceItem.event_id || sourceItem.promise_id;
  if (!hasEventOrPromise) {
    return { main: (meta.title as string) || 'Recordatorio', secondary: contactName };
  }
  const prefix = `${typeLabel} ${eventName}`;
  if (hasEventPrincipal) {
    return { main: prefix, secondary: contactName };
  }
  if (taskItems.length > 0) {
    const taskNames = taskItems.map((t) => ((t.metadata as Record<string, unknown>)?.title as string) || 'Tarea');
    return { main: `${prefix}: ${taskNames.join(', ')}`, secondary: contactName };
  }
  return { main: prefix, secondary: contactName };
}

/** Agrupa por event_id o promise_id. Si no tiene ID, queda solo. */
function groupItemsByClient(items: MasterCalendarItem[]): Array<{ key: string; items: MasterCalendarItem[]; eventId: string | null; promiseId: string | null }> {
  const byKey = new Map<string, MasterCalendarItem[]>();
  for (const item of items) {
    const key = item.event_id ?? item.promise_id ?? item.id;
    const arr = byKey.get(key) ?? [];
    arr.push(item);
    byKey.set(key, arr);
  }
  return Array.from(byKey.entries()).map(([key, items]) => ({
    key,
    items,
    eventId: items[0]?.event_id ?? null,
    promiseId: items[0]?.promise_id ?? null,
  }));
}

/** Favorece EVENT sobre PROMISE. NUNCA oculta EVENT (corrección 28 marzo). */
function deduplicateByHierarchy(items: MasterCalendarItem[]): MasterCalendarItem[] {
  const byEventId = new Map<string, MasterCalendarItem[]>();
  const byPromiseId = new Map<string, MasterCalendarItem[]>();
  for (const item of items) {
    if (item.event_id) {
      const arr = byEventId.get(item.event_id) ?? [];
      arr.push(item);
      byEventId.set(item.event_id, arr);
    }
    if (item.promise_id) {
      const arr = byPromiseId.get(item.promise_id) ?? [];
      arr.push(item);
      byPromiseId.set(item.promise_id, arr);
    }
  }
  const hideIds = new Set<string>();
  for (const [, arr] of byEventId) {
    const hasEvent = arr.some((i) => i.type === 'EVENT');
    if (hasEvent) {
      for (const i of arr) {
        if (i.type === 'PROMISE' || i.type === 'AGENDA') hideIds.add(i.id);
      }
    }
  }
  for (const [, arr] of byPromiseId) {
    const hasEvent = arr.some((i) => i.type === 'EVENT');
    if (hasEvent) {
      for (const i of arr) {
        if (i.type === 'PROMISE') hideIds.add(i.id);
      }
    }
  }
  return items.filter((i) => !hideIds.has(i.id));
}

export interface CalendarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  userId?: string | null;
}

/** Solo AGENDA con hora real (no todo el día). Oculta 06:00/18:00 placeholder. */
function shouldShowTime(group: { items: MasterCalendarItem[] }): { show: boolean; timeStr: string | null } {
  const agendaWithTime = group.items.find(
    (i) => i.type === 'AGENDA' && hasSpecificTime(i)
  );
  if (!agendaWithTime) return { show: false, timeStr: null };
  const h = agendaWithTime.start_at.getHours();
  const m = agendaWithTime.start_at.getMinutes();
  if ((h === 0 && m === 0) || (h === 6 && m === 0) || (h === 18 && m === 0)) {
    return { show: false, timeStr: null };
  }
  return { show: true, timeStr: format(agendaWithTime.start_at, 'HH:mm', { locale: es }) };
}

function hasSpecificTime(item: MasterCalendarItem): boolean {
  const start = item.start_at;
  const startDay = startOfDay(start);
  const diffHours = (item.end_at.getTime() - item.start_at.getTime()) / (1000 * 60 * 60);
  return start.getTime() !== startDay.getTime() || diffHours < 24;
}

/** Hoy a medianoche en timezone local (evita desfase UTC) */
function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function MasterCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-12 shrink-0 rounded bg-zinc-800" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4 rounded bg-zinc-800" />
          <Skeleton className="h-3 w-1/2 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function CalendarDrawer({
  open,
  onOpenChange,
  studioSlug,
  userId,
}: CalendarDrawerProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayLocal);
  const [items, setItems] = useState<MasterCalendarItem[]>([]);
  const [schedulerStats, setSchedulerStats] = useState<Record<string, SchedulerTaskStats>>({});
  const [loading, setLoading] = useState(false);
  const [monthDate, setMonthDate] = useState<Date>(getTodayLocal);

  useEffect(() => {
    if (!open || !studioSlug) return;
    let cancelled = false;
    setLoading(true);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    obtenerCalendarioMaestro(studioSlug, start, end, {
      userId: userId ?? undefined,
    })
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data) {
          setItems(result.data.filter((i) => i.status !== 'cancelled'));
          setSchedulerStats(result.schedulerStats ?? {});
        } else {
          setItems([]);
          setSchedulerStats({});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setSchedulerStats({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, studioSlug, monthDate.getTime(), userId]);

  const deduplicatedItems = useMemo(() => deduplicateByHierarchy(items), [items]);

  const groupsForSelectedDay = useMemo(() => {
    const selDateStr = toDateOnlyStr(selectedDate);
    if (!selDateStr) return [];
    const dayItems = deduplicatedItems.filter((item) => {
      const itemStartStr = toDateOnlyStr(item.start_at);
      let itemEndStr = toDateOnlyStr(item.end_at);
      if (!itemStartStr || !itemEndStr) return false;
      const isAllDay = (item.end_at.getTime() - item.start_at.getTime()) >= 23 * 60 * 60 * 1000;
      if (isAllDay) itemEndStr = itemStartStr;
      return itemStartStr <= selDateStr && itemEndStr >= selDateStr;
    });
    const groups = groupItemsByClient(dayItems);
    const promiseIdsCoveredByEvent = new Set<string>();
    for (const g of groups) {
      if (g.items.some((i) => i.type === 'EVENT')) {
        const eventItem = g.items.find((i) => i.type === 'EVENT');
        if (eventItem?.promise_id) promiseIdsCoveredByEvent.add(eventItem.promise_id);
      }
    }
    return groups.filter((g) => {
      if (g.items.some((i) => i.type === 'EVENT')) return true;
      if (!g.promiseId) return true;
      return !promiseIdsCoveredByEvent.has(g.promiseId);
    });
  }, [deduplicatedItems, selectedDate]);

  /** Cuenta grupos por día en timezone del estudio. Semáforo: EVENT > PROMISE > Tasks. */
  const { daysWithGroupCount, daysWithEvent, daysWithPromise, daysWithTasks } = useMemo(() => {
    const countMap = new Map<string, number>();
    const eventSet = new Set<string>();
    const promiseSet = new Set<string>();
    const taskSet = new Set<string>();
    const groups = groupItemsByClient(deduplicatedItems);
    const promiseIdsCovered = new Set<string>();
    for (const g of groups) {
      if (g.items.some((i) => i.type === 'EVENT')) {
        const promiseId = g.items.find((i) => i.promise_id)?.promise_id;
        if (promiseId) promiseIdsCovered.add(promiseId);
      }
    }
    for (const g of groups) {
      const hasEvent = g.items.some((i) => i.type === 'EVENT');
      if (!hasEvent && g.promiseId && promiseIdsCovered.has(g.promiseId)) continue;
      const firstStart = g.items[0]?.start_at;
      const lastEnd = g.items.reduce((max, i) => (i.end_at > max ? i.end_at : max), g.items[0]!.end_at);
      const hasPromise = g.items.some((i) => i.type === 'PROMISE');
      const hasTasks = !hasEvent && !hasPromise && g.items.length > 0;
      if (!firstStart) continue;
      let firstDayStr = toDateOnlyStr(firstStart);
      let lastDayStr = toDateOnlyStr(lastEnd);
      if (!firstDayStr || !lastDayStr) continue;
      const isAllDay = (lastEnd.getTime() - firstStart.getTime()) >= 23 * 60 * 60 * 1000;
      if (isAllDay) lastDayStr = firstDayStr;
      let key = firstDayStr;
      while (key <= lastDayStr) {
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
        if (hasEvent) eventSet.add(key);
        else if (hasPromise) promiseSet.add(key);
        else if (hasTasks) taskSet.add(key);
        const nextDate = parseDateOnlyToUtc(key);
        if (!nextDate) break;
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        key = dateToDateOnlyString(nextDate) ?? key;
      }
    }
    return { daysWithGroupCount: countMap, daysWithEvent: eventSet, daysWithPromise: promiseSet, daysWithTasks: taskSet };
  }, [deduplicatedItems]);

  const handleDaySelect = (date: Date | undefined) => {
    if (date) setSelectedDate(date);
  };

  const selectedDateStr = toDateOnlyStr(selectedDate);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setExpandedKeys(new Set(groupsForSelectedDay.map((g) => g.key)));
  }, [selectedDateStr, groupsForSelectedDay]);

  const handleMonthChange = (date: Date) => {
    setMonthDate(date);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayStyle={{ zIndex: 100 }}
        className={cn(
          'flex flex-col w-full sm:max-w-md p-0 gap-0 !z-[100]',
          'max-w-full sm:max-w-md',
          'bg-zinc-950 border-l border-zinc-800'
        )}
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-zinc-800 bg-zinc-950">
          <SheetTitle className="text-sm font-semibold text-zinc-100">Calendario</SheetTitle>
          <SheetDescription className="text-xs text-zinc-400">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 overflow-hidden bg-zinc-950">
          {/* Calendario compacto */}
          <div className="border-b border-zinc-800 shrink-0 bg-zinc-950 text-sm">
            <ZenCalendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDaySelect}
              month={monthDate}
              onMonthChange={handleMonthChange}
              captionLayout="dropdown"
              fromYear={new Date().getFullYear() - 1}
              toYear={new Date().getFullYear() + 1}
              components={{
                DayButton: ({ day, ...rest }) => {
                  const dateStr = toDateOnlyStr(day.date) ?? dateToDateOnlyString(toUtcDateOnly(day.date) ?? day.date) ?? '';
                  const count = daysWithGroupCount.get(dateStr) ?? 0;
                  const hasEvent = daysWithEvent.has(dateStr);
                  const hasPromise = daysWithPromise.has(dateStr);
                  const hasTasks = daysWithTasks.has(dateStr);
                  const ringColor = hasEvent ? 'emerald' : hasPromise ? 'amber' : 'zinc';
                  const dots: string[] = [];
                  if (hasEvent) dots.push('bg-emerald-500');
                  if (hasPromise) dots.push('bg-amber-500');
                  if (hasTasks) dots.push('bg-zinc-500');
                  return (
                    <ZenCalendarDayButton
                      day={day}
                      {...rest}
                      className={cn(
                        rest.className,
                        '[&[data-selected=true]]:ring-2 [&[data-selected=true]]:ring-inset',
                        ringColor === 'emerald' && '[&[data-selected=true]]:ring-emerald-500',
                        ringColor === 'amber' && '[&[data-selected=true]]:ring-amber-500',
                        ringColor === 'zinc' && '[&[data-selected=true]]:ring-zinc-500'
                      )}
                    >
                      <span className="flex flex-col items-center justify-center w-full">
                        <span className="leading-none">{day.date.getDate()}</span>
                        {count > 0 && dots.length > 0 && (
                          <span className="flex items-center justify-center gap-0.5 mt-1 w-full min-h-[4px]">
                            {dots.slice(0, 3).map((c, i) => (
                              <span key={i} className={cn('size-1 rounded-full shrink-0', c)} />
                            ))}
                          </span>
                        )}
                      </span>
                    </ZenCalendarDayButton>
                  );
                },
              }}
              className="w-full"
            />
          </div>

          {/* Lista de actividades del día */}
          <div className="flex-1 overflow-y-auto bg-zinc-950 text-sm">
            {loading ? (
              <ul className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <MasterCardSkeleton key={i} />
                ))}
              </ul>
            ) : groupsForSelectedDay.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-8">
                No hay actividades para este día
              </p>
            ) : (
              <ul className="space-y-2">
                {groupsForSelectedDay.map((group) => (
                  <MasterCard
                    key={group.key}
                    group={group}
                    studioSlug={studioSlug}
                    schedulerStats={schedulerStats}
                    selectedDate={selectedDate}
                    selectedDateStr={toDateOnlyStr(selectedDate)}
                    isOpen={expandedKeys.has(group.key)}
                    onOpenChange={(open) =>
                      setExpandedKeys((prev) => {
                        const next = new Set(prev);
                        if (open) next.add(group.key);
                        else next.delete(group.key);
                        return next;
                      })
                    }
                    onNavigate={() => onOpenChange(false)}
                    router={router}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface MasterCardProps {
  group: { key: string; items: MasterCalendarItem[]; eventId: string | null; promiseId: string | null };
  studioSlug: string;
  schedulerStats: Record<string, SchedulerTaskStats>;
  selectedDate: Date;
  selectedDateStr: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: () => void;
  router: ReturnType<typeof useRouter>;
}

/** Recordatorios del grupo ordenados por start_at, máximo 2 */
function getUpcomingReminders(items: MasterCalendarItem[]): MasterCalendarItem[] {
  return items
    .filter((i) => i.type === 'REMINDER' || i.type === 'SCHEDULER_REMINDER')
    .sort((a, b) => a.start_at.getTime() - b.start_at.getTime())
    .slice(0, 2);
}

/** Tareas del grupo (SCHEDULER_TASK, EVENT_TASK) para mostrar nombre completo al expandir */
function getTaskItems(items: MasterCalendarItem[]): MasterCalendarItem[] {
  return items.filter((i) => i.type === 'SCHEDULER_TASK' || i.type === 'EVENT_TASK');
}

function MasterCard({ group, studioSlug, schedulerStats, selectedDate, selectedDateStr, isOpen, onOpenChange, onNavigate, router }: MasterCardProps) {
  const { main, secondary } = formatGroupTitles(group);
  const { show: showTime, timeStr } = shouldShowTime(group);

  const firstItem = group.items[0]!;
  const meta = (firstItem.metadata ?? {}) as Record<string, unknown>;
  const stats = group.eventId ? schedulerStats[group.eventId] : null;
  const completed = stats?.completed ?? 0;
  const totalTasks = stats?.total ?? 0;
  const reminders = getUpcomingReminders(group.items);
  const taskItems = getTaskItems(group.items);
  const taskCount = totalTasks || taskItems.length;
  const reminderCount = reminders.length;
  const citasCount = group.items.filter((i) => i.type === 'AGENDA').length;

  const todayStr = toDateOnlyStr(new Date());
  const showHoyBadge = !!selectedDateStr && selectedDateStr === todayStr;

  const eventPath = group.eventId ? `/${studioSlug}/studio/business/events/${group.eventId}` : null;
  const promisePath = group.promiseId ? `/${studioSlug}/studio/commercial/promises/${group.promiseId}` : null;

  const handleAction = (path: string) => {
    onOpenChange(false);
    onNavigate();
    router.push(path);
  };

  /** Prioridad por TIPO: EVENT (verde) > PROMISE (ámbar) > tareas (zinc). */
  const hasEvent = group.items.some((i) => i.type === 'EVENT');
  const hasPromise = group.items.some((i) => i.type === 'PROMISE');
  const focusRingColor = hasEvent ? 'focus:ring-emerald-500/50' : hasPromise ? 'focus:ring-amber-500/50' : 'focus:ring-zinc-500/40';
  const buttonText = hasEvent ? 'Gestionar Evento' : hasPromise ? 'Gestionar Promesa' : 'Gestionar';

  const eventItem = group.items.find((i) => i.type === 'EVENT');
  const promiseItem = group.items.find((i) => i.type === 'PROMISE');
  const sourceForComment = eventItem ?? promiseItem;
  const metaExt = (sourceForComment?.metadata ?? {}) as Record<string, unknown>;
  const promiseMeta = (promiseItem?.metadata ?? {}) as Record<string, unknown>;
  const quoteCount = promiseMeta.quote_count as number | undefined;
  const pipelineStageName = promiseMeta.pipeline_stage_name as string | undefined;

  const metadataParts: React.ReactNode[] = [];
  if (secondary) {
    metadataParts.push(
      <span key="contact" className="flex items-center gap-1 shrink-0">
        <User size={12} className="text-zinc-500" />
        <span className="truncate">{secondary}</span>
      </span>
    );
  }
  if (hasPromise && quoteCount != null && quoteCount > 0) {
    metadataParts.push(
      <span key="quotes" className="flex items-center gap-1 shrink-0 text-amber-400">
        <Briefcase size={12} />
        <span>{quoteCount} Cotización{quoteCount !== 1 ? 'es' : ''}</span>
      </span>
    );
  }
  if (hasPromise && pipelineStageName) {
    metadataParts.push(
      <span key="stage" className="shrink-0 text-amber-400">
        {pipelineStageName}
      </span>
    );
  }
  if (taskCount > 0) {
    metadataParts.push(
      <span key="tasks" className="flex items-center gap-1 shrink-0 text-amber-400">
        <Briefcase size={12} />
        <span>{taskCount} Tarea{taskCount !== 1 ? 's' : ''}</span>
      </span>
    );
  }
  if (reminderCount > 0) {
    metadataParts.push(
      <span key="reminders" className="flex items-center gap-1 shrink-0">
        <Bell size={12} className="text-zinc-500" />
        <span>{reminderCount} Recs</span>
      </span>
    );
  }

  const lastComment = metaExt.last_comment as string | undefined;
  const lastCommentCreatedAt = metaExt.last_comment_created_at as string | undefined;
  const paidAmount = metaExt.paid_amount as number | undefined;
  const pendingAmount = metaExt.pending_amount as number | undefined;
  const hasFinancials = (paidAmount != null && paidAmount > 0) || (pendingAmount != null && pendingAmount > 0);
  const borderColor = hasEvent ? 'border-l-emerald-500' : hasPromise ? 'border-l-amber-500' : 'border-l-zinc-500';
  return (
    <li>
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div
          className={cn(
            'border transition-colors border-zinc-800 border-l-2',
            borderColor
          )}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full text-left p-3 transition-colors',
                'bg-zinc-900/50 hover:bg-zinc-800/50',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950',
                focusRingColor,
                'data-[state=open]:focus:ring-0 data-[state=open]:focus:ring-offset-0',
                'flex items-start gap-2'
              )}
            >
              {showTime && timeStr && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0 mt-0.5">
                  <Clock className="size-3.5 text-zinc-500" />
                  {timeStr}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-100 truncate">{main}</p>
                {metadataParts.length > 0 && (
                  <p className="text-[11px] text-zinc-500 flex items-center gap-2 mt-1.5 truncate">
                    {metadataParts.reduce<React.ReactNode[]>((acc, part, i) => {
                      if (i > 0) acc.push(<span key={`sep-${i}`} className="text-zinc-600 shrink-0">•</span>);
                      acc.push(part);
                      return acc;
                    }, [])}
                  </p>
                )}
              </div>
              <ChevronDown
                className={cn('size-4 shrink-0 text-zinc-500 transition-transform', isOpen && 'rotate-180')}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-4 border-t border-zinc-800/50 space-y-3">
              {showHoyBadge && (
                <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Programada para hoy
                </span>
              )}
              <div className="space-y-3">
                <div className="space-y-2 text-sm text-zinc-400 min-w-0">
                  {lastComment && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="size-4 shrink-0 text-zinc-500 mt-0.5" />
                      <p className="text-zinc-300 line-clamp-3 flex items-baseline gap-1.5 flex-wrap">
                        <span>{lastComment.replace(/^(Evento creado:\s*|Promesa:\s*)/i, '')}</span>
                        {lastCommentCreatedAt && (
                          <span className="shrink-0 text-[11px] leading-none text-zinc-500">
                            Último comentario: {formatDateTime(lastCommentCreatedAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {hasFinancials && (
                    <div className="flex items-center gap-2">
                      <Banknote className="size-4 shrink-0 text-zinc-500" />
                      <span>
                        {paidAmount != null && paidAmount > 0 && (
                          <span className="text-emerald-400">Pagado ${paidAmount.toLocaleString('es-MX')}</span>
                        )}
                        {paidAmount != null && paidAmount > 0 && pendingAmount != null && pendingAmount > 0 && ' • '}
                        {pendingAmount != null && pendingAmount > 0 && (
                          <span className="text-amber-400">Pendiente ${pendingAmount.toLocaleString('es-MX')}</span>
                        )}
                        {paidAmount == null && pendingAmount != null && pendingAmount > 0 && (
                          <span className="text-amber-400">Pendiente ${pendingAmount.toLocaleString('es-MX')}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {totalTasks > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span>{completed} de {totalTasks} tareas completadas</span>
                    </div>
                  )}
                  {(reminderCount > 0 || citasCount > 0) && (
                    <div className="flex items-center gap-3">
                      {reminderCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Bell className="size-4 text-zinc-500" />
                          {reminderCount} Recordatorio{reminderCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {citasCount > 0 && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-4 text-zinc-500" />
                          {citasCount} Cita{citasCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {(eventPath || promisePath) && (
                  <ZenButton
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 h-7 px-2.5 text-xs border-zinc-600 hover:bg-zinc-800/50 text-zinc-200 hover:text-zinc-100"
                    onClick={() => handleAction(eventPath ?? promisePath!)}
                  >
                    <span>{buttonText}</span>
                    <ArrowUpRight className="size-4 shrink-0" />
                  </ZenButton>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </li>
  );
}
