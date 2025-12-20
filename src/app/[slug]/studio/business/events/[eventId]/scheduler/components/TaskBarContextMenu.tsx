'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2, CheckCircle2, Calendar, Circle, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SelectCrewModal } from './SelectCrewModal';
import { asignarCrewAItem, obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useSchedulerItemSync } from '../hooks/useSchedulerItemSync';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface TaskBarContextMenuProps {
  taskId: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  itemId?: string;
  studioSlug?: string;
  item?: CotizacionItem;
  children: React.ReactNode;
  onDelete: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, isCompleted: boolean) => Promise<void>;
  onItemUpdate?: (updatedItem: CotizacionItem) => void;
}

export function TaskBarContextMenu({
  taskId,
  taskName,
  startDate,
  endDate,
  isCompleted,
  itemId,
  studioSlug,
  item,
  children,
  onDelete,
  onToggleComplete,
  onItemUpdate,
}: TaskBarContextMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);

  // Crear item mínimo válido si no tenemos item (para evitar hooks condicionales)
  // El hook necesita un item válido, pero si no tenemos onItemUpdate, no usaremos updateCrewMember
  const minimalItem: CotizacionItem = item || ({
    id: itemId || '',
    assigned_to_crew_member_id: null,
    assigned_to_crew_member: null,
  } as CotizacionItem);

  // Siempre llamar al hook (regla de React)
  const { localItem, updateCrewMember } = useSchedulerItemSync(
    minimalItem,
    onItemUpdate
  );

  // Usar el item real si existe, sino usar el localItem del hook
  const effectiveItem = item || localItem;
  const hasCrewMember = !!effectiveItem?.assigned_to_crew_member_id;

  // Solo usar updateCrewMember si tenemos onItemUpdate (actualización optimista)
  const canUseOptimisticUpdate = !!onItemUpdate && !!item;

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

  const handleAssignCrew = async (crewMemberId: string | null) => {
    if (!itemId || !studioSlug || !effectiveItem) return;

    // Si tenemos onItemUpdate y item, usar actualización optimista
    if (canUseOptimisticUpdate && updateCrewMember) {
      try {
        // Cargar miembros para obtener datos del seleccionado
        const membersResult = await obtenerCrewMembers(studioSlug);
        const selectedMember = crewMemberId && membersResult.success && membersResult.data
          ? membersResult.data.find(m => m.id === crewMemberId)
          : null;

        await updateCrewMember(
          crewMemberId,
          selectedMember ? {
            id: selectedMember.id,
            name: selectedMember.name,
            tipo: selectedMember.tipo,
          } : null,
          async () => {
            const result = await asignarCrewAItem(studioSlug, itemId, crewMemberId);
            if (!result.success) {
              throw new Error(result.error || 'Error al asignar personal');
            }
          }
        );

        toast.success(crewMemberId ? 'Personal asignado correctamente' : 'Asignación removida');
        setSelectCrewModalOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
      }
    } else {
      // Fallback sin actualización optimista
      try {
        const result = await asignarCrewAItem(studioSlug, itemId, crewMemberId);
        if (!result.success) {
          throw new Error(result.error || 'Error al asignar personal');
        }
        toast.success(crewMemberId ? 'Personal asignado correctamente' : 'Asignación removida');
        setSelectCrewModalOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
      }
    }
  };

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const dateText = isSameDay
    ? format(startDate, "d 'de' MMMM", { locale: es })
    : `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM", { locale: es })}`;

  return (
    <>
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
            {/* Asignar/Quitar personal */}
            {itemId && studioSlug && (
              <ContextMenuItem
                onClick={() => setSelectCrewModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              >
                {hasCrewMember ? (
                  <>
                    <UserMinus className="h-4 w-4 text-zinc-400" />
                    <span>Quitar personal</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 text-zinc-400" />
                    <span>Asignar personal</span>
                  </>
                )}
              </ContextMenuItem>
            )}

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

      {/* Modal para seleccionar/crear personal */}
      {itemId && studioSlug && (
        <SelectCrewModal
          isOpen={selectCrewModalOpen}
          onClose={() => setSelectCrewModalOpen(false)}
          onSelect={handleAssignCrew}
          studioSlug={studioSlug}
          currentMemberId={effectiveItem?.assigned_to_crew_member_id || null}
          title={hasCrewMember ? 'Cambiar asignación de personal' : 'Asignar personal'}
          description={hasCrewMember
            ? 'Selecciona un nuevo miembro del equipo o quita la asignación actual.'
            : 'Selecciona un miembro del equipo para asignar a esta tarea.'}
        />
      )}
    </>
  );
}

