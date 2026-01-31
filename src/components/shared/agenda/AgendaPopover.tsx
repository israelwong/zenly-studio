'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CalendarDays, Handshake, Video, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZenButton } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuTrigger,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { AgendaUnifiedSheet } from './AgendaUnifiedSheet';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

/**
 * Filtra items para el header: excluye event_date (fechas de promesa sin cita), ordena y toma los 6 próximos.
 * Retrocompatibilidad: si un registro antiguo no tiene metadata.agenda_type, se deduce por contexto + type_scheduling
 * (promise + type_scheduling → cita comercial; evento → evento/cita evento).
 */
function filterAgendaForHeader(items: AgendaItem[]): AgendaItem[] {
  const now = new Date();
  return items
    .filter((item) => {
      const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
      if (itemDate < now) return false;
      const metadata = item.metadata as Record<string, unknown> | null;
      const agendaType = metadata?.agenda_type as string | undefined;
      if (agendaType === 'event_date') return false;
      // Fallback: registros sin metadata → excluir promise sin type_scheduling; incluir resto
      if (!agendaType && item.contexto === 'promise' && !item.type_scheduling) return false;
      if (item.contexto === 'promise' && item.type_scheduling) return true;
      if (item.contexto === 'evento') return true;
      return false;
    })
    .sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return dateA - dateB;
    })
    .slice(0, 6);
}

interface AgendaPopoverProps {
  studioSlug: string;
  initialEvents?: AgendaItem[];
  initialCount?: number;
  onAgendaClick?: () => void;
}

export function AgendaPopover({
  studioSlug,
  initialEvents = [],
  initialCount = 0,
  onAgendaClick,
}: AgendaPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [events, setEvents] = useState<AgendaItem[]>(initialEvents.slice(0, 6));

  useEffect(() => {
    setEvents(initialEvents.slice(0, 6));
  }, [initialEvents]);

  const loadEvents = useCallback(async () => {
    const result = await obtenerAgendaUnificada(studioSlug, { filtro: 'all', startDate: new Date() });
    if (result.success && result.data) {
      setEvents(filterAgendaForHeader(result.data));
    }
  }, [studioSlug]);

  useEffect(() => {
    const handler = () => {
      loadEvents();
    };
    window.addEventListener('agenda-updated', handler);
    return () => window.removeEventListener('agenda-updated', handler);
  }, [loadEvents]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const count = initialCount;

  const handleEventClick = (event: AgendaItem) => {
    if (event.promise_id && !event.evento_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${event.promise_id}`);
    } else if (event.evento_id && event.promise_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${event.promise_id}/eventos/${event.evento_id}`);
    } else if (event.promise_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${event.promise_id}`);
    }
    setOpen(false);
  };

  const handleViewAll = () => {
    setOpen(false);
    if (onAgendaClick) {
      onAgendaClick();
    } else {
      setSheetOpen(true);
    }
  };

  if (!isMounted) {
    return (
      <ZenButton
        variant="ghost"
        size="icon"
        className="relative rounded-full text-zinc-400 hover:text-zinc-200"
        title="Agendamientos"
        disabled
      >
        <Calendar className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
        <span className="sr-only">Agendamientos</span>
      </ZenButton>
    );
  }

  return (
    <>
      <ZenDropdownMenu open={open} onOpenChange={setOpen}>
        <ZenDropdownMenuTrigger asChild>
          <ZenButton
            variant="ghost"
            size="icon"
            className="relative rounded-full text-zinc-400 hover:text-zinc-200"
            title="Agendamientos"
          >
            <Calendar className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
            <span className="sr-only">Agendamientos</span>
          </ZenButton>
        </ZenDropdownMenuTrigger>
        <ZenDropdownMenuContent
          align="end"
          className="w-80 max-h-[500px] flex flex-col p-0"
        >
          <div className="px-3 py-2 border-b border-zinc-700 flex-shrink-0">
            <h3 className="text-sm font-semibold text-zinc-200">Agendamientos</h3>
            {count > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                {count} {count === 1 ? 'agendamiento próximo' : 'agendamientos próximos'}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {events.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-zinc-400">
                No hay agendamientos próximos
              </div>
            ) : (
              <div className="py-1">
                {events.map((event) => (
                  <AgendaEventItem
                    key={event.id}
                    event={event}
                    open={open}
                    onEventClick={handleEventClick}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-zinc-700">
            <div className="px-3 py-2">
              <button
                onClick={handleViewAll}
                className="text-xs text-zinc-400 hover:text-zinc-200 w-full text-left transition-colors"
              >
                Abrir agendamientos
              </button>
            </div>
          </div>
        </ZenDropdownMenuContent>
      </ZenDropdownMenu>
      {!onAgendaClick && (
        <AgendaUnifiedSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

// Componente separado para cada evento con tiempo relativo dinámico
function AgendaEventItem({
  event,
  open,
  onEventClick,
}: {
  event: AgendaItem;
  open: boolean;
  onEventClick: (event: AgendaItem) => void;
}) {
  const relativeTime = useRelativeTime(event.date, open);
  
  // Formatear fecha y hora (SSoT UTC)
  const formatDateTime = (date: Date | string, time?: string | null) => {
    const normalized = toUtcDateOnly(date);
    const dateStr = normalized ? formatDisplayDate(normalized, { day: 'numeric', month: 'short' }) : '';
    if (time) {
      return `${dateStr} a las ${time}`;
    }
    return dateStr;
  };

  const eventName = event.event_name || event.concept || event.contact_name || 'Evento';
  const metadata = event.metadata as Record<string, unknown> | null;
  const agendaType = metadata?.agenda_type as string | undefined;

  // Clasificación por metadata: commercial_appointment | main_event_date | event_appointment | scheduler_task | event_date
  const isCommercialAppointment = agendaType === 'commercial_appointment' ||
    (event.contexto === 'promise' && event.type_scheduling);
  const isEventAppointment = agendaType === 'event_appointment' ||
    (event.contexto === 'evento' && event.type_scheduling);
  const isMainEventDate = agendaType === 'main_event_date' ||
    (event.contexto === 'evento' && !event.type_scheduling);
  const isSchedulerTask = agendaType === 'scheduler_task';

  let icon, iconColor, typeLabel;
  if (isCommercialAppointment) {
    icon = Handshake;
    iconColor = 'text-blue-400';
    typeLabel = 'Cita comercial';
    if (event.type_scheduling === 'presencial') typeLabel += ' · Presencial';
    else if (event.type_scheduling === 'virtual') typeLabel += ' · Virtual';
  } else if (isEventAppointment) {
    icon = Video;
    iconColor = 'text-purple-400';
    typeLabel = 'Cita evento';
    if (event.type_scheduling === 'presencial') typeLabel += ' · Presencial';
    else if (event.type_scheduling === 'virtual') typeLabel += ' · Virtual';
  } else if (isMainEventDate) {
    icon = CalendarDays;
    iconColor = 'text-emerald-400';
    typeLabel = 'Evento agendado';
    if (event.event_type_name) typeLabel = `${event.event_type_name}`;
  } else if (isSchedulerTask) {
    icon = ListTodo;
    iconColor = 'text-amber-400';
    typeLabel = 'Tarea';
  } else {
    icon = Calendar;
    iconColor = 'text-zinc-400';
    typeLabel = 'Agendamiento';
  }

  const Icon = icon;

  return (
    <ZenDropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-1 px-3 py-3 cursor-pointer'
      )}
      onClick={() => onEventClick(event)}
    >
      <div className="flex items-start gap-2 w-full">
        <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-zinc-200 line-clamp-2">
              {eventName}
            </p>
          </div>
          {isMainEventDate && event.event_type_name ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-400">
                {event.event_type_name}
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">
                {formatDateTime(event.date, event.time)}
              </span>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                {typeLabel}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-zinc-500">
                  {formatDateTime(event.date, event.time)}
                </span>
                <span className="text-xs text-zinc-500">
                  • {relativeTime}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </ZenDropdownMenuItem>
  );
}
