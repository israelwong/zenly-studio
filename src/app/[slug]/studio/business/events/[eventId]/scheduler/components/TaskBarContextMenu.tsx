'use client';

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2, CheckCircle2, Calendar, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskBarContextMenuProps {
  taskId: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  children: React.ReactNode;
  onDelete: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, isCompleted: boolean) => Promise<void>;
}

export function TaskBarContextMenu({
  taskId,
  taskName,
  startDate,
  endDate,
  isCompleted,
  children,
  onDelete,
  onToggleComplete,
}: TaskBarContextMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(taskId);
    } catch (error) {
      // Error silencioso al eliminar tarea
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleComplete = async () => {
    setIsTogglingComplete(true);
    try {
      await onToggleComplete(taskId, !isCompleted);
    } catch (error) {
      // Error silencioso al cambiar estado
    } finally {
      setIsTogglingComplete(false);
    }
  };

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const dateText = isSameDay
    ? format(startDate, "d 'de' MMMM", { locale: es })
    : `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM", { locale: es })}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-72 bg-zinc-900 border-zinc-800">
        {/* Header con info de la tarea */}
        <div className="px-3 py-2 border-b border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-200 truncate mb-1">
            {taskName}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            <span>{dateText}</span>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Completada</span>
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="py-1">
          {/* Toggle completado */}
          <ContextMenuItem
            onClick={handleToggleComplete}
            disabled={isTogglingComplete}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleted ? (
              <>
                <Circle className="h-4 w-4 text-zinc-400" />
                <span>Marcar como pendiente</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Marcar como completada</span>
              </>
            )}
          </ContextMenuItem>

          {/* Eliminar slot */}
          <ContextMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-red-500/10 focus:text-red-300 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'Eliminando...' : 'Vaciar slot'}</span>
          </ContextMenuItem>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}

