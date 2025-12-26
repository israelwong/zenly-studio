'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { obtenerEventoDetalle, type EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { SchedulerWrapper } from './components/SchedulerWrapper';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { type DateRange } from 'react-day-picker';

export default function EventSchedulerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const cotizacionId = searchParams.get('cotizacion');
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [crewManagerOpen, setCrewManagerOpen] = useState(false);

  useEffect(() => {
    document.title = 'ZEN Studio - Scheduler';
  }, []);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const result = await obtenerEventoDetalle(studioSlug, eventId);

      if (result.success && result.data) {
        setEventData(result.data);
        // Inicializar dateRange si existe scheduler configurado (solo la primera vez)
        if (!dateRange && result.data.scheduler?.start_date && result.data.scheduler?.end_date) {
          setDateRange({
            from: result.data.scheduler.start_date,
            to: result.data.scheduler.end_date,
          });
        }
      } else {
        toast.error(result.error || 'Evento no encontrado');
        router.push(`/${studioSlug}/studio/business/events/${eventId}`);
      }
    } catch (error) {
      toast.error('Error al cargar el evento');
      router.push(`/${studioSlug}/studio/business/events/${eventId}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, studioSlug, router, dateRange]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId, loadEvent]);

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
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            {/* Barra unificada Skeleton: Progreso + Tareas + Rango */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center justify-between gap-6">
                {/* Progreso Skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-7 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Separador */}
                <div className="h-6 w-px bg-zinc-700" />

                {/* Tareas Skeleton */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Separador */}
                <div className="h-6 w-px bg-zinc-700" />

                {/* Rango de fechas Skeleton */}
                <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>

            {/* Scheduler Skeleton */}
            <div>
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
                <div className="flex">
                  {/* Sidebar Skeleton */}
                  <div className="w-[360px] border-r border-zinc-800 shrink-0">
                    {/* Header */}
                    <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center px-4">
                      <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    {/* Items */}
                    <div>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[60px] border-b border-zinc-800/50 px-4 flex items-center">
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                              <div className="flex items-center gap-1.5">
                                <div className="h-4 w-4 bg-zinc-800 rounded-full animate-pulse" />
                                <div className="h-2 w-20 bg-zinc-800/50 rounded animate-pulse" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Skeleton */}
                  <div className="flex-1 overflow-hidden">
                    {/* Header con fechas */}
                    <div className="h-[60px] bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-1 px-2">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse shrink-0" />
                      ))}
                    </div>
                    {/* Rows con TaskBars */}
                    <div>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[60px] border-b border-zinc-800/50 relative px-2 flex items-center gap-1">
                          {/* Simular un TaskBar por fila en diferentes posiciones y tamaños */}
                          {i === 1 && (
                            <div
                              className="absolute h-12 bg-blue-500/20 rounded animate-pulse"
                              style={{ left: '68px', width: '180px' }}
                            />
                          )}
                          {i === 2 && (
                            <div
                              className="absolute h-12 bg-emerald-500/20 rounded animate-pulse"
                              style={{ left: '188px', width: '240px' }}
                            />
                          )}
                          {i === 4 && (
                            <div
                              className="absolute h-12 bg-blue-500/20 rounded animate-pulse"
                              style={{ left: '8px', width: '120px' }}
                            />
                          )}
                          {i === 5 && (
                            <div
                              className="absolute h-12 bg-purple-500/20 rounded animate-pulse"
                              style={{ left: '308px', width: '180px' }}
                            />
                          )}
                          {i === 7 && (
                            <div
                              className="absolute h-12 bg-emerald-500/20 rounded animate-pulse"
                              style={{ left: '128px', width: '300px' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
                <ZenCardTitle>
                  {cotizacionId
                    ? eventData.cotizaciones?.find(c => c.id === cotizacionId)?.name || 'Cronograma'
                    : eventData.promise?.name || eventData.name || 'Evento sin nombre'}
                </ZenCardTitle>
                <ZenCardDescription>
                  {cotizacionId ? 'Cronograma de cotización' : 'Cronograma'}
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
          {/* Scheduler con Stats integrados */}
          <SchedulerWrapper
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            initialDateRange={dateRange}
            onDataChange={setEventData}
            cotizacionId={cotizacionId || undefined}
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

