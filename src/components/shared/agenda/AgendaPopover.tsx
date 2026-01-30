'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CalendarDays, Handshake, Video } from 'lucide-react';
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
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

interface AgendaPopoverProps {
  studioSlug: string;
  initialEvents?: AgendaItem[]; // ✅ Pre-cargado en servidor (6 más próximos)
  initialCount?: number; // ✅ Pre-cargado en servidor
  onAgendaClick?: () => void; // Para abrir el sheet completo
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
  
  // ✅ Usar datos iniciales del servidor (ya filtrados en el servidor)
  const events = initialEvents.slice(0, 6); // Mostrar solo los 6 más próximos
  const count = initialEvents.length; // Contar eventos filtrados del servidor

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEventClick = (event: AgendaItem) => {
    // Navegar a la promesa o evento según el contexto
    if (event.promise_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${event.promise_id}`);
    } else if (event.evento_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${event.promise_id}/eventos/${event.evento_id}`);
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

  // Renderizar solo después del mount para evitar problemas de hidratación
  if (!isMounted) {
    return (
      <ZenButton
        variant="ghost"
        size="icon"
        className="relative rounded-full text-zinc-400 hover:text-zinc-200"
        title="Agenda"
        disabled
      >
        <Calendar className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
        <span className="sr-only">Agenda</span>
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
            title="Agenda"
          >
            <Calendar className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
            <span className="sr-only">Agenda</span>
          </ZenButton>
        </ZenDropdownMenuTrigger>
        <ZenDropdownMenuContent
          align="end"
          className="w-80 max-h-[500px] flex flex-col p-0"
        >
          <div className="px-3 py-2 border-b border-zinc-700 flex-shrink-0">
            <h3 className="text-sm font-semibold text-zinc-200">Agenda de eventos programados</h3>
            {count > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                {count} {count === 1 ? 'evento próximo' : 'eventos próximos'}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {events.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-zinc-400">
                No hay eventos próximos
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
                Abrir la agenda completa
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

  // Obtener nombre del evento
  const eventName = event.event_name || event.concept || event.contact_name || 'Evento';
  
  // Determinar si es cita comercial o evento
  const metadata = event.metadata as Record<string, unknown> | null;
  const agendaType = metadata?.agenda_type as string | undefined;
  const isCommercialAppointment = agendaType === 'commercial_appointment' || 
                                 (event.contexto === 'promise' && event.type_scheduling);
  const isEventAppointment = agendaType === 'event_appointment' || 
                            (event.contexto === 'evento' && event.type_scheduling);
  const isEventDate = agendaType === 'main_event_date' || 
                     (event.contexto === 'evento' && !event.type_scheduling);

  // Configuración visual simplificada
  let icon, iconColor, typeLabel;
  
  if (isCommercialAppointment) {
    icon = Handshake;
    iconColor = 'text-blue-400';
    typeLabel = event.type_scheduling === 'presencial' ? 'Cita Presencial' : 'Cita Virtual';
  } else if (isEventAppointment) {
    icon = Video;
    iconColor = 'text-purple-400';
    typeLabel = event.type_scheduling === 'presencial' ? 'Cita Evento' : 'Cita Virtual';
  } else if (isEventDate) {
    icon = CalendarDays;
    iconColor = 'text-emerald-400';
    // Para eventos: mostrar tipo de evento | fecha
    typeLabel = event.event_type_name || 'Fecha de Evento';
  } else {
    icon = Calendar;
    iconColor = 'text-zinc-400';
    typeLabel = 'Evento';
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
          {isEventDate && event.event_type_name ? (
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
