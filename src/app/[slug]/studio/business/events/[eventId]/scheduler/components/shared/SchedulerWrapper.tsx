'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import { CheckCircle2, AlertCircle, Clock, Users } from 'lucide-react';
import { EventSchedulerView } from './EventSchedulerView';
import { SchedulerDateRangeConfig } from '../date-config/SchedulerDateRangeConfig';
import { DateRangeConflictModal } from '../date-config/DateRangeConflictModal';
import { PublicationBar } from './PublicationBar';
import { ZenBadge } from '@/components/ui/zen';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface SchedulerWrapperProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  initialDateRange?: DateRange;
  onDataChange?: (data: EventoDetalle) => void;
  cotizacionId?: string;
}

/**
 * Wrapper que aísla el estado del dateRange para evitar re-renders del componente padre
 */
export function SchedulerWrapper({
  studioSlug,
  eventId,
  eventData,
  initialDateRange,
  onDataChange,
  cotizacionId,
}: SchedulerWrapperProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [proposedRange, setProposedRange] = useState<{ from: Date; to: Date } | null>(null);

  // Filtrar cotizaciones según cotizacionId si está especificado
  const filteredCotizaciones = useMemo(() => {
    if (!cotizacionId || !eventData.cotizaciones) {
      return eventData.cotizaciones;
    }
    return eventData.cotizaciones.filter(cot => cot.id === cotizacionId);
  }, [eventData.cotizaciones, cotizacionId]);

  // Crear eventData filtrado para pasar al scheduler
  // Usar una comparación más estable para evitar recálculos innecesarios
  const cotizacionesIds = useMemo(() => {
    return filteredCotizaciones?.map(c => c.id).join(',') || '';
  }, [filteredCotizaciones]);
  
  const filteredEventData = useMemo(() => {
    return {
      ...eventData,
      cotizaciones: filteredCotizaciones,
    };
  }, [
    eventData?.id,
    eventData?.scheduler?.id,
    cotizacionesIds,
  ]);

  // Validar si hay tareas fuera del nuevo rango
  const validateDateRangeChange = useCallback((newRange: DateRange | undefined): boolean => {
    if (!newRange?.from || !newRange?.to || !filteredCotizaciones) {
      return true; // Sin restricciones si no hay rango o datos
    }

    // Extraer fechas después de la verificación para que TypeScript las reconozca como definidas
    const rangeFrom = newRange.from;
    const rangeTo = newRange.to;

    // Buscar todas las tareas con scheduler_task asignado (solo de la cotización filtrada)
    const allItems = filteredCotizaciones.flatMap(cot => cot.cotizacion_items || []);
    const itemsWithTasks = allItems.filter(item => item.scheduler_task);

    if (itemsWithTasks.length === 0) {
      return true; // No hay tareas, permitir cambio
    }

    // Verificar si alguna tarea está fuera del nuevo rango
    const tasksOutsideRange = itemsWithTasks.filter(item => {
      if (!item.scheduler_task) return false;

      const taskStart = new Date(item.scheduler_task.start_date);
      const taskEnd = new Date(item.scheduler_task.end_date);
      taskStart.setHours(0, 0, 0, 0);
      taskEnd.setHours(0, 0, 0, 0);

      const rangeStart = new Date(rangeFrom);
      const rangeEnd = new Date(rangeTo);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(0, 0, 0, 0);

      // Tarea está fuera si empieza antes del rango o termina después
      return taskStart < rangeStart || taskEnd > rangeEnd;
    });

    if (tasksOutsideRange.length > 0) {
      // Hay conflictos, mostrar modal
      setConflictCount(tasksOutsideRange.length);
      setProposedRange({ from: rangeFrom, to: rangeTo });
      // Usar requestAnimationFrame para asegurar que el estado se actualice en el próximo frame
      requestAnimationFrame(() => {
        setConflictModalOpen(true);
      });
      return false; // Bloquear cambio
    }

    return true; // No hay conflictos, permitir cambio
  }, [filteredCotizaciones]);


  // Memoizar el callback de setDateRange para evitar re-renders innecesarios
  const handleDateRangeChange = useCallback((newRange: DateRange | undefined) => {
    // Actualizar el estado local del dateRange
    // Esto actualizará el header de días y re-renderizará el scheduler
    setDateRange(newRange);
  }, []);

  // Calcular progreso y estadísticas de tareas
  const taskStats = useMemo(() => {
    if (!filteredCotizaciones) {
      return {
        completed: 0,
        total: 0,
        percentage: 0,
        delayed: 0,
        inProcess: 0,
        pending: 0,
        unassigned: 0,
        withoutCrew: 0
      };
    }

    const allItems = filteredCotizaciones.flatMap(cot => cot.cotizacion_items || []);
    const total = allItems.length;
    const itemsWithTasks = allItems.filter(item => item.scheduler_task);
    const unassigned = total - itemsWithTasks.length;

    const completed = itemsWithTasks.filter(item => !!item.scheduler_task?.completed_at).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let delayed = 0;
    let inProcess = 0;
    let pending = 0;
    let withoutCrew = 0; // Todas las tareas activas (no completadas) sin personal asignado

    itemsWithTasks.forEach(item => {
      if (item.scheduler_task?.completed_at) return;

      const startDate = new Date(item.scheduler_task!.start_date);
      const endDate = new Date(item.scheduler_task!.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      const hasCrew = !!item.assigned_to_crew_member_id;

      // Contar tareas sin crew (activas)
      if (!hasCrew) {
        withoutCrew++;
      }

      if (today > endDate) {
        delayed++;
      } else if (today >= startDate && today <= endDate) {
        inProcess++;
      } else if (today < startDate) {
        pending++;
      }
    });

    return { completed, total, percentage, delayed, inProcess, pending, unassigned, withoutCrew };
  }, [filteredCotizaciones]);

  return (
    <>
      {/* Barra unificada: Progreso + Tareas + Rango */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-6">
          {/* Progreso */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Progreso:</span>
            <ZenBadge
              variant="outline"
              className="gap-1.5 px-2.5 py-1 bg-emerald-950/30 text-emerald-400 border-emerald-800/50"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span className="text-xs font-medium">
                {taskStats.completed}/{taskStats.total} ({taskStats.percentage}%)
              </span>
            </ZenBadge>
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-zinc-700" />

          {/* Tareas por estado - Compacto */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-zinc-500 font-medium">Tareas:</span>

            {taskStats.unassigned > 0 && (
              <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-zinc-900 text-zinc-500 border-zinc-800">
                <span className="text-xs">{taskStats.unassigned} Sin asignar</span>
              </ZenBadge>
            )}

            {taskStats.withoutCrew !== undefined && taskStats.withoutCrew > 0 && (
              <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-amber-950/30 text-amber-400 border-amber-800/50">
                <Users className="h-3 w-3" />
                <span className="text-xs">{taskStats.withoutCrew} Sin personal</span>
              </ZenBadge>
            )}

            {taskStats.pending > 0 && (
              <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 border-zinc-700">
                <span className="text-xs">{taskStats.pending} Programadas</span>
              </ZenBadge>
            )}

            {taskStats.inProcess > 0 && (
              <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-blue-950/30 text-blue-400 border-blue-800/50">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{taskStats.inProcess} En proceso</span>
              </ZenBadge>
            )}

            {taskStats.delayed > 0 && (
              <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-red-950/30 text-red-400 border-red-800/50">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">{taskStats.delayed} Atrasadas</span>
              </ZenBadge>
            )}
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-zinc-700" />

          {/* Rango de fechas */}
          <SchedulerDateRangeConfig
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onValidate={validateDateRangeChange}
            studioSlug={studioSlug}
            eventId={eventId}
          />
        </div>
      </div>

      {/* Scheduler */}
      <EventSchedulerView
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={filteredEventData}
        schedulerInstance={eventData.scheduler || undefined}
        dateRange={dateRange}
        onDataChange={onDataChange}
      />

      {/* Modal de conflicto de rango */}
      <DateRangeConflictModal
        isOpen={conflictModalOpen && !!proposedRange}
        onClose={() => {
          setConflictModalOpen(false);
          setConflictCount(0);
          setProposedRange(null);
        }}
        conflictCount={conflictCount}
        proposedRange={proposedRange || { from: new Date(), to: new Date() }}
      />

      {/* Barra de publicación flotante */}
      <PublicationBar
        studioSlug={studioSlug}
        eventId={eventId}
        onPublished={() => {
          // Recargar datos después de publicar
          onDataChange?.(eventData);
        }}
      />
    </>
  );
}
