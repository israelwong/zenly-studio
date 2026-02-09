'use client';

import { useState, useCallback, useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import { calculateTaskStatus } from '../utils/task-status-utils';
import type { SchedulerData } from '@/lib/actions/studio/business/events';

type ItemWithTask = {
  scheduler_task: { start_date: Date; end_date: Date; completed_at: Date | null };
  assigned_to_crew_member_id?: string | null;
};

export interface SchedulerTaskStats {
  completed: number;
  total: number;
  percentage: number;
  delayed: number;
  inProcess: number;
  pending: number;
  unassigned: number;
  withoutCrew: number;
}

export function useSchedulerHeaderData(eventData: SchedulerData | null, cotizacionId: string | null) {
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [proposedRange, setProposedRange] = useState<{ from: Date; to: Date } | null>(null);

  const filteredCotizaciones = useMemo(() => {
    if (!eventData?.cotizaciones) return [];
    if (!cotizacionId) return eventData.cotizaciones;
    return eventData.cotizaciones.filter(cot => cot.id === cotizacionId);
  }, [eventData?.cotizaciones, cotizacionId]);

  const taskStats = useMemo((): SchedulerTaskStats => {
    const allItems: ItemWithTask[] = (filteredCotizaciones?.flatMap((cot) => (cot.cotizacion_items || []) as unknown as ItemWithTask[]) ?? []);
    const itemsWithTasks = allItems.filter((item): item is ItemWithTask & { scheduler_task: NonNullable<ItemWithTask['scheduler_task']> } => !!item.scheduler_task);
    const manualTasks = eventData?.scheduler?.tasks?.filter(t => t.cotizacion_item_id == null) ?? [];
    const total = itemsWithTasks.length + manualTasks.length;
    const unassigned = allItems.length - itemsWithTasks.length;

    let completed = 0;
    let delayed = 0;
    let inProcess = 0;
    let pending = 0;
    let withoutCrew = 0;

    itemsWithTasks.forEach(item => {
      if (!item.scheduler_task) return;
      if (!!item.scheduler_task.completed_at) completed++;
      else {
        const status = calculateTaskStatus({
          startDate: new Date(item.scheduler_task.start_date),
          endDate: new Date(item.scheduler_task.end_date),
          isCompleted: false,
        });
        if (status === 'DELAYED') delayed++;
        else if (status === 'IN_PROCESS') inProcess++;
        else pending++;
        if (!item.assigned_to_crew_member_id) withoutCrew++;
      }
    });

    manualTasks.forEach(t => {
      if (t.status === 'COMPLETED') completed++;
      else {
        const status = calculateTaskStatus({
          startDate: new Date(t.start_date),
          endDate: new Date(t.end_date),
          isCompleted: false,
        });
        if (status === 'DELAYED') delayed++;
        else if (status === 'IN_PROCESS') inProcess++;
        else pending++;
        if (!t.assigned_to_crew_member_id) withoutCrew++;
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage, delayed, inProcess, pending, unassigned, withoutCrew };
  }, [filteredCotizaciones, eventData?.scheduler?.tasks]);

  const validateDateRangeChange = useCallback((newRange: DateRange | undefined): boolean => {
    if (!newRange?.from || !newRange?.to || !filteredCotizaciones.length) return true;

    const rangeFrom = newRange.from;
    const rangeTo = newRange.to;
    const allItems: ItemWithTask[] = filteredCotizaciones.flatMap((cot) => (cot.cotizacion_items || []) as unknown as ItemWithTask[]);
    const itemsWithTasks = allItems.filter((item): item is ItemWithTask & { scheduler_task: NonNullable<ItemWithTask['scheduler_task']> } => !!item.scheduler_task);

    if (itemsWithTasks.length === 0) return true;

    const tasksOutsideRange = itemsWithTasks.filter(item => {
      const taskStart = new Date(item.scheduler_task.start_date);
      const taskEnd = new Date(item.scheduler_task.end_date);
      taskStart.setHours(0, 0, 0, 0);
      taskEnd.setHours(0, 0, 0, 0);
      const rangeStart = new Date(rangeFrom);
      const rangeEnd = new Date(rangeTo);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(0, 0, 0, 0);
      return taskStart < rangeStart || taskEnd > rangeEnd;
    });

    if (tasksOutsideRange.length > 0) {
      setConflictCount(tasksOutsideRange.length);
      setProposedRange({ from: rangeFrom, to: rangeTo });
      requestAnimationFrame(() => setConflictOpen(true));
      return false;
    }
    return true;
  }, [filteredCotizaciones]);

  const closeConflictModal = useCallback(() => {
    setConflictOpen(false);
    setConflictCount(0);
    setProposedRange(null);
  }, []);

  return {
    taskStats,
    filteredCotizaciones,
    validateDateRangeChange,
    conflict: { isOpen: conflictOpen && !!proposedRange, count: conflictCount, proposedRange, close: closeConflictModal },
  };
}
