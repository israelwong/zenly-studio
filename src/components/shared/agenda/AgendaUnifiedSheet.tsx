'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { AgendaCalendar } from './AgendaCalendar';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenButton } from '@/components/ui/zen';
import { tieneGoogleCalendarHabilitado } from '@/lib/integrations/google-calendar/helpers';

interface AgendaUnifiedSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
}

export function AgendaUnifiedSheet({
  open,
  onOpenChange,
  studioSlug,
}: AgendaUnifiedSheetProps) {
  const router = useRouter();
  const [agendamientos, setAgendamientos] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [hasCalendarEnabled, setHasCalendarEnabled] = useState(false);

  const loadAgendamientos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await obtenerAgendaUnificada(studioSlug, {
        filtro: 'all',
      });

      if (result.success && result.data) {
        setAgendamientos(result.data);
      } else {
        toast.error(result.error || 'Error al cargar agendamientos');
      }
    } catch (error) {
      console.error('Error loading agendamientos:', error);
      toast.error('Error al cargar agendamientos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      const enabled = await tieneGoogleCalendarHabilitado(studioSlug);
      setHasCalendarEnabled(enabled);
    } catch (error) {
      console.error('Error verificando Google Calendar:', error);
      setHasCalendarEnabled(false);
    }
  }, [studioSlug]);


  useEffect(() => {
    if (open) {
      // Resetear loading al abrir el sheet para mostrar skeleton inmediatamente
      setLoading(true);
      loadAgendamientos();
      loadCalendarStatus();
    }
  }, [open, loadAgendamientos, loadCalendarStatus]);

  const handleSelectEvent = () => {
    // Cambiar a vista agenda al hacer click
    setCalendarView('agenda');
  };

  const handleViewChange = (view: 'month' | 'week' | 'day' | 'agenda') => {
    setCalendarView(view);
  };

  const handleViewPromise = (promiseId: string) => {
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    onOpenChange(false);
  };

  const handleViewEvento = (eventoId: string) => {
    router.push(`/${studioSlug}/studio/business/events/${eventoId}`);
    onOpenChange(false);
  };

  const handleSelectSlot = (_slotInfo: { start: Date; end: Date }) => {
    // Deshabilitado: crear agendamiento requiere asociar a promesa o evento
    // toast.info('Para crear un agendamiento, hazlo desde la promesa o evento correspondiente');
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
    const newDate = new Date(currentDate);

    if (action === 'PREV') {
      if (calendarView === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (calendarView === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else if (calendarView === 'day') {
        newDate.setDate(newDate.getDate() - 1);
      }
    } else if (action === 'NEXT') {
      if (calendarView === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (calendarView === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else if (calendarView === 'day') {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else if (action === 'TODAY') {
      setCurrentDate(new Date());
      return;
    } else if (action instanceof Date) {
      setCurrentDate(action);
      return;
    }

    setCurrentDate(newDate);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
        >
          <div className="p-0">
            <SheetHeader className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-semibold text-white">
                      Agenda
                    </SheetTitle>
                    <SheetDescription className="text-zinc-400">
                      Visualiza y gestiona todos tus agendamientos
                    </SheetDescription>
                  </div>
                </div>


              </div>
            </SheetHeader>

            <div className="p-5 mt-0 space-y-4">
              {/* Calendario */}
              {loading ? (
                <div className="h-[600px] bg-zinc-900 rounded-lg overflow-hidden">
                  {/* Skeleton del toolbar */}
                  <div className="flex items-center justify-between pb-4">
                    <Skeleton className="h-6 w-32 bg-zinc-800" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-16 bg-zinc-800" />
                      <Skeleton className="h-8 w-20 bg-zinc-800" />
                      <Skeleton className="h-8 w-16 bg-zinc-800" />
                      <Skeleton className="h-8 w-20 bg-zinc-800" />
                    </div>
                  </div>

                  {/* Skeleton del header de días */}
                  <div className="grid grid-cols-7 border-b border-zinc-800">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="p-3 border-r border-zinc-800 last:border-r-0">
                        <Skeleton className="h-4 w-16 bg-zinc-800 mx-auto" />
                      </div>
                    ))}
                  </div>

                  {/* Skeleton de las semanas del calendario */}
                  <div className="divide-y divide-zinc-800">
                    {[...Array(6)].map((_, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7">
                        {[...Array(7)].map((_, dayIndex) => (
                          <div
                            key={dayIndex}
                            className="h-24 p-2 border-r border-zinc-800 last:border-r-0"
                          >
                            <div className="flex flex-col gap-2">
                              <Skeleton className="h-4 w-6 bg-zinc-800 ml-auto" />
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-full bg-zinc-800" />
                                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Integración de Google Calendar */}
                  <GoogleCalendarIntegration
                    studioSlug={studioSlug}
                    onSync={loadAgendamientos}
                  />

                  <AgendaCalendar
                    events={agendamientos}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    onViewPromise={handleViewPromise}
                    onViewEvento={handleViewEvento}
                    defaultDate={currentDate}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    defaultView="month"
                    view={calendarView}
                    onViewChange={handleViewChange}
                  />
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

