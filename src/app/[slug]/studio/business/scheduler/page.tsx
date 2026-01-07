'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle2, Users, ChevronDown, ChevronUp, Settings, AlertCircle, Layers } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenBadge,
  ZenButton,
} from '@/components/ui/zen';
import { obtenerEventosConSchedulers, type EventoSchedulerItem } from '@/lib/actions/studio/business/events/events.actions';
import { toast } from 'sonner';

// Tipo para compatibilidad con el componente
type EventoConScheduler = EventoSchedulerItem;

const categoryLabels: Record<string, string> = {
  PLANNING: 'Planificación',
  PRE_PRODUCTION: 'Pre-producción',
  PRODUCTION: 'Producción',
  POST_PRODUCTION: 'Post-producción',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function calculateProgress(tasks: Array<{
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  progress: number;
  category: string;
  assignedToUserId: string | null;
}>): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((sum: number, task) => sum + task.progress, 0);
  return Math.round(total / tasks.length);
}

function getTimelineRange(eventos: EventoConScheduler[]): { start: Date; end: Date } {
  if (eventos.length === 0) {
    const today = new Date();
    return { start: today, end: today };
  }

  const allDates = eventos
    .flatMap(e => e.schedulers)
    .flatMap(s => [s.startDate, s.endDate]);

  if (allDates.length === 0) {
    const today = new Date();
    return { start: today, end: today };
  }

  return {
    start: new Date(Math.min(...allDates.map(d => d.getTime()))),
    end: new Date(Math.max(...allDates.map(d => d.getTime()))),
  };
}

function getEventPosition(
  eventStart: Date,
  eventEnd: Date,
  timelineStart: Date,
  timelineEnd: Date
): { left: number; width: number } {
  const timelineStartTime = timelineStart.getTime();
  const timelineEndTime = timelineEnd.getTime();
  const eventStartTime = eventStart.getTime();
  const eventEndTime = eventEnd.getTime();

  const left = ((eventStartTime - timelineStartTime) / (timelineEndTime - timelineStartTime)) * 100;
  const width = ((eventEndTime - eventStartTime) / (timelineEndTime - timelineStartTime)) * 100;

  return {
    left: Math.max(0, left),
    width: Math.min(100 - left, width),
  };
}

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export default function SchedulerPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;

  useEffect(() => {
    document.title = 'Zenly Studio - Scheduler';
  }, []);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventos, setEventos] = useState<EventoConScheduler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarEventos = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventosConSchedulers(studioSlug);

        if (result.success && result.data) {
          // Convertir fechas de string a Date si vienen serializadas
          const eventosConFechas = result.data.map(evento => ({
            ...evento,
            eventDate: new Date(evento.eventDate),
            schedulers: evento.schedulers.map(scheduler => ({
              ...scheduler,
              startDate: new Date(scheduler.startDate),
              endDate: new Date(scheduler.endDate),
              tasks: scheduler.tasks.map(task => ({
                ...task,
                startDate: new Date(task.startDate),
                endDate: new Date(task.endDate),
                assignedToUserId: task.assignedToUserId || null,
              })),
            })),
          }));
          setEventos(eventosConFechas);
        } else {
          toast.error(result.error || 'Error al cargar eventos');
          setEventos([]);
        }
      } catch (error) {
        console.error('Error cargando eventos:', error);
        toast.error('Error al cargar eventos');
        setEventos([]);
      } finally {
        setLoading(false);
      }
    };

    if (studioSlug) {
      cargarEventos();
    }
  }, [studioSlug]);

  const toggleScheduler = (schedulerKey: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(schedulerKey)) {
      newExpanded.delete(schedulerKey);
    } else {
      newExpanded.add(schedulerKey);
    }
    setExpandedEvents(newExpanded);
  };

  // Calcular rango total del timeline
  const timelineRange = useMemo(() => getTimelineRange(eventos), [eventos]);
  const timelineDays = useMemo(() => getDaysInRange(timelineRange.start, timelineRange.end), [timelineRange]);

  // Estadísticas basadas en estados de tareas (congruente con [eventId]/scheduler)
  const taskStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalItems = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let delayedTasks = 0;
    let pendingTasks = 0;
    let unassignedTasks = 0;
    let withoutCrewTasks = 0;
    let totalProgress = 0;

    eventos.forEach((evento) => {
      const eventoTotalItems = evento.totalItems || 0;
      totalItems += eventoTotalItems;

      if (evento.schedulers.length === 0) {
        // Si no hay schedulers, todos los items están sin asignar (sin fecha definida)
        unassignedTasks += eventoTotalItems;
        return;
      }

      let itemsConTareas = 0;
      evento.schedulers.forEach((scheduler) => {
        scheduler.tasks.forEach((task) => {
          itemsConTareas++;
          totalProgress += task.progress;

          const taskStartDate = new Date(task.startDate);
          const taskEndDate = new Date(task.endDate);
          taskStartDate.setHours(0, 0, 0, 0);
          taskEndDate.setHours(0, 0, 0, 0);

          const hasCrew = !!task.assignedToUserId;

          // Completadas
          if (task.status === 'COMPLETED') {
            completedTasks++;
            return;
          }

          // Sin personal asignado (tareas activas sin crew)
          if (!hasCrew) {
            withoutCrewTasks++;
          }

          // Retrasadas: no completadas y fecha de fin ya pasó
          if (today > taskEndDate) {
            delayedTasks++;
          } else if (today >= taskStartDate && today <= taskEndDate) {
            // En proceso: dentro del rango de fechas
            inProgressTasks++;
          } else if (today < taskStartDate) {
            // Programadas: aún no han comenzado
            pendingTasks++;
          }
        });
      });

      // Sin asignar: Items que existen pero aún no tienen fecha definida (no tienen scheduler_task)
      const itemsSinTareas = eventoTotalItems - itemsConTareas;
      unassignedTasks += itemsSinTareas;
    });

    // Calcular porcentaje basado en el promedio del campo progress de todas las tareas
    const percentage = totalItems > 0 ? Math.round(totalProgress / totalItems) : 0;

    return {
      total: totalItems,
      completed: completedTasks,
      percentage,
      inProgress: inProgressTasks,
      delayed: delayedTasks,
      pending: pendingTasks,
      unassigned: unassignedTasks,
      withoutCrew: withoutCrewTasks,
    };
  }, [eventos]);

  // Calcular stats para un scheduler (cotización) individual
  const getSchedulerStats = (scheduler: EventoConScheduler['schedulers'][0], totalItems: number) => {
    if (scheduler.tasks.length === 0) {
      return {
        total: totalItems,
        completed: 0,
        percentage: 0,
        inProgress: 0,
        delayed: 0,
        pending: 0,
        unassigned: totalItems,
        withoutCrew: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let completedTasks = 0;
    let inProgressTasks = 0;
    let delayedTasks = 0;
    let pendingTasks = 0;
    let withoutCrewTasks = 0;
    let totalProgress = 0;

    scheduler.tasks.forEach((task) => {
      totalProgress += task.progress;

      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.endDate);
      taskStartDate.setHours(0, 0, 0, 0);
      taskEndDate.setHours(0, 0, 0, 0);

      const hasCrew = !!task.assignedToUserId;

      // Completadas
      if (task.status === 'COMPLETED') {
        completedTasks++;
        return;
      }

      // Sin personal asignado (tareas activas sin crew)
      if (!hasCrew) {
        withoutCrewTasks++;
      }

      // Retrasadas: no completadas y fecha de fin ya pasó
      if (today > taskEndDate) {
        delayedTasks++;
      } else if (today >= taskStartDate && today <= taskEndDate) {
        // En proceso: dentro del rango de fechas
        inProgressTasks++;
      } else if (today < taskStartDate) {
        // Programadas: aún no han comenzado
        pendingTasks++;
      }
    });

    // Sin asignar: Items que existen pero aún no tienen fecha definida (no tienen scheduler_task)
    const itemsSinTareas = totalItems - scheduler.tasks.length;
    const unassignedTasks = itemsSinTareas;

    // Calcular porcentaje basado en el promedio del campo progress de todas las tareas programadas
    const totalProgressConItemsSinTareas = totalProgress + (itemsSinTareas * 0);
    const percentage = totalItems > 0 ? Math.round(totalProgressConItemsSinTareas / totalItems) : 0;

    return {
      total: totalItems,
      completed: completedTasks,
      percentage,
      inProgress: inProgressTasks,
      delayed: delayedTasks,
      pending: pendingTasks,
      unassigned: unassignedTasks,
      withoutCrew: withoutCrewTasks,
    };
  };

  // Agrupar tareas por categoría (garantiza todas las categorías)
  const getTasksByCategory = (tasks: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: string;
    progress: number;
    category: string;
    assignedToUserId: string | null;
  }>) => {
    const grouped: Record<string, typeof tasks> = {
      PLANNING: [],
      PRE_PRODUCTION: [],
      PRODUCTION: [],
      POST_PRODUCTION: [],
    };
    tasks.forEach(task => {
      if (!grouped[task.category]) {
        grouped[task.category] = [];
      }
      grouped[task.category].push(task);
    });
    return grouped;
  };

  // Obtener etapa actual (categoría con más tareas activas) para un scheduler
  const getCurrentStage = (scheduler: EventoConScheduler['schedulers'][0]): { category: string; label: string; count: number } | null => {
    if (scheduler.tasks.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categories = getTasksByCategory(scheduler.tasks);
    let currentStage: { category: string; label: string; count: number } | null = null;
    let maxActiveCount = 0;

    Object.entries(categories).forEach(([category, tasks]) => {
      // Contar tareas activas (no completadas)
      const activeTasks = tasks.filter(task => {
        if (task.status === 'COMPLETED') return false;
        const taskEndDate = new Date(task.endDate);
        taskEndDate.setHours(0, 0, 0, 0);
        return today <= taskEndDate; // Solo tareas que no han pasado su fecha límite
      });

      if (activeTasks.length > maxActiveCount) {
        maxActiveCount = activeTasks.length;
        currentStage = {
          category,
          label: categoryLabels[category] || category,
          count: tasks.length,
        };
      }
    });

    // Si no hay tareas activas, buscar la categoría con más tareas totales
    if (!currentStage || maxActiveCount === 0) {
      Object.entries(categories).forEach(([category, tasks]) => {
        if (tasks.length > 0 && (!currentStage || tasks.length > currentStage.count)) {
          currentStage = {
            category,
            label: categoryLabels[category] || category,
            count: tasks.length,
          };
        }
      });
    }

    return currentStage;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Timeline Principal */}
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          {loading ? (
            <div className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-zinc-800 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-zinc-800 rounded" />
                  <div className="h-4 w-32 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-7 w-24 bg-zinc-800 rounded" />
                <div className="h-6 w-px bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-20 bg-zinc-800 rounded" />
                  <div className="h-6 w-24 bg-zinc-800 rounded" />
                  <div className="h-6 w-20 bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <ZenCardTitle className="text-base">Timeline de Cronogramas</ZenCardTitle>
                  <ZenCardDescription className="text-xs">
                    {formatDate(timelineRange.start)} - {formatDate(timelineRange.end)}
                  </ZenCardDescription>
                </div>
              </div>
              {/* Stats congruentes con [eventId]/scheduler */}
              <div className="flex items-center gap-3">
                {/* Progreso */}
                <ZenBadge
                  variant="outline"
                  className="gap-1.5 px-2.5 py-1 bg-emerald-950/30 text-emerald-400 border-emerald-800/50"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    Progreso: {taskStats.completed}/{taskStats.total} ({taskStats.percentage}%)
                  </span>
                </ZenBadge>

                {/* Separador */}
                <div className="h-6 w-px bg-zinc-700" />

                {/* Tareas por estado */}
                <div className="flex items-center gap-2">
                  {taskStats.unassigned > 0 && (
                    <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-zinc-900 text-zinc-500 border-zinc-800">
                      <span className="text-xs">{taskStats.unassigned} Sin asignar</span>
                    </ZenBadge>
                  )}

                  {taskStats.pending > 0 && (
                    <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 border-zinc-700">
                      <span className="text-xs">{taskStats.pending} Asignadas</span>
                    </ZenBadge>
                  )}

                  {taskStats.withoutCrew > 0 && (
                    <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-amber-950/30 text-amber-400 border-amber-800/50">
                      <Users className="h-3 w-3" />
                      <span className="text-xs">{taskStats.withoutCrew} Sin personal</span>
                    </ZenBadge>
                  )}

                  {taskStats.inProgress > 0 && (
                    <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-blue-950/30 text-blue-400 border-blue-800/50">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{taskStats.inProgress} En proceso</span>
                    </ZenBadge>
                  )}

                  {taskStats.completed > 0 && (
                    <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border-emerald-800/50">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-xs">{taskStats.completed} Completadas</span>
                    </ZenBadge>
                  )}

                  {taskStats.delayed > 0 && (
                    <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-red-950/30 text-red-400 border-red-800/50">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs">{taskStats.delayed} Atrasadas</span>
                    </ZenBadge>
                  )}
                </div>
              </div>
            </div>
          )}
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            {loading ? (
              <>
                {/* Skeleton Header con fechas */}
                <div className="bg-zinc-900/95 border-b border-zinc-800 p-3">
                  <div className="flex gap-1 overflow-x-auto animate-pulse">
                    {[...Array(14)].map((_, i) => (
                      <div key={i} className="shrink-0 w-10 h-10 bg-zinc-800 rounded" />
                    ))}
                  </div>
                </div>

                {/* Skeleton Barras de eventos */}
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="relative h-16 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse">
                        <div className="absolute top-2 left-3 h-12 w-64 bg-zinc-800 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Header con fechas */}
                <div className="bg-zinc-900/95 border-b border-zinc-800 p-3">
                  <div className="flex gap-1 overflow-x-auto">
                    {timelineDays.map((day, idx) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const showLabel = idx === 0 || day.getDate() === 1 || idx % 7 === 0;

                      return (
                        <div
                          key={idx}
                          className={`shrink-0 text-center ${isToday ? 'bg-blue-950/30' : ''}`}
                          style={{ minWidth: '40px' }}
                        >
                          {showLabel && (
                            <>
                              <div className="text-[10px] text-zinc-500">{day.getDate()}</div>
                              <div className="text-[8px] text-zinc-600">
                                {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                              </div>
                            </>
                          )}
                          {isToday && (
                            <div className="w-full h-1 bg-blue-500 rounded-full mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cards de cronogramas (uno por cotización) */}
                <div className="p-4 space-y-4">
                  {eventos.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">No hay eventos activos con cronogramas</div>
                  ) : (
                    eventos.flatMap((evento) =>
                      evento.schedulers.map((scheduler) => {
                        const schedulerKey = `${evento.id}-${scheduler.cotizacionId}`;
                        const isExpanded = expandedEvents.has(schedulerKey);
                        const position = getEventPosition(
                          scheduler.startDate,
                          scheduler.endDate,
                          timelineRange.start,
                          timelineRange.end
                        );
                        const progress = calculateProgress(scheduler.tasks);
                        const schedulerStats = getSchedulerStats(scheduler, scheduler.tasks.length);
                        const currentStage = getCurrentStage(scheduler);

                        // Asegurar que la barra no se salga de los límites
                        const safeLeft = Math.max(0, Math.min(position.left, 100));
                        const safeWidth = Math.min(position.width, 100 - safeLeft);

                        // Colores diferentes por cotización para distinguirlas
                        const colors = [
                          { bg: 'bg-blue-600/20', border: 'border-blue-500/60', dot: 'bg-blue-500', ring: 'ring-blue-400/50' },
                          { bg: 'bg-purple-600/20', border: 'border-purple-500/60', dot: 'bg-purple-500', ring: 'ring-purple-400/50' },
                          { bg: 'bg-emerald-600/20', border: 'border-emerald-500/60', dot: 'bg-emerald-500', ring: 'ring-emerald-400/50' },
                          { bg: 'bg-amber-600/20', border: 'border-amber-500/60', dot: 'bg-amber-500', ring: 'ring-amber-400/50' },
                        ];
                        const colorIndex = evento.schedulers.findIndex(s => s.cotizacionId === scheduler.cotizacionId);
                        const colorScheme = colors[colorIndex % colors.length];

                        return (
                          <div key={schedulerKey} className="space-y-2">
                            {/* Card del cronograma */}
                            <div
                              className="relative h-16 bg-zinc-900 rounded-lg border border-zinc-800 cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden"
                              onClick={() => toggleScheduler(schedulerKey)}
                            >
                              {/* Línea de fondo del timeline */}
                              <div className="absolute inset-0 flex items-center pointer-events-none">
                                <div className="w-full h-px bg-zinc-800/50" />
                              </div>

                              {/* Barra del cronograma */}
                              <div
                                className={`absolute top-0 h-full rounded-md ${colorScheme.bg} border-2 ${colorScheme.border} flex flex-col justify-between px-3 py-1.5 shadow-lg z-10`}
                                style={{
                                  left: `${safeLeft}%`,
                                  width: `${safeWidth}%`,
                                  minWidth: '140px',
                                  maxWidth: 'calc(100% - 8px)',
                                }}
                              >
                                {/* Parte superior: Nombre evento - Nombre cotización */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-2.5 h-2.5 rounded-full ${colorScheme.dot} shrink-0 ring-2 ${colorScheme.ring}`} />
                                    <span className="text-xs font-semibold text-zinc-100 truncate">
                                      {evento.name} - {scheduler.cotizacionName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-zinc-300 font-medium">
                                      {formatDate(scheduler.startDate)}
                                    </span>
                                    <span className="text-zinc-500 text-xs">→</span>
                                    <span className="text-[10px] text-zinc-300 font-medium">
                                      {formatDate(scheduler.endDate)}
                                    </span>
                                  </div>
                                </div>

                                {/* Parte inferior: Barra de progreso y porcentaje */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
                                    <div
                                      className="h-full bg-emerald-500 transition-all"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold text-emerald-400 shrink-0 min-w-[32px] text-right">
                                    {progress}%
                                  </span>
                                  <div className="shrink-0">
                                    {isExpanded ? (
                                      <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Barra de progreso visual dentro del rango del cronograma (fondo) */}
                              {progress > 0 && (
                                <div
                                  className="absolute bottom-0 h-1 rounded-b-md bg-emerald-500/30 z-0"
                                  style={{
                                    left: `${safeLeft}%`,
                                    width: `${(safeWidth * progress) / 100}%`,
                                    minWidth: progress > 0 ? '4px' : '0',
                                  }}
                                />
                              )}
                            </div>

                            {/* Detalles expandidos */}
                            {isExpanded && (
                              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                                {/* Primera fila: [nombre evento - nombre cotización] [progreso] [etapa actual] [gestionar] */}
                                <div className="flex items-center justify-between gap-4">
                                  {/* Info del cronograma */}
                                  <div className="flex items-center gap-4 text-sm flex-1">
                                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                                      {evento.name} - {scheduler.cotizacionName}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                      <Users className="h-4 w-4" />
                                      {evento.contactName}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(scheduler.startDate)} → {formatDate(scheduler.endDate)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                      <Clock className="h-4 w-4" />
                                      {formatDate(evento.eventDate)}
                                    </div>
                                  </div>

                                  {/* Progreso */}
                                  <ZenBadge
                                    variant="outline"
                                    className="gap-1.5 px-2.5 py-1 bg-emerald-950/30 text-emerald-400 border-emerald-800/50 shrink-0"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="text-xs font-medium">
                                      Progreso: {schedulerStats.completed}/{schedulerStats.total} ({schedulerStats.percentage}%)
                                    </span>
                                  </ZenBadge>

                                  {/* Etapa actual */}
                                  {currentStage && (
                                    <ZenBadge
                                      variant="outline"
                                      className="gap-1 px-2 py-1 bg-zinc-900 text-zinc-400 border-zinc-800 shrink-0"
                                    >
                                      <Layers className="h-3 w-3" />
                                      <span className="text-xs font-medium">Etapa actual: {currentStage.label}</span>
                                    </ZenBadge>
                                  )}

                                  {/* Botón Gestionar */}
                                  <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/${studioSlug}/studio/business/events/${evento.id}/scheduler?cotizacion=${scheduler.cotizacionId}`);
                                    }}
                                    className="gap-1 px-2 py-1 h-7 text-xs shrink-0"
                                  >
                                    <Settings className="h-3 w-3" />
                                    Gestionar
                                  </ZenButton>
                                </div>

                                {/* Segunda fila: Cards de estados (orden específico) */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                  {/* Sin asignar */}
                                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                                    <div className="text-xs font-medium text-zinc-400 mb-1">Sin asignar</div>
                                    <div className="text-2xl font-semibold text-zinc-300">{schedulerStats.unassigned}</div>
                                  </div>

                                  {/* Asignadas */}
                                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="text-xs font-medium text-zinc-400 mb-1">Asignadas</div>
                                    <div className="text-2xl font-semibold text-zinc-300">{schedulerStats.pending}</div>
                                  </div>

                                  {/* Sin personal */}
                                  <div className="bg-amber-950/20 border border-amber-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1">
                                      <Users className="h-3.5 w-3.5" />
                                      Sin personal
                                    </div>
                                    <div className="text-2xl font-semibold text-amber-400">{schedulerStats.withoutCrew}</div>
                                  </div>

                                  {/* En proceso */}
                                  <div className="bg-blue-950/20 border border-blue-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 mb-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      En proceso
                                    </div>
                                    <div className="text-2xl font-semibold text-blue-400">{schedulerStats.inProgress}</div>
                                  </div>

                                  {/* Completadas */}
                                  <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Completadas
                                    </div>
                                    <div className="text-2xl font-semibold text-emerald-400">{schedulerStats.completed}</div>
                                  </div>

                                  {/* Atrasadas */}
                                  <div className="bg-red-950/20 border border-red-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-1">
                                      <AlertCircle className="h-3.5 w-3.5" />
                                      Atrasadas
                                    </div>
                                    <div className="text-2xl font-semibold text-red-400">{schedulerStats.delayed}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
