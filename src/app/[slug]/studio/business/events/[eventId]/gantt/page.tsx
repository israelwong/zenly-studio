'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { obtenerEventoDetalle, type EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { EventGanttView } from './components/EventGanttView';
import { GanttDateRangeConfig } from './components/GanttDateRangeConfig';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { type DateRange } from 'react-day-picker';

export default function EventGanttPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [crewManagerOpen, setCrewManagerOpen] = useState(false);

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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="text-center py-12 text-zinc-400">
              Cargando cronograma...
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
                <ZenCardTitle>Cronograma Gantt</ZenCardTitle>
                <ZenCardDescription>
                  {eventData.name || 'Evento sin nombre'}
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GanttDateRangeConfig
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
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
          />
        </ZenCardContent>
      </ZenCard>

      <CrewMembersManager
        studioSlug={studioSlug}
        eventId={eventId}
        mode="manage"
        isOpen={crewManagerOpen}
        onClose={() => setCrewManagerOpen(false)}
      />
    </div>
  );
}

