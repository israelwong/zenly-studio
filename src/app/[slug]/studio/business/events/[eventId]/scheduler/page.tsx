'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge } from '@/components/ui/zen';
import { obtenerEventoDetalle, type EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { EventSchedulerView, SchedulerDateRangeConfig } from './index';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { type DateRange } from 'react-day-picker';

export default function EventSchedulerPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [crewManagerOpen, setCrewManagerOpen] = useState(false);

  // Calcular progreso y estadísticas de tareas
  const taskStats = useMemo(() => {
    if (!eventData?.cotizaciones || !dateRange) {
      return { completed: 0, total: 0, percentage: 0, delayed: 0, inProcess: 0, pending: 0, unassigned: 0 };
    }

    const allItems = eventData.cotizaciones.flatMap(cot => cot.cotizacion_items || []);
    const total = allItems.length;
    const itemsWithTasks = allItems.filter(item => item.gantt_task);
    const unassigned = total - itemsWithTasks.length;

    const completed = itemsWithTasks.filter(item => item.gantt_task?.completed_at).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calcular estados basados en fechas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let delayed = 0;
    let inProcess = 0;
    let pending = 0;

    itemsWithTasks.forEach(item => {
      if (item.gantt_task?.completed_at) return; // Ya completadas no cuentan

      const startDate = new Date(item.gantt_task!.start_date);
      const endDate = new Date(item.gantt_task!.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (today > endDate) {
        delayed++;
      } else if (today >= startDate && today <= endDate) {
        inProcess++;
      } else if (today < startDate) {
        pending++;
      }
    });

    return { completed, total, percentage, delayed, inProcess, pending, unassigned };
  }, [eventData, dateRange]);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const result = await obtenerEventoDetalle(studioSlug, eventId);

      if (result.success && result.data) {
        setEventData(result.data);
        // Inicializar dateRange si existe gantt configurado (solo la primera vez)
        if (!dateRange && result.data.gantt?.start_date && result.data.gantt?.end_date) {
          setDateRange({
            from: result.data.gantt.start_date,
            to: result.data.gantt.end_date,
          });
        }
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
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-px bg-zinc-700 mx-1" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-px bg-zinc-700 mx-1" />
                <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-0">
            {/* Stats Bar Skeleton */}
            <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Scheduler Skeleton */}
            <div className="p-6">
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
                <div className="flex">
                  {/* Sidebar Skeleton */}
                  <div className="w-[360px] border-r border-zinc-800 flex-shrink-0">
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
                        <div key={i} className="w-[60px] h-10 bg-zinc-800/50 rounded animate-pulse flex-shrink-0" />
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
                <ZenCardTitle>{eventData.promise?.name || eventData.name || 'Evento sin nombre'}</ZenCardTitle>
                <ZenCardDescription>
                  Cronograma
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SchedulerDateRangeConfig
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
        <ZenCardContent className="p-0">
          {/* Stats Bar - Sticky */}
          {taskStats.total > 0 && (
            <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-3">
              <div className="flex items-center justify-between gap-6">
                {/* Columna 1: Progreso */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 font-medium">Progreso:</span>
                  <ZenBadge
                    variant="outline"
                    className="gap-1.5 px-3 py-1.5 bg-emerald-950/30 text-emerald-400 border-emerald-800/50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {taskStats.completed} de {taskStats.total} ({taskStats.percentage}%)
                    </span>
                  </ZenBadge>
                </div>

                {/* Columna 2: Tareas por estado */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 font-medium">Tareas:</span>
                  <div className="flex items-center gap-2">
                    {/* Sin asignar */}
                    {taskStats.unassigned > 0 && (
                      <ZenBadge
                        variant="outline"
                        className="gap-1.5 px-2 py-1 bg-zinc-900 text-zinc-500 border-zinc-800"
                      >
                        <span className="text-xs font-medium">{taskStats.unassigned} Sin asignar</span>
                      </ZenBadge>
                    )}

                    {/* Pendientes */}
                    {taskStats.pending > 0 && (
                      <ZenBadge
                        variant="outline"
                        className="gap-1.5 px-2 py-1 bg-zinc-800 text-zinc-400 border-zinc-700"
                      >
                        <span className="text-xs font-medium">{taskStats.pending} Pendientes</span>
                      </ZenBadge>
                    )}

                    {/* En proceso */}
                    {taskStats.inProcess > 0 && (
                      <ZenBadge
                        variant="outline"
                        className="gap-1.5 px-2 py-1 bg-blue-950/30 text-blue-400 border-blue-800/50"
                      >
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-medium">{taskStats.inProcess} En proceso</span>
                      </ZenBadge>
                    )}

                    {/* Completadas */}
                    {taskStats.completed > 0 && (
                      <ZenBadge
                        variant="outline"
                        className="gap-1.5 px-2 py-1 bg-emerald-950/30 text-emerald-400 border-emerald-800/50"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="text-xs font-medium">{taskStats.completed} Completadas</span>
                      </ZenBadge>
                    )}

                    {/* Atrasadas */}
                    {taskStats.delayed > 0 && (
                      <ZenBadge
                        variant="outline"
                        className="gap-1.5 px-2 py-1 bg-red-950/30 text-red-400 border-red-800/50"
                      >
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs font-medium">{taskStats.delayed} Atrasadas</span>
                      </ZenBadge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scheduler */}
          <div className="p-6">
            <EventSchedulerView
              studioSlug={studioSlug}
              eventId={eventId}
              eventData={eventData}
              ganttInstance={eventData.gantt || undefined}
              dateRange={dateRange}
              onDataChange={setEventData}
            />
          </div>
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

