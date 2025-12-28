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
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { asignarCrewAItem, obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useSchedulerItemSync } from '../../hooks/useSchedulerItemSync';
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
  eventId?: string;
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
  eventId,
  item,
  children,
  onDelete,
  onToggleComplete,
  onItemUpdate,
}: TaskBarContextMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);
  const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
  const [showRemoveCrewConfirm, setShowRemoveCrewConfirm] = useState(false);
  const [isRemovingCrew, setIsRemovingCrew] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Validar antes de eliminar
  const handleDeleteClick = () => {
    // Si no tiene personal asignado, eliminar directamente
    if (!hasCrewMember) {
      handleDelete();
      return;
    }

    // Si tiene personal, mostrar confirmación
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(taskId);
      setShowDeleteConfirm(false);
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
        // Disparar evento para actualizar PublicationBar
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
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
        // Disparar evento para actualizar PublicationBar
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al asignar personal');
      }
    }
  };

  const handleRemoveCrew = async () => {
    if (!itemId || !studioSlug || !effectiveItem) return;
    
    setIsRemovingCrew(true);
    try {
      await handleAssignCrew(null);
      setShowRemoveCrewConfirm(false);
      // El evento ya se dispara en handleAssignCrew
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al quitar personal');
    } finally {
      setIsRemovingCrew(false);
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

            {/* Asignar personal */}
            {itemId && studioSlug && !hasCrewMember && (
              <ContextMenuItem
                onClick={() => setSelectCrewModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              >
                <UserPlus className="h-4 w-4 text-zinc-400" />
                <span>Asignar personal</span>
              </ContextMenuItem>
            )}

            {/* Cambiar personal (si ya tiene asignado) */}
            {itemId && studioSlug && hasCrewMember && (
              <ContextMenuItem
                onClick={() => setSelectCrewModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
              >
                <UserPlus className="h-4 w-4 text-zinc-400" />
                <span>Cambiar personal</span>
              </ContextMenuItem>
            )}

            {/* Quitar personal (si ya tiene asignado) */}
            {itemId && studioSlug && hasCrewMember && (
              <ContextMenuItem
                onClick={() => setShowRemoveCrewConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer focus:bg-red-500/10 focus:text-red-300 text-red-400"
              >
                <UserMinus className="h-4 w-4" />
                <span>Quitar personal</span>
              </ContextMenuItem>
            )}

            {/* Eliminar slot */}
            <ContextMenuItem
              onClick={handleDeleteClick}
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
            ? 'Selecciona un nuevo miembro del equipo para esta tarea.'
            : 'Selecciona un miembro del equipo para asignar a esta tarea.'}
          eventId={eventId}
          taskStartDate={startDate}
          taskEndDate={endDate}
          taskId={taskId}
        />
      )}

      {/* Modal de confirmación para quitar personal */}
      <ZenConfirmModal
        isOpen={showRemoveCrewConfirm}
        onClose={() => setShowRemoveCrewConfirm(false)}
        onConfirm={handleRemoveCrew}
        title="¿Quitar personal de esta tarea?"
        description={
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              Se quitará la asignación de personal de esta tarea.
            </p>
            {effectiveItem?.assigned_to_crew_member && (
              <p className="text-sm text-zinc-400">
                Personal actual: <strong className="text-zinc-200">{effectiveItem.assigned_to_crew_member.name}</strong>
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-2">
              La tarea quedará como borrador y deberás publicar el cronograma nuevamente si ya estaba sincronizado.
            </p>
          </div>
        }
        confirmText="Sí, quitar personal"
        cancelText="Cancelar"
        variant="destructive"
        loading={isRemovingCrew}
        loadingText="Quitando..."
      />

      {/* Modal de confirmación para vaciar slot */}
      <ZenConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="¿Vaciar slot de esta tarea?"
        description={
          <div className="space-y-2">
            {(() => {
              const hasInvitation = effectiveItem?.scheduler_task?.invitation_status === 'PENDING' || 
                                   effectiveItem?.scheduler_task?.invitation_status === 'ACCEPTED';
              const syncStatus = effectiveItem?.scheduler_task?.sync_status;
              const isInvited = syncStatus === 'INVITED';

              return (
                <>
                  {hasCrewMember && (
                    <p className="text-sm text-zinc-300">
                      Esta tarea tiene personal asignado. ¿Aún así deseas eliminarla?
                    </p>
                  )}
                  {effectiveItem?.assigned_to_crew_member && (
                    <p className="text-sm text-zinc-400">
                      Personal asignado: <strong className="text-zinc-200">{effectiveItem.assigned_to_crew_member.name}</strong>
                    </p>
                  )}
                  {(hasInvitation || isInvited) && (
                    <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 mt-2">
                      <p className="text-sm text-amber-300 font-medium mb-1">
                        ⚠️ Advertencia importante
                      </p>
                      <p className="text-xs text-amber-300/80">
                        Esta tarea tiene una invitación {hasInvitation 
                          ? (effectiveItem?.scheduler_task?.invitation_status === 'ACCEPTED' ? 'aceptada' : 'pendiente')
                          : 'enviada'} a Google Calendar.
                      </p>
                      <p className="text-xs text-amber-300/80 mt-1">
                        Si vacías el slot, se quitará el personal asignado y se cancelará la invitación en Google Calendar.
                      </p>
                    </div>
                  )}
                  {!hasInvitation && !isInvited && hasCrewMember && (
                    <p className="text-xs text-zinc-500 mt-2">
                      Se quitará el personal asignado y el slot quedará disponible.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        }
        confirmText="Sí, vaciar slot"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
        loadingText="Eliminando..."
        zIndex={100010}
      />
    </>
  );
}

