'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Clock, TrendingUp } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { obtenerEventoDetalle, type EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { EventGanttView } from './components/EventGanttView';
import { GanttDateRangeConfig } from './components/GanttDateRangeConfig';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

export default function EventGanttPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [crewManagerOpen, setCrewManagerOpen] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEventData(result.data);
        } else {
          toast.error(result.error || 'Evento no encontrado');
          router.push(`/${studioSlug}/studio/business/events/${eventId}`);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Error al cargar el evento');
        router.push(`/${studioSlug}/studio/business/events/${eventId}`);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId, studioSlug, router]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-px bg-zinc-700 mx-1" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-px bg-zinc-700 mx-1" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            {/* Skeleton de tabla Gantt */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              {/* Header de tabla */}
              <div className="bg-zinc-900/90 border-b border-zinc-800">
                <div className="flex">
                  <div className="w-[360px] px-4 py-3 border-r border-zinc-800">
                    <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <div className="flex gap-1">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex-1 min-w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Filas skeleton */}
              <div className="divide-y divide-zinc-800">
                {[...Array(5)].map((_, rowIndex) => (
                  <div key={rowIndex} className="flex border-b border-zinc-800">
                    <div className="w-[360px] px-4 py-3 border-r border-zinc-800 bg-zinc-950">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-zinc-800 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-1">
                          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                          <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 px-4 py-3 bg-zinc-950">
                      <div className="flex gap-1">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="flex-1 min-w-[60px] h-12 bg-zinc-800/30 rounded animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!eventData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>{eventData.promise?.name || eventData.name || 'Evento sin nombre'}</ZenCardTitle>
                <ZenCardDescription>
                  Cronograma Gantt
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GanttDateRangeConfig
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                studioSlug={studioSlug}
                eventId={eventId}
                onSave={() => {
                  // Recargar datos del evento para obtener el nuevo rango
                  const loadEvent = async () => {
                    try {
                      const result = await obtenerEventoDetalle(studioSlug, eventId);
                      if (result.success && result.data) {
                        setEventData(result.data);
                        // Actualizar dateRange desde ganttInstance si existe
                        if (result.data.gantt) {
                          setDateRange({
                            from: result.data.gantt.start_date,
                            to: result.data.gantt.end_date,
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error reloading event:', error);
                    }
                  };
                  loadEvent();
                }}
              />
              <div className="h-6 w-px bg-zinc-700 mx-1" />
              <ZenButton
                variant={showDuration ? "primary" : "ghost"}
                size="sm"
                onClick={() => setShowDuration(!showDuration)}
                className={cn(
                  "gap-2 transition-all",
                  showDuration && "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/30"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Duración
              </ZenButton>
              <ZenButton
                variant={showProgress ? "primary" : "ghost"}
                size="sm"
                onClick={() => setShowProgress(!showProgress)}
                className={cn(
                  "gap-2 transition-all",
                  showProgress && "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Progreso
              </ZenButton>
              <div className="h-6 w-px bg-zinc-700 mx-1" />
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setCrewManagerOpen(true)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Personal
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <EventGanttView
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            ganttInstance={eventData.gantt || undefined}
            dateRange={dateRange}
            showDuration={showDuration}
            showProgress={showProgress}
          />
        </ZenCardContent>
      </ZenCard>

      <CrewMembersManager
        studioSlug={studioSlug}
        mode="manage"
        isOpen={crewManagerOpen}
        onClose={() => setCrewManagerOpen(false)}
      />
    </div>
  );
}

