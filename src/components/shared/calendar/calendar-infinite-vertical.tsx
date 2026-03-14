'use client';

/**
 * Infinite Vertical Calendar - Optimizado para velocidad y móviles.
 * Plan: .cursor/docs/plans/01-calendar-unification-master-plan.md
 * - Scroll vertical continuo con meses apilados
 * - Sticky headers mes/año
 * - Virtualización con virtua
 * - fetchDots (ligero) + fetchDayDetails (on demand)
 * - Bottom Sheet móvil para agenda del día
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, getDaysInMonth, getDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { VList } from 'virtua';
import { Clock, CalendarDays, ChevronDown, CheckCircle2, Bell, ArrowUpRight, User, Briefcase, Banknote, MessageSquare, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toUtcDateOnly, dateToDateOnlyString } from '@/lib/utils/date-only';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenButton } from '@/components/ui/zen';
import { obtenerCalendarioDots, obtenerCalendarioMaestro } from '@/lib/actions/shared/calendar-maestro.actions';
import type {
  MasterCalendarItem,
  CalendarItemType,
  SchedulerTaskStats,
} from '@/lib/actions/shared/calendar-maestro.actions';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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

function toDateOnlyStr(date: Date | string): string | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  const normalized = toUtcDateOnly(d);
  return normalized ? dateToDateOnlyString(normalized) : null;
}

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
  if (hasEventPrincipal) return { main: prefix, secondary: contactName };
  if (taskItems.length > 0) {
    const taskNames = taskItems.map((t) => ((t.metadata as Record<string, unknown>)?.title as string) || 'Tarea');
    return { main: `${prefix}: ${taskNames.join(', ')}`, secondary: contactName };
  }
  return { main: prefix, secondary: contactName };
}

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
    if (arr.some((i) => i.type === 'EVENT')) {
      for (const i of arr) {
        if (i.type === 'PROMISE' || i.type === 'AGENDA') hideIds.add(i.id);
      }
    }
  }
  for (const [, arr] of byPromiseId) {
    if (arr.some((i) => i.type === 'EVENT')) {
      for (const i of arr) {
        if (i.type === 'PROMISE') hideIds.add(i.id);
      }
    }
  }
  return items.filter((i) => !hideIds.has(i.id));
}

function getUpcomingReminders(items: MasterCalendarItem[]): MasterCalendarItem[] {
  return items
    .filter((i) => i.type === 'REMINDER' || i.type === 'SCHEDULER_REMINDER')
    .sort((a, b) => a.start_at.getTime() - b.start_at.getTime())
    .slice(0, 2);
}

function hasSpecificTime(item: MasterCalendarItem): boolean {
  const start = item.start_at;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diffHours = (item.end_at.getTime() - item.start_at.getTime()) / (1000 * 60 * 60);
  return start.getTime() !== startDay.getTime() || diffHours < 24;
}

function shouldShowTime(group: { items: MasterCalendarItem[] }): { show: boolean; timeStr: string | null } {
  const agendaWithTime = group.items.find((i) => i.type === 'AGENDA' && hasSpecificTime(i));
  if (!agendaWithTime) return { show: false, timeStr: null };
  const h = agendaWithTime.start_at.getHours();
  const m = agendaWithTime.start_at.getMinutes();
  if ((h === 0 && m === 0) || (h === 6 && m === 0) || (h === 18 && m === 0)) return { show: false, timeStr: null };
  return { show: true, timeStr: format(agendaWithTime.start_at, 'HH:mm', { locale: es }) };
}

function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

export interface CalendarInfiniteVerticalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  userId?: string | null;
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

/** Skeleton del header del calendario (año, meses, título, fecha, botón) mientras se posiciona. */
function CalendarHeaderSkeleton() {
  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-1.5 p-4" aria-hidden>
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 shrink-0 rounded bg-zinc-800" />
        <Skeleton className="h-7 w-16 rounded bg-zinc-800" />
        <Skeleton className="h-7 w-7 shrink-0 rounded bg-zinc-800" />
        <div className="flex-1 flex gap-1 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-9 shrink-0 rounded bg-zinc-800/80" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-0 pb-0">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24 rounded bg-zinc-800" />
          <Skeleton className="h-3 w-40 rounded bg-zinc-800/80" />
        </div>
        <Skeleton className="h-7 w-20 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

/** Skeleton para el área del listado de meses mientras se posiciona al mes actual (evita flash enero → marzo). */
function CalendarListSkeleton() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-zinc-950 p-3 space-y-4" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32 rounded bg-zinc-800" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, j) => (
              <Skeleton key={j} className="aspect-square rounded bg-zinc-800/80" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MasterCardProps {
  group: { key: string; items: MasterCalendarItem[]; eventId: string | null; promiseId: string | null };
  studioSlug: string;
  schedulerStats: Record<string, SchedulerTaskStats>;
  selectedDateStr: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: () => void;
  router: ReturnType<typeof useRouter>;
}

function MasterCard({ group, studioSlug, schedulerStats, selectedDateStr, isOpen, onOpenChange, onNavigate, router }: MasterCardProps) {
  const { main, secondary } = formatGroupTitles(group);
  const { show: showTime, timeStr } = shouldShowTime(group);
  const firstItem = group.items[0]!;
  const meta = (firstItem.metadata ?? {}) as Record<string, unknown>;
  const stats = group.eventId ? schedulerStats[group.eventId] : null;
  const completed = stats?.completed ?? 0;
  const totalTasks = stats?.total ?? 0;
  const reminders = getUpcomingReminders(group.items);
  const taskItems = group.items.filter((i) => i.type === 'SCHEDULER_TASK' || i.type === 'EVENT_TASK');
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
    metadataParts.push(<span key="stage" className="shrink-0 text-amber-400">{pipelineStageName}</span>);
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
        <div className={cn('border transition-colors border-zinc-800 border-l-2', borderColor)}>
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
              <ChevronDown className={cn('size-4 shrink-0 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-4 border-t border-zinc-800/50 space-y-3">
            {showHoyBadge && (
              <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">Programada para hoy</span>
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
                      {paidAmount != null && paidAmount > 0 && <span className="text-emerald-400">Pagado ${paidAmount.toLocaleString('es-MX')}</span>}
                      {paidAmount != null && paidAmount > 0 && pendingAmount != null && pendingAmount > 0 && ' • '}
                      {pendingAmount != null && pendingAmount > 0 && <span className="text-amber-400">Pendiente ${pendingAmount.toLocaleString('es-MX')}</span>}
                      {paidAmount == null && pendingAmount != null && pendingAmount > 0 && <span className="text-amber-400">Pendiente ${pendingAmount.toLocaleString('es-MX')}</span>}
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
                    {reminderCount > 0 && <span className="flex items-center gap-1"><Bell className="size-4 text-zinc-500" />{reminderCount} Recordatorio{reminderCount !== 1 ? 's' : ''}</span>}
                    {citasCount > 0 && <span className="flex items-center gap-1"><CalendarDays className="size-4 text-zinc-500" />{citasCount} Cita{citasCount !== 1 ? 's' : ''}</span>}
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

function MonthItem({
  monthIndex,
  year,
  dots,
  selectedDate,
  onSelect,
  onVisible,
}: {
  monthIndex: number;
  year: number;
  dots: Record<string, { event: boolean; promise: boolean; tasks: boolean }>;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onVisible: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(monthIndex);
        }
      },
      {
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [monthIndex, onVisible]);

  const monthStart = new Date(year, monthIndex, 1);
  const daysInMonth = getDaysInMonth(monthStart);
  const firstDayOfWeek = getDay(monthStart);
  const emptyCells = firstDayOfWeek;
  const todayStr = toDateOnlyStr(new Date());

  return (
    <div ref={ref} className="p-3 bg-zinc-950" data-month-index={monthIndex}>
      <div className="sticky top-0 z-10 bg-zinc-950 py-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800/50 mb-2">
        {format(monthStart, 'MMMM yyyy', { locale: es })}
      </div>
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((d) => (
          <span key={d} className="text-[10px] text-zinc-500 py-1">
            {d}
          </span>
        ))}
        {Array.from({ length: emptyCells }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square" aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = new Date(year, monthIndex, i + 1);
          const dateStr = dateToDateOnlyString(toUtcDateOnly(day)) ?? '';
          const dot = dots[dateStr];
          const hasEvent = dot?.event ?? false;
          const hasPromise = dot?.promise ?? false;
          const hasTasks = dot?.tasks ?? false;
          const ringColor = hasEvent ? 'emerald' : hasPromise ? 'amber' : 'zinc';
          const dotDots: string[] = [];
          if (hasEvent) dotDots.push('bg-emerald-500');
          if (hasPromise) dotDots.push('bg-amber-500');
          if (hasTasks) dotDots.push('bg-zinc-500');
          const isSelected = isSameDay(day, selectedDate);
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'aspect-square rounded flex flex-col items-center justify-center text-xs transition-colors text-zinc-200',
                isSelected && 'ring-2 ring-inset',
                ringColor === 'emerald' && isSelected && 'ring-emerald-500 bg-emerald-500/20',
                ringColor === 'amber' && isSelected && 'ring-amber-500 bg-amber-500/20',
                ringColor === 'zinc' && isSelected && 'ring-zinc-500 bg-zinc-500/20',
                dateStr === todayStr && !isSelected && 'font-bold text-emerald-400'
              )}
            >
              <span>{i + 1}</span>
              {dotDots.length > 0 && (
                <span className="flex gap-0.5 mt-0.5">
                  {dotDots.slice(0, 3).map((c, idx) => (
                    <span key={idx} className={cn('size-1 rounded-full', c)} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarInfiniteVertical({
  open,
  onOpenChange,
  studioSlug,
  userId,
}: CalendarInfiniteVerticalProps) {
  const router = useRouter();
  const listRef = useRef<{ scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void } | null>(null);
  const targetMonthRef = useRef<number>(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayLocal);
  const [dots, setDots] = useState<Record<string, { event: boolean; promise: boolean; tasks: boolean }>>({});
  const [fetchedMonths, setFetchedMonths] = useState<Set<string>>(new Set());
  const fetchingMonthsRef = useRef<Set<string>>(new Set());
  const [dayItems, setDayItems] = useState<MasterCalendarItem[]>([]);
  const [schedulerStats, setSchedulerStats] = useState<Record<string, SchedulerTaskStats>>({});
  const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [listPositioned, setListPositioned] = useState(false);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState(currentYear);
  const [scrollMonthIndex, setScrollMonthIndex] = useState(new Date().getMonth());

  // Al abrir: fijar mes actual en ref (única fuente para scroll), reset estado, skeleton hasta posicionar (10.05: UI fecha local)
  useEffect(() => {
    if (open) {
      const now = new Date();
      targetMonthRef.current = now.getMonth();
      setDayPanelOpen(false);
      setListPositioned(false);
      setYear(now.getFullYear());
      setScrollMonthIndex(now.getMonth());
      setSelectedDate(now);
    }
  }, [open]);

  const fetchDotsForRange = useCallback(async (targetYear: number, monthIndex: number) => {
    if (!studioSlug) return;
    const monthKey = `${targetYear}-${monthIndex}`;
    if (fetchedMonths.has(monthKey) || fetchingMonthsRef.current.has(monthKey)) return;

    fetchingMonthsRef.current.add(monthKey);
    // Fetch current month, prev and next to ensure smooth scrolling
    // Actually, let's fetch a chunk of 3 months around the target
    // But to avoid complexity, let's just fetch the specific month requested + buffer if needed
    // Better: fetch 3 months at a time if not fetched
    
    // Let's fetch the target month.
    const start = new Date(targetYear, monthIndex, 1);
    const end = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59);
    
    try {
      const r = await obtenerCalendarioDots(studioSlug, { start, end }, { userId: userId ?? undefined });
      if (r.success && r.dots) {
        setDots((prev) => ({ ...prev, ...r.dots }));
        setFetchedMonths((prev) => {
          const next = new Set(prev);
          next.add(monthKey);
          return next;
        });
      }
    } finally {
      fetchingMonthsRef.current.delete(monthKey);
    }
  }, [studioSlug, userId, fetchedMonths]);

  // Fetch dots for visible month and neighbors
  useEffect(() => {
    if (!open) return;
    // Fetch visible month and neighbors (prev, next)
    const monthsToFetch = [scrollMonthIndex - 1, scrollMonthIndex, scrollMonthIndex + 1];
    monthsToFetch.forEach((m) => {
      if (m >= 0 && m <= 11) {
        fetchDotsForRange(year, m);
      }
    });
  }, [open, year, scrollMonthIndex, fetchDotsForRange]);

  // Scroll estable al mes actual: mes fijado en targetMonthRef al abrir; varios pases con rAF + delays; revelar solo al final
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const scrollToTarget = () => {
      const idx = targetMonthRef.current;
      if (listRef.current && idx >= 0 && idx <= 11) listRef.current.scrollToIndex(idx, { align: 'start' });
    };
    const run = (attempt = 0) => {
      if (cancelled) return;
      if (!listRef.current) {
        if (attempt < 20) timeouts.push(setTimeout(() => run(attempt + 1), 60 + attempt * 40));
        return;
      }
      requestAnimationFrame(() => {
        if (cancelled) return;
        scrollToTarget();
        [120, 280, 480, 720].forEach((delay, i) => {
          timeouts.push(setTimeout(() => {
            if (cancelled) return;
            requestAnimationFrame(() => {
              if (!cancelled) scrollToTarget();
            });
          }, delay));
        });
        timeouts.push(setTimeout(() => {
          if (cancelled) return;
          scrollToTarget();
          timeouts.push(setTimeout(() => {
            if (!cancelled) {
              setScrollMonthIndex(targetMonthRef.current);
              setListPositioned(true);
            }
          }, 220));
        }, 920));
      });
    };
    timeouts.push(setTimeout(() => run(), 520));
    timeouts.push(setTimeout(() => {
      if (!cancelled) setListPositioned(true);
    }, 3500));
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [open]);

  const fetchDayDetails = useCallback(async (date: Date) => {
    if (!studioSlug) return;
    setDayDetailsLoading(true);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    const result = await obtenerCalendarioMaestro(studioSlug, start, end, { userId: userId ?? undefined });
    setDayDetailsLoading(false);
    if (result.success && result.data) {
      const dateStr = toDateOnlyStr(date);
      if (!dateStr) return;
      const dayItemsFiltered = result.data
        .filter((i) => i.status !== 'cancelled')
        .filter((item) => {
          const itemStartStr = toDateOnlyStr(item.start_at);
          let itemEndStr = toDateOnlyStr(item.end_at);
          if (!itemStartStr || !itemEndStr) return false;
          const isAllDay = (item.end_at.getTime() - item.start_at.getTime()) >= 23 * 60 * 60 * 1000;
          if (isAllDay) itemEndStr = itemStartStr;
          return itemStartStr <= dateStr && itemEndStr >= dateStr;
        });
      setDayItems(dayItemsFiltered);
      setSchedulerStats(result.schedulerStats ?? {});
    } else {
      setDayItems([]);
      setSchedulerStats({});
    }
  }, [studioSlug, userId]);

  // Solo cargar detalles del día cuando el usuario hace click (panel abierto), no al abrir el sheet
  useEffect(() => {
    if (!open || !studioSlug || !dayPanelOpen) return;
    fetchDayDetails(selectedDate);
  }, [open, studioSlug, dayPanelOpen, selectedDate.getTime(), fetchDayDetails]);

  const deduplicatedItems = useMemo(() => deduplicateByHierarchy(dayItems), [dayItems]);

  const groupsForSelectedDay = useMemo(() => {
    const selDateStr = toDateOnlyStr(selectedDate);
    if (!selDateStr) return [];
    const groups = groupItemsByClient(deduplicatedItems);
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

  const handleDaySelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setDayPanelOpen(true);
  }, []);

  const handleVisibleMonth = useCallback((index: number) => {
    if (listPositioned) {
      setScrollMonthIndex(index);
    }
  }, [listPositioned]);

  const scrollToMonth = useCallback((monthIndex: number) => {
    setScrollMonthIndex(monthIndex);
    listRef.current?.scrollToIndex(monthIndex, { align: 'start' });
  }, []);

  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        overlayStyle={{ zIndex: 100 }}
        className={cn(
          'flex flex-col w-full !z-[100] h-screen',
          isMobile ? 'max-h-[90vh] rounded-t-xl' : 'max-w-full sm:max-w-md border-l',
          'bg-zinc-950 border-zinc-800'
        )}
      >
        {listPositioned ? (
          <SheetHeader className="shrink-0 border-b border-zinc-800 bg-zinc-950 py-2">
            {/* Navbar: Selector año/mes + scroll al mes */}
            <div className="flex items-center gap-2 px-4 py-1.5">
              <ZenButton
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => { setYear((y) => y - 1); scrollToMonth(0); }}
              >
                <ChevronLeft className="size-4" />
              </ZenButton>
              <select
                value={year}
                onChange={(e) => { setYear(Number(e.target.value)); scrollToMonth(0); }}
                className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ZenButton
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => { setYear((y) => y + 1); scrollToMonth(0); }}
              >
                <ChevronRight className="size-4" />
              </ZenButton>
              <div className="flex-1 flex gap-1 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                {MONTHS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => scrollToMonth(m)}
                    className={cn(
                      'shrink-0 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors',
                      scrollMonthIndex === m ? 'bg-emerald-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {format(new Date(year, m, 1), 'MMM', { locale: es })}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pb-1.5 flex items-center justify-between gap-2">
              <div>
                <SheetTitle className="text-sm font-semibold text-zinc-100">Calendario</SheetTitle>
                <SheetDescription className="text-xs text-zinc-400">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </SheetDescription>
              </div>
              <ZenButton
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                onClick={() => {
                  const today = new Date();
                  const currentMonth = today.getMonth();
                  setYear(today.getFullYear());
                  scrollToMonth(currentMonth);
                  handleDaySelect(today);
                }}
              >
                Ir a Hoy
              </ZenButton>
            </div>
          </SheetHeader>
        ) : (
          <>
            <VisuallyHidden>
              <SheetTitle>Calendario</SheetTitle>
            </VisuallyHidden>
            <CalendarHeaderSkeleton />
          </>
        )}

        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Calendario virtualizado; skeleton hasta posicionar en mes actual (evita flash enero → marzo) */}
          <div className="flex-1 min-h-0 bg-zinc-950 relative">
            {open && !listPositioned && <CalendarListSkeleton />}
            <VList
              ref={listRef as React.RefObject<unknown>}
              data={MONTHS}
              style={{ height: '100%', width: '100%' }}
            >
              {(monthIndex) => (
                <MonthItem
                  monthIndex={monthIndex}
                  year={year}
                  dots={dots}
                  selectedDate={selectedDate}
                  onSelect={handleDaySelect}
                  onVisible={handleVisibleMonth}
                />
              )}
            </VList>

            {/* Slide-over Panel: visible al hacer click en un día; skeleton mientras carga */}
            {dayPanelOpen && (
              <div className="absolute inset-0 z-20 bg-zinc-950 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
                  <button
                    onClick={() => setDayPanelOpen(false)}
                    className="p-1 -ml-1 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {dayDetailsLoading ? (
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
                    groupsForSelectedDay.map((group) => (
                      <MasterCard
                        key={group.key}
                        group={group}
                        studioSlug={studioSlug}
                        schedulerStats={schedulerStats}
                        selectedDateStr={toDateOnlyStr(selectedDate)}
                        isOpen={expandedKey === group.key}
                        onOpenChange={(open) => setExpandedKey(open ? group.key : null)}
                        onNavigate={() => onOpenChange(false)}
                        router={router}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
