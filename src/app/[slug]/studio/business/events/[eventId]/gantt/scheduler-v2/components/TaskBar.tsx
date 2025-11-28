'use client';

import React, { useCallback, useState } from 'react';
import { Rnd, type RndDragEvent, type RndResizeEvent } from 'react-rnd';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import {
  getPositionFromDate,
  getDateFromPosition,
  getWidthFromDuration,
  normalizeDate,
  isDateInRange,
} from '../utils/coordinate-utils';
import {
  calculateTaskStatus,
  getStatusColor,
} from '../utils/task-status-utils';

interface TaskBarProps {
  taskId: string;
  itemId: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  dateRange: DateRange;
  onUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onClick?: (e: React.MouseEvent) => void;
}

export const TaskBar = React.memo(({
  taskId,
  itemId,
  taskName,
  startDate,
  endDate,
  isCompleted,
  dateRange,
  onUpdate,
  onClick,
}: TaskBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  const status = calculateTaskStatus({
    startDate: localStartDate,
    endDate: localEndDate,
    isCompleted,
  });

  const statusColor = getStatusColor(status);
  const initialX = getPositionFromDate(localStartDate, dateRange);
  const width = getWidthFromDuration(localStartDate, localEndDate);

  // Manejar drag (movimiento horizontal)
  const handleDragStop = useCallback(
    async (_e: RndDragEvent, d: { x: number; y: number }) => {
      const newStartDate = getDateFromPosition(d.x, dateRange);
      
      // Validar que esté dentro del rango
      if (!isDateInRange(newStartDate, dateRange)) {
        return;
      }

      // Calcular nueva fecha de fin manteniendo la duración
      const durationMs = localEndDate.getTime() - localStartDate.getTime();
      const newEndDate = new Date(newStartDate.getTime() + durationMs);

      // Validar que la fecha de fin no salga del rango
      if (!isDateInRange(newEndDate, dateRange)) {
        return;
      }

      setIsUpdating(true);
      try {
        setLocalStartDate(newStartDate);
        setLocalEndDate(newEndDate);
        await onUpdate(taskId, newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating task position:', error);
        // Revertir en caso de error
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      } finally {
        setIsUpdating(false);
      }
    },
    [taskId, localStartDate, localEndDate, dateRange, onUpdate, startDate, endDate]
  );

  // Manejar resize (cambio de duración)
  const handleResizeStop = useCallback(
    async (
      _e: React.SyntheticEvent,
      _direction: string,
      _ref: HTMLElement,
      _delta: { height: number; width: number },
      position: { x: number; y: number }
    ) => {
      const newStartDate = getDateFromPosition(position.x, dateRange);
      const newWidth = _ref.offsetWidth;
      
      // Convertir ancho a duración en días
      const newDurationDays = Math.max(1, Math.round(newWidth / 60));
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + newDurationDays - 1);

      // Validar que las fechas estén dentro del rango
      if (!isDateInRange(newStartDate, dateRange) || !isDateInRange(newEndDate, dateRange)) {
        return;
      }

      setIsUpdating(true);
      try {
        setLocalStartDate(newStartDate);
        setLocalEndDate(newEndDate);
        await onUpdate(taskId, newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating task duration:', error);
        // Revertir en caso de error
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      } finally {
        setIsUpdating(false);
      }
    },
    [taskId, dateRange, onUpdate, startDate, endDate]
  );

  return (
    <Rnd
      key={`${taskId}-${itemId}`}
      default={{
        x: initialX,
        y: 6,
        width: Math.max(width, 60),
        height: 48,
      }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      dragAxis="x"
      dragGrid={[60, 0]}
      resizeGrid={[60, 0]}
      enableResizing={{
        top: false,
        bottom: false,
        left: true,
        right: true,
        topLeft: false,
        topRight: false,
        bottomLeft: false,
        bottomRight: false,
      }}
      bounds="parent"
      className={`
        ${statusColor}
        rounded px-2 py-1 shadow-md cursor-grab active:cursor-grabbing
        transition-colors
        ${isUpdating ? 'opacity-75' : 'opacity-100'}
        flex items-center justify-center text-xs font-medium text-white
        overflow-hidden whitespace-nowrap
      `}
      onClick={onClick}
    >
      <div
        className="w-full text-center truncate"
        title={`${taskName}\n${format(localStartDate, 'd MMM', { locale: es })} - ${format(localEndDate, 'd MMM', { locale: es })}`}
      >
        {taskName}
      </div>
    </Rnd>
  );
});

TaskBar.displayName = 'TaskBar';

