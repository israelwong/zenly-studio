'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Rnd, type RndDragEvent } from 'react-rnd';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import {
  getPositionFromDate,
  getDateFromPosition,
  getWidthFromDuration,
  isDateInRange,
} from '../utils/coordinate-utils';
import {
  calculateTaskStatus,
  getStatusColor,
} from '../utils/task-status-utils';
import { TaskBarContextMenu } from './TaskBarContextMenu';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface TaskBarProps {
  taskId: string;
  itemId: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  hasCrewMember?: boolean;
  dateRange: DateRange;
  studioSlug?: string;
  item?: CotizacionItem;
  onUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const TaskBar = React.memo(({
  taskId,
  itemId,
  taskName,
  startDate,
  endDate,
  isCompleted,
  hasCrewMember = false,
  dateRange,
  studioSlug,
  item,
  onUpdate,
  onDelete,
  onToggleComplete,
  onItemUpdate,
  onClick,
}: TaskBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Track movimiento real para prevenir context menu durante drag/resize
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

  const statusColor = getStatusColor(status, hasCrewMember);
  const initialX = getPositionFromDate(localStartDate, dateRange);
  const width = getWidthFromDuration(localStartDate, localEndDate);

  // Manejar drag start - guardar posición inicial
  const handleDragStart = useCallback((_e: RndDragEvent, d: { x: number; y: number }) => {
    dragStartPosRef.current.x = d.x;
  }, []);

  // Manejar drag stop - solo actualizar si hubo movimiento real
  const handleDragStop = useCallback(
    (_e: RndDragEvent, d: { x: number; y: number }) => {
      // Detectar si hubo movimiento real (threshold de 5px)
      const hasMoved = Math.abs(d.x - dragStartPosRef.current.x) > 5;

      if (!hasMoved) {
        return; // No hubo movimiento, ignorar
      }

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
      setLocalStartDate(newStartDate);
      setLocalEndDate(newEndDate);
      onUpdate(taskId, newStartDate, newEndDate).catch(() => {
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      }).finally(() => {
        setIsUpdating(false);
      });
    },
    [taskId, localStartDate, localEndDate, dateRange, onUpdate, startDate, endDate]
  );

  // Manejar resize start - guardar ancho inicial
  const handleResizeStart = useCallback((_e: React.SyntheticEvent, _direction: string, ref: HTMLElement) => {
    dragStartPosRef.current.width = ref.offsetWidth;
  }, []);

  // Manejar resize stop - solo actualizar si hubo cambio real
  const handleResizeStop = useCallback(
    (
      _e: MouseEvent | TouchEvent,
      _direction: string,
      _ref: HTMLElement,
      _delta: { height: number; width: number },
      position: { x: number; y: number }
    ) => {
      const rawWidth = _ref.offsetWidth;

      // Forzar ancho mínimo de 60px (1 día) y redondear a múltiplos de 60px
      const snappedWidth = Math.max(60, Math.round(rawWidth / 60) * 60);

      // Detectar si hubo cambio real (threshold de 10px = grid snap)
      const hasResized = Math.abs(snappedWidth - dragStartPosRef.current.width) > 10;

      if (!hasResized) {
        return; // No hubo resize, ignorar
      }

      const newStartDate = getDateFromPosition(position.x, dateRange);

      // Convertir ancho a duración en días (mínimo 1 día)
      const newDurationDays = Math.max(1, snappedWidth / 60);
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + newDurationDays - 1);

      // Validar que las fechas estén dentro del rango
      if (!isDateInRange(newStartDate, dateRange) || !isDateInRange(newEndDate, dateRange)) {
        return;
      }

      setIsUpdating(true);
      setLocalStartDate(newStartDate);
      setLocalEndDate(newEndDate);
      onUpdate(taskId, newStartDate, newEndDate).catch(() => {
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      }).finally(() => {
        setIsUpdating(false);
      });
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

  return (
    <TaskBarContextMenu
      taskId={taskId}
      taskName={taskName}
      startDate={localStartDate}
      endDate={localEndDate}
      isCompleted={isCompleted}
      itemId={itemId}
      studioSlug={studioSlug}
      item={item}
      onDelete={handleDelete}
      onToggleComplete={handleToggleComplete}
      onItemUpdate={onItemUpdate}
    >
      <Rnd
        key={`${taskId}-${itemId}`}
        default={{
          x: initialX,
          y: 6,
          width: Math.max(width, 60),
          height: 48,
        }}
        minWidth={60}
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
        <div
          className="w-full h-full flex items-center justify-center text-center truncate pointer-events-none"
          title={`${taskName}\n${format(localStartDate, 'd MMM', { locale: es })} - ${format(localEndDate, 'd MMM', { locale: es })}`}
        >
          {taskName}
        </div>
      </Rnd>
    </TaskBarContextMenu>
  );
});

TaskBar.displayName = 'TaskBar';

