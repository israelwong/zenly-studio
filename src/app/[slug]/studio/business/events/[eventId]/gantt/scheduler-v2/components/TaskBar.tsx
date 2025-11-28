'use client';

import React, { useCallback, useState, useEffect } from 'react';
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
import { TaskBarPopover } from './TaskBarPopover';

interface TaskBarProps {
  taskId: string;
  itemId: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  dateRange: DateRange;
  onUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
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
  onDelete,
  onToggleComplete,
  onClick,
}: TaskBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // Track movimiento real
  const isDraggingRef = React.useRef(false);
  const dragStartPosRef = React.useRef({ x: 0, width: 0 });

  // Sincronizar estado local cuando las props cambien (actualización optimista externa)
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  const status = calculateTaskStatus({
    startDate: localStartDate,
    endDate: localEndDate,
    isCompleted,
  });

  const statusColor = getStatusColor(status);
  const initialX = getPositionFromDate(localStartDate, dateRange);
  const width = getWidthFromDuration(localStartDate, localEndDate);

  // Manejar drag start - guardar posición inicial
  const handleDragStart = useCallback((_e: RndDragEvent, d: { x: number; y: number }) => {
    dragStartPosRef.current.x = d.x;
    isDraggingRef.current = false; // No es drag hasta que haya movimiento
  }, []);

  // Manejar drag stop - detectar movimiento real
  const handleDragStop = useCallback(
    async (_e: RndDragEvent, d: { x: number; y: number }) => {
      // Detectar si hubo movimiento real (threshold de 5px)
      const hasMoved = Math.abs(d.x - dragStartPosRef.current.x) > 5;
      
      if (hasMoved) {
        isDraggingRef.current = true; // Marcar como drag real
      }
      
      if (!hasMoved) {
        // No hubo movimiento, fue solo un click
        isDraggingRef.current = false;
        return;
      }

      const newStartDate = getDateFromPosition(d.x, dateRange);
      
      // Validar que esté dentro del rango
      if (!isDateInRange(newStartDate, dateRange)) {
        setTimeout(() => isDraggingRef.current = false, 150);
        return;
      }

      // Calcular nueva fecha de fin manteniendo la duración
      const durationMs = localEndDate.getTime() - localStartDate.getTime();
      const newEndDate = new Date(newStartDate.getTime() + durationMs);

      // Validar que la fecha de fin no salga del rango
      if (!isDateInRange(newEndDate, dateRange)) {
        setTimeout(() => isDraggingRef.current = false, 150);
        return;
      }

      setIsUpdating(true);
      try {
        setLocalStartDate(newStartDate);
        setLocalEndDate(newEndDate);
        await onUpdate(taskId, newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating task position:', error);
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      } finally {
        setIsUpdating(false);
        // Mantener flag por 200ms para bloquear onClick
        setTimeout(() => isDraggingRef.current = false, 200);
      }
    },
    [taskId, localStartDate, localEndDate, dateRange, onUpdate, startDate, endDate]
  );

  // Manejar resize start - guardar ancho inicial
  const handleResizeStart = useCallback((_e: React.SyntheticEvent, _direction: string, ref: HTMLElement) => {
    dragStartPosRef.current.width = ref.offsetWidth;
    isDraggingRef.current = false; // No es resize hasta que haya cambio
  }, []);

  // Manejar resize stop - detectar cambio real
  const handleResizeStop = useCallback(
    async (
      _e: React.SyntheticEvent,
      _direction: string,
      _ref: HTMLElement,
      _delta: { height: number; width: number },
      position: { x: number; y: number }
    ) => {
      const newWidth = _ref.offsetWidth;
      
      // Detectar si hubo cambio real (threshold de 10px = grid snap)
      const hasResized = Math.abs(newWidth - dragStartPosRef.current.width) > 10;
      
      if (hasResized) {
        isDraggingRef.current = true; // Marcar como resize real
      }
      
      if (!hasResized) {
        // No hubo resize, fue solo un click
        isDraggingRef.current = false;
        return;
      }

      const newStartDate = getDateFromPosition(position.x, dateRange);
      
      // Convertir ancho a duración en días
      const newDurationDays = Math.max(1, Math.round(newWidth / 60));
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + newDurationDays - 1);

      // Validar que las fechas estén dentro del rango
      if (!isDateInRange(newStartDate, dateRange) || !isDateInRange(newEndDate, dateRange)) {
        setTimeout(() => isDraggingRef.current = false, 150);
        return;
      }

      setIsUpdating(true);
      try {
        setLocalStartDate(newStartDate);
        setLocalEndDate(newEndDate);
        await onUpdate(taskId, newStartDate, newEndDate);
      } catch (error) {
        console.error('Error updating task duration:', error);
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      } finally {
        setIsUpdating(false);
        // Mantener flag por 200ms para bloquear onClick
        setTimeout(() => isDraggingRef.current = false, 200);
      }
    },
    [taskId, dateRange, onUpdate, startDate, endDate]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (onDelete) {
      await onDelete(id);
    }
  }, [onDelete]);

  const handleToggleComplete = useCallback(async (id: string, completed: boolean) => {
    if (onToggleComplete) {
      await onToggleComplete(id, completed);
    }
  }, [onToggleComplete]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir propagación al row
    
    // Solo abrir popover si NO hubo drag/resize
    if (!isDraggingRef.current) {
      setPopoverOpen(true);
    }
    
    onClick?.(e);
  }, [onClick]);

  return (
    <Rnd
      key={`${taskId}-${itemId}`}
      default={{
        x: initialX,
        y: 6,
        width: Math.max(width, 60),
        height: 48,
      }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStart={handleResizeStart}
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
    >
      <TaskBarPopover
        taskId={taskId}
        taskName={taskName}
        startDate={localStartDate}
        endDate={localEndDate}
        isCompleted={isCompleted}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        onDelete={handleDelete}
        onToggleComplete={handleToggleComplete}
      >
        <div
          className="w-full h-full flex items-center justify-center text-center truncate"
          title={`${taskName}\n${format(localStartDate, 'd MMM', { locale: es })} - ${format(localEndDate, 'd MMM', { locale: es })}`}
          onClick={handleClick}
        >
          {taskName}
        </div>
      </TaskBarPopover>
    </Rnd>
  );
});

TaskBar.displayName = 'TaskBar';

