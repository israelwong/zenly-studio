'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Rnd, type RndDragEvent } from 'react-rnd';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import {
  getPositionFromDate,
  getDateFromPosition,
  getWidthFromDuration,
  isDateInRange,
  COLUMN_WIDTH,
} from '../../utils/coordinate-utils';
import {
  calculateTaskStatus,
  getStatusColor,
} from '../../utils/task-status-utils';
import { TaskBarContextMenu } from '../task-actions/TaskBarContextMenu';
import { ZenBadge } from '@/components/ui/zen';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { ManualTaskPayload } from '../../utils/scheduler-section-stages';

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
  eventId?: string;
  item?: CotizacionItem;
  manualTask?: ManualTaskPayload;
  onUpdate: (taskId: string, startDate: Date, endDate: Date) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
  onManualTaskPatch?: (taskId: string, patch: import('../sidebar/SchedulerManualTaskPopover').ManualTaskPatch) => void;
  onClick?: (e: React.MouseEvent) => void;
  /** Power Bar: si true, aplica translateX(var(--bulk-drag-offset, 0px)) para arrastre por CSS */
  inBulkDragSegment?: boolean;
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
  eventId,
  item,
  manualTask,
  onUpdate,
  onDelete,
  onToggleComplete,
  onItemUpdate,
  onManualTaskPatch,
  onClick,
  inBulkDragSegment,
}: TaskBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [isResizing, setIsResizing] = useState(false);
  const [rndPosition, setRndPosition] = useState({ x: 0, y: 6 });
  const [rndSize, setRndSize] = useState({ width: 60, height: 48 });

  // Track movimiento real para prevenir context menu durante drag/resize
  const dragStartPosRef = React.useRef<{ x: number; width: number }>({ x: 0, width: 0 });

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
  const computedX = getPositionFromDate(localStartDate, dateRange);
  const computedWidth = Math.max(getWidthFromDuration(localStartDate, localEndDate), COLUMN_WIDTH);
  const position = isResizing ? rndPosition : { x: computedX, y: 6 };
  const size = isResizing ? rndSize : { width: computedWidth, height: 48 };

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

      // Calcular nueva fecha de fin manteniendo la duración usando métodos UTC
      const startDateOnly = new Date(Date.UTC(
        localStartDate.getUTCFullYear(),
        localStartDate.getUTCMonth(),
        localStartDate.getUTCDate()
      ));
      const endDateOnly = new Date(Date.UTC(
        localEndDate.getUTCFullYear(),
        localEndDate.getUTCMonth(),
        localEndDate.getUTCDate()
      ));
      const durationMs = endDateOnly.getTime() - startDateOnly.getTime();
      const newStartDateOnly = new Date(Date.UTC(
        newStartDate.getUTCFullYear(),
        newStartDate.getUTCMonth(),
        newStartDate.getUTCDate()
      ));
      const newEndDate = new Date(Date.UTC(
        newStartDateOnly.getUTCFullYear(),
        newStartDateOnly.getUTCMonth(),
        newStartDateOnly.getUTCDate(),
        12, 0, 0
      ));
      newEndDate.setUTCDate(newEndDate.getUTCDate() + Math.round(durationMs / (1000 * 60 * 60 * 24)));

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

  // Manejar resize start - guardar ancho y posición inicial
  const handleResizeStart = useCallback((_e: React.SyntheticEvent, _direction: string, ref: HTMLElement) => {
    setIsResizing(true);
    const startX = getPositionFromDate(localStartDate, dateRange);
    const width = ref.offsetWidth;
    setRndPosition({ x: startX, y: 6 });
    setRndSize({ width, height: 48 });
    dragStartPosRef.current = { x: startX, width };
  }, [localStartDate, dateRange]);

  // Durante el drag: sin resizeGrid, valores raw de react-rnd para feedback visual fluido
  const handleResize = useCallback(
    (_e: MouseEvent | TouchEvent, _direction: string, ref: HTMLElement, _delta: { height: number; width: number }, position: { x: number; y: number }) => {
      const rawWidth = Math.max(COLUMN_WIDTH, ref.offsetWidth);
      setRndPosition({ x: position.x, y: 6 });
      setRndSize({ width: rawWidth, height: 48 });
    },
    []
  );

  // Manejar resize stop - snap al grid solo al soltar, luego calcular fechas y persistir
  const handleResizeStop = useCallback(
    (
      _e: MouseEvent | TouchEvent,
      direction: string,
      ref: HTMLElement,
      _delta: { height: number; width: number },
      position: { x: number; y: number }
    ) => {
      const rawWidth = ref.offsetWidth;
      const rawX = position.x;

      // Snap al grid solo al soltar
      const snappedWidth = Math.max(COLUMN_WIDTH, Math.round(rawWidth / COLUMN_WIDTH) * COLUMN_WIDTH);
      let snappedX: number;

      if (direction.includes('left')) {
        const rightEdge = rawX + rawWidth;
        snappedX = Math.round((rightEdge - snappedWidth) / COLUMN_WIDTH) * COLUMN_WIDTH;
      } else {
        snappedX = Math.round(rawX / COLUMN_WIDTH) * COLUMN_WIDTH;
      }

      setRndPosition({ x: snappedX, y: 6 });
      setRndSize({ width: snappedWidth, height: 48 });

      const newStartDate = getDateFromPosition(snappedX, dateRange);
      const newDurationDays = Math.max(1, Math.round(snappedWidth / COLUMN_WIDTH));
      const newEndDate = addDays(newStartDate, newDurationDays - 1);

      if (!isDateInRange(newStartDate, dateRange) || !isDateInRange(newEndDate, dateRange)) {
        setIsResizing(false);
        return;
      }

      const norm = (d: Date) =>
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
      const startNorm = norm(newStartDate);
      const endNorm = norm(newEndDate);
      const durationInclusive = Math.max(1, differenceInCalendarDays(endNorm, startNorm) + 1);

      if (durationInclusive < 1) {
        setIsResizing(false);
        return;
      }

      setIsResizing(false);
      setIsUpdating(true);
      setLocalStartDate(startNorm);
      setLocalEndDate(endNorm);
      if (manualTask && onManualTaskPatch) {
        onManualTaskPatch(taskId, {
          start_date: startNorm,
          end_date: endNorm,
          duration_days: durationInclusive,
        });
      }
      onUpdate(taskId, startNorm, endNorm).catch(() => {
        setLocalStartDate(startDate);
        setLocalEndDate(endDate);
      }).finally(() => {
        setIsUpdating(false);
      });
    },
    [taskId, dateRange, onUpdate, startDate, endDate, manualTask, onManualTaskPatch]
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
      eventId={eventId}
      item={item}
      manualTask={manualTask}
      onDelete={handleDelete}
      onToggleComplete={handleToggleComplete}
      onItemUpdate={onItemUpdate}
      onManualTaskPatch={onManualTaskPatch}
    >
      {/* Wrapper exterior: recibe el transform por CSS; no interfiere con react-rnd */}
      <div
        className="outer-drag-wrapper"
        data-bulk-id={taskId}
        data-in-bulk-segment={inBulkDragSegment ? 'true' : 'false'}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <Rnd
          key={`${taskId}-${itemId}-${localEndDate.getTime()}-${localStartDate.getTime()}`}
          position={position}
          size={size}
          minWidth={60}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
        dragAxis="x"
        dragGrid={[60, 0]}
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
        <div className={`w-full h-full relative ${inBulkDragSegment ? 'opacity-40' : ''}`}>
          <div
            className="w-full h-full flex items-center justify-between gap-1.5 px-1.5 pointer-events-none"
            title={`${taskName}\n${format(localStartDate, 'd MMM', { locale: es })} - ${format(localEndDate, 'd MMM', { locale: es })}`}
          >
          <span className="flex-1 truncate text-center text-xs font-medium">{taskName}</span>
          
          {/* Indicadores de sincronización */}
          <div className="flex items-center gap-1 shrink-0">
            {item?.scheduler_task && (
              <>
                {/* Icono de estado de sincronización */}
                {item.scheduler_task.sync_status === 'INVITED' ? (
                  <Calendar className="h-3 w-3 text-emerald-400" title="✅ Sincronizado con Google Calendar - Invitación enviada" />
                ) : item.scheduler_task.sync_status === 'PUBLISHED' ? (
                  <Calendar className="h-3 w-3 text-blue-400" title="📋 Publicado en ZEN (no sincronizado con Google Calendar)" />
                ) : (
                  <Calendar className="h-3 w-3 text-zinc-500" title="📝 Borrador - Usa 'Publicar Cronograma' para sincronizar" />
                )}

                {/* Badge de estado de invitación */}
                {item.scheduler_task.sync_status === 'INVITED' && item.scheduler_task.invitation_status && (
                  <>
                    {item.scheduler_task.invitation_status === 'ACCEPTED' && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" title="Invitación aceptada" />
                    )}
                    {item.scheduler_task.invitation_status === 'DECLINED' && (
                      <XCircle className="h-3 w-3 text-red-400" title="Invitación rechazada" />
                    )}
                    {item.scheduler_task.invitation_status === 'PENDING' && (
                      <Clock className="h-3 w-3 text-amber-400" title="Esperando respuesta" />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </Rnd>
      </div>
    </TaskBarContextMenu>
  );
});

TaskBar.displayName = 'TaskBar';

