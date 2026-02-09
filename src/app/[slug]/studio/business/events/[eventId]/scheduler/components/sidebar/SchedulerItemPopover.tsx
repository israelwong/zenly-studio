'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenBadge, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { asignarCrewAItem, obtenerCrewMembers, actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { X, CheckCircle2, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssignCrewBeforeCompleteModal } from '../task-actions/AssignCrewBeforeCompleteModal';
import { useSchedulerItemSync } from '../../hooks/useSchedulerItemSync';
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';

interface CrewMember {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tipo: string;
    status: string;
    fixed_salary: number | null;
    variable_salary: number | null;
}

interface SchedulerItemPopoverProps {
    item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
    studioSlug: string;
    eventId: string;
    children: React.ReactNode;
    onItemUpdate?: (updatedItem: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]) => void;
    onTaskToggleComplete?: (taskId: string, isCompleted: boolean) => Promise<void>;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(value);
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getSalaryType(member: CrewMember | undefined): 'fixed' | 'variable' | null {
    if (!member) return null;
    if (member.fixed_salary !== null && member.fixed_salary > 0) {
        return 'fixed';
    }
    if (member.variable_salary !== null && member.variable_salary > 0) {
        return 'variable';
    }
    return null;
}

export function SchedulerItemPopover({ item, studioSlug, eventId, children, onItemUpdate, onTaskToggleComplete }: SchedulerItemPopoverProps) {
    const router = useRouter();
    // Hook de sincronización (optimista + servidor)
    const { localItem, updateCrewMember, updateCompletionStatus } = useSchedulerItemSync(item, onItemUpdate);

    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<CrewMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
    const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);
    const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);
    const [showFixedSalaryConfirmModal, setShowFixedSalaryConfirmModal] = useState(false);

    // Usar localItem (sincronizado con servidor)
    const selectedMemberId = localItem.assigned_to_crew_member_id;
    const isTaskCompleted = !!localItem.scheduler_task?.completed_at;

    const isService = localItem.profit_type === 'servicio' || localItem.profit_type === 'service';
    const itemName = localItem.name || 'Sin nombre';
    const costoUnitario = localItem.cost ?? localItem.cost_snapshot ?? 0;
    const costoTotal = costoUnitario * localItem.quantity;

    const loadMembers = useCallback(async () => {
        try {
            setLoadingMembers(true);
            const result = await obtenerCrewMembers(studioSlug);
            if (result.success && result.data) {
                setMembers(result.data);
            }
        } catch {
            // Error silencioso
        } finally {
            setLoadingMembers(false);
        }
    }, [studioSlug]);

    // Cargar miembros cuando se abre el popover (solo para mostrar info del asignado)
    useEffect(() => {
        if (open && members.length === 0 && !loadingMembers) {
            loadMembers();
        }
    }, [open, members.length, loadingMembers, loadMembers]);

    // Cerrar popover cuando se elimina la tarea (ya no tiene scheduler_task)
    useEffect(() => {
        const hadTask = !!item.scheduler_task;
        const hasTaskNow = !!localItem.scheduler_task;

        // Si tenía tarea y ahora no la tiene, cerrar popover
        if (hadTask && !hasTaskNow && open) {
            setOpen(false);
        }
    }, [localItem.scheduler_task, item.scheduler_task, open]);

    const handleMemberSelect = async (memberId: string | null) => {
        const selectedMember = memberId ? members.find(m => m.id === memberId) : null;
        let payrollNotified = false;

        try {
            await updateCrewMember(
                memberId,
                selectedMember ? {
                    id: selectedMember.id,
                    name: selectedMember.name,
                    tipo: selectedMember.tipo,
                } : null,
                async () => {
                    const result = await asignarCrewAItem(studioSlug, localItem.id, memberId);
                    if (!result.success) {
                        throw new Error(result.error || 'Error al asignar personal');
                    }

                    // Si se asignó personal y la tarea está completada, mostrar notificación de nómina
                    if (memberId && isTaskCompleted && result.payrollResult) {
                        payrollNotified = true;
                        if (result.payrollResult.success && result.payrollResult.personalNombre) {
                            toast.success(`Personal asignado. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
                        } else {
                            toast.warning(`Personal asignado. No se generó pago de nómina: ${result.payrollResult.error || 'Error desconocido'}`);
                        }
                    }
                }
            );

            // Solo mostrar toast genérico si no se mostró el de nómina
            if (!payrollNotified) {
                toast.success(memberId ? 'Personal asignado correctamente' : 'Asignación removida');
            }
            // Recargar miembros para actualizar la lista
            await loadMembers();
            // Cerrar popover después de acción exitosa
            setOpen(false);
        } catch (error) {
            // Error ya manejado por updateCrewMember, no cerrar popover
        }
    };

    const handleRemoveAssignment = async () => {
        await handleMemberSelect(null);
    };

    const handleOpenSelectModal = () => {
        setOpen(false);
        setTimeout(() => {
            setSelectCrewModalOpen(true);
        }, 150);
    };

    const handleTaskCompletionToggle = async (checked: boolean) => {
        if (!localItem.scheduler_task?.id) return;

        // Si tenemos onTaskToggleComplete, usarlo directamente (igual que TaskBarContextMenu)
        // Esto asegura que se actualice localEventData de la misma manera
        if (onTaskToggleComplete) {
            setIsUpdatingCompletion(true);
            try {
                await onTaskToggleComplete(localItem.scheduler_task.id, checked);
                // Cerrar popover después de acción exitosa
                setOpen(false);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Error al actualizar tarea');
                // No cerrar popover en caso de error
            } finally {
                setIsUpdatingCompletion(false);
            }
            return;
        }

        // Fallback: usar el flujo anterior si no hay onTaskToggleComplete
        // Si se intenta completar pero no hay personal asignado, mostrar modal
        if (checked && !localItem.assigned_to_crew_member_id) {
            setOpen(false);
            setTimeout(() => {
                setAssignCrewModalOpen(true);
            }, 100);
            return;
        }

        // Si se intenta completar y tiene personal asignado, verificar si tiene sueldo fijo
        if (checked && localItem.assigned_to_crew_member_id) {
            const assignedMember = members.find(m => m.id === localItem.assigned_to_crew_member_id);
            const hasFixedSalary = assignedMember && getSalaryType(assignedMember) === 'fixed';

            if (hasFixedSalary) {
                // Mostrar modal de confirmación para sueldo fijo
                setShowFixedSalaryConfirmModal(true);
                return;
            }
        }

        // Si tiene honorarios variables o se está desmarcando, proceder normalmente
        await completeTask(checked, false);
    };

    const completeTask = async (checked: boolean, skipPayment: boolean) => {
        setIsUpdatingCompletion(true);

        try {
            await updateCompletionStatus(checked, async () => {
                const result = await actualizarSchedulerTask(
                    studioSlug,
                    eventId,
                    localItem.scheduler_task!.id,
                    {
                        isCompleted: checked,
                        assignedToCrewMemberId: localItem.assigned_to_crew_member_id || undefined,
                        skipPayroll: skipPayment,
                    }
                );

                if (result.success) {
                    // Disparar evento para actualizar PublicationBar
                    window.dispatchEvent(new CustomEvent('scheduler-task-updated'));

                    if (skipPayment && checked) {
                        toast.success('Tarea completada (sin generar pago de nómina)');
                    } else if (result.payrollResult?.success && result.payrollResult.personalNombre) {
                        toast.success(`Tarea ${checked ? 'completada' : 'marcada como pendiente'}. ${checked ? `Pago de nómina generado para ${result.payrollResult.personalNombre}` : 'Pago de nómina eliminado'}.`);
                    } else if (checked && result.payrollResult?.error) {
                        toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult.error}`);
                    } else {
                        toast.success(`Tarea ${checked ? 'completada' : 'marcada como pendiente'}`);
                    }
                } else {
                    throw new Error(result.error || 'Error al actualizar tarea');
                }
            });
            // Cerrar popover después de acción exitosa
            setOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al actualizar tarea');
            // No cerrar popover en caso de error
        }

        setIsUpdatingCompletion(false);
    };

    const handleConfirmFixedSalary = async () => {
        setShowFixedSalaryConfirmModal(false);
        await completeTask(true, false);
        // Cerrar popover después de completar (completeTask ya cierra si es exitoso)
    };

    const handleSkipPayment = async () => {
        setShowFixedSalaryConfirmModal(false);
        await completeTask(true, true);
        // Cerrar popover después de completar (completeTask ya cierra si es exitoso)
    };

    const handleAssignAndComplete = async (crewMemberId: string, skipPayment: boolean = false) => {
        if (!localItem.scheduler_task?.id) return;

        setIsUpdatingCompletion(true);

        try {
            const selectedMember = members.find(m => m.id === crewMemberId);

            // 1. Asignar personal (con actualización optimista)
            // Guardar el crew member para usarlo después
            const crewMemberData = selectedMember ? {
                id: selectedMember.id,
                name: selectedMember.name,
                tipo: selectedMember.tipo,
            } : null;

            await updateCrewMember(
                crewMemberId,
                crewMemberData,
                async () => {
                    const assignResult = await asignarCrewAItem(studioSlug, localItem.id, crewMemberId);
                    if (!assignResult.success) {
                        throw new Error(assignResult.error || 'Error al asignar personal');
                    }
                }
            );

            // 2. Completar tarea (con actualización optimista)
            // Nota: updateCompletionStatus preserva ...localItem que incluye assigned_to_crew_member
            // del updateCrewMember anterior, pero necesitamos asegurar que se propague correctamente
            await updateCompletionStatus(true, async () => {
                const result = await actualizarSchedulerTask(
                    studioSlug,
                    eventId,
                    localItem.scheduler_task!.id,
                    {
                        isCompleted: true,
                        assignedToCrewMemberId: crewMemberId,
                        skipPayroll: skipPayment,
                    }
                );

                if (result.success) {
                    setAssignCrewModalOpen(false);

                    if (skipPayment) {
                        toast.success('Personal asignado y tarea completada (sin generar pago de nómina)');
                    } else if (result.payrollResult?.success && result.payrollResult.personalNombre) {
                        toast.success(`Personal asignado y tarea completada. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
                    } else {
                        toast.warning(`Tarea completada y personal asignado. No se generó pago de nómina: ${result.payrollResult?.error || 'Error desconocido'}`);
                    }
                } else {
                    throw new Error(result.error || 'Error al completar la tarea');
                }
            });
            // Cerrar popover después de acción exitosa
            setOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al procesar');
            // No cerrar popover en caso de error
        }

        setIsUpdatingCompletion(false);
    };

    const handleCompleteWithoutPayment = async () => {
        if (!localItem.scheduler_task?.id) return;

        setIsUpdatingCompletion(true);

        try {
            await updateCompletionStatus(true, async () => {
                const result = await actualizarSchedulerTask(
                    studioSlug,
                    eventId,
                    localItem.scheduler_task!.id,
                    {
                        isCompleted: true,
                    }
                );

                if (result.success) {
                    setAssignCrewModalOpen(false);
                    toast.warning('Tarea completada. No se generó pago porque no hay personal asignado.');
                } else {
                    throw new Error(result.error || 'Error al actualizar el estado de la tarea');
                }
            });
            // Cerrar popover después de acción exitosa
            setOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al actualizar tarea');
            // No cerrar popover en caso de error
        }

        setIsUpdatingCompletion(false);
    };

    const hasTask = !!localItem.scheduler_task;
    const taskStartDate = localItem.scheduler_task ? new Date(localItem.scheduler_task.start_date) : null;
    const taskEndDate = localItem.scheduler_task ? new Date(localItem.scheduler_task.end_date) : null;

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {children}
                </PopoverTrigger>
                <PopoverContent
                    className="w-80 p-4 bg-zinc-900 border-zinc-800"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                >
                    <div className="space-y-4">
                        {/* Resumen en línea */}
                        <div className="text-xs text-zinc-400 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-xs text-[10px] font-light",
                                    isService ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                                )}>
                                    {isService ? 'Servicio' : 'Producto'}
                                </span>
                                <span className="text-zinc-300 font-medium">{itemName}</span>
                            </div>
                            <div className="text-zinc-400 text-xs flex items-center gap-2">
                                <span>Costo </span>
                                <span className="text-zinc-300">
                                    {costoUnitario > 0 ? formatCurrency(costoUnitario) : '—'}
                                </span>
                                <ZenBadge size="sm" className="text-[10px] bg-zinc-800 text-zinc-500">
                                    x{item.quantity}
                                </ZenBadge>
                                <span className="text-emerald-400 font-medium">
                                    {costoTotal > 0 ? formatCurrency(costoTotal) : '—'}
                                </span>
                            </div>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-zinc-800" />

                        {/* Estado de la tarea (si tiene slot asignado) */}
                        {hasTask && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">
                                        Programación:
                                    </label>
                                    <div className="text-xs text-zinc-500">
                                        {taskStartDate && taskEndDate ? (
                                            <span className="text-zinc-300">
                                                {format(taskStartDate, "d MMM", { locale: es })} - {format(taskEndDate, "d MMM", { locale: es })}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400">—</span>
                                        )}
                                    </div>

                                    {/* Checkbox de completado */}
                                    <div className="flex items-center gap-2 py-2">
                                        <Checkbox
                                            id={`task-completed-${item.id}`}
                                            checked={isTaskCompleted}
                                            onCheckedChange={handleTaskCompletionToggle}
                                            disabled={isUpdatingCompletion}
                                            className="border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <label
                                            htmlFor={`task-completed-${item.id}`}
                                            className={cn(
                                                "text-sm font-medium cursor-pointer select-none",
                                                isTaskCompleted ? "text-emerald-400" : "text-zinc-400",
                                                isUpdatingCompletion && "opacity-60"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {isUpdatingCompletion ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                                                ) : (
                                                    isTaskCompleted && <CheckCircle2 className="h-3.5 w-3.5" />
                                                )}
                                                <span>
                                                    {isUpdatingCompletion
                                                        ? (isTaskCompleted ? 'Desmarcando...' : 'Marcando...')
                                                        : 'Tarea completada'
                                                    }
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Separador */}
                                <div className="border-t border-zinc-800" />
                            </>
                        )}

                        {/* Mostrar personal asignado o sección de asignación */}
                        {selectedMemberId ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">
                                    Personal asignado:
                                </label>
                                {(() => {
                                    const assignedMember = members.find(m => m.id === selectedMemberId);
                                    return assignedMember ? (
                                        <div className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs flex items-center gap-1.5">
                                            <ZenAvatar className="h-6 w-6 shrink-0">
                                                <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                                                    {getInitials(assignedMember.name)}
                                                </ZenAvatarFallback>
                                            </ZenAvatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-zinc-300 truncate">{assignedMember.name}</div>
                                                <div className="text-[10px] text-zinc-500 truncate">
                                                    {assignedMember.tipo}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs text-zinc-400">
                                            Cargando...
                                        </div>
                                    );
                                })()}
                                <button
                                    onClick={handleRemoveAssignment}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-300"
                                >
                                    <X className="h-3 w-3" />
                                    <span>Quitar asignación</span>
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium text-zinc-400 block mb-2">
                                    Asignar personal:
                                </label>
                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenSelectModal}
                                    className="w-full gap-1.5 h-8 text-xs"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Seleccionar personal
                                </ZenButton>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Modal para seleccionar/crear personal */}
            <SelectCrewModal
                isOpen={selectCrewModalOpen}
                onClose={() => {
                    setSelectCrewModalOpen(false);
                    // Cerrar popover cuando se cierra el modal
                    setOpen(false);
                }}
                onSelect={handleMemberSelect}
                studioSlug={studioSlug}
                currentMemberId={selectedMemberId}
                eventId={eventId}
                taskStartDate={localItem.scheduler_task?.start_date ? new Date(localItem.scheduler_task.start_date) : undefined}
                taskEndDate={localItem.scheduler_task?.end_date ? new Date(localItem.scheduler_task.end_date) : undefined}
                taskId={localItem.scheduler_task?.id}
            />

            {/* Modal para asignar personal antes de completar */}
            {localItem.scheduler_task && (
                <AssignCrewBeforeCompleteModal
                    isOpen={assignCrewModalOpen}
                    onClose={() => {
                        setAssignCrewModalOpen(false);
                        // Cerrar popover cuando se cierra el modal
                        setOpen(false);
                    }}
                    onCompleteWithoutPayment={handleCompleteWithoutPayment}
                    onAssignAndComplete={handleAssignAndComplete}
                    studioSlug={studioSlug}
                    itemId={localItem.id}
                    itemName={itemName}
                    costoTotal={costoTotal}
                />
            )}

            {/* Modal de confirmación para sueldo fijo */}
            <ZenConfirmModal
                isOpen={showFixedSalaryConfirmModal}
                onClose={async () => {
                    // Al cerrar con el botón cancelar, completar sin pasar a pago
                    await handleSkipPayment();
                    // Cerrar popover cuando se cierra el modal
                    setOpen(false);
                }}
                onConfirm={async () => {
                    await handleConfirmFixedSalary();
                    // Cerrar popover después de confirmar
                    setOpen(false);
                }}
                title="¿Deseas pasar a pago?"
                description={
                    <div className="space-y-2">
                        <p className="text-sm text-zinc-300">
                            Este miembro del equipo cuenta con <strong className="text-amber-400">sueldo fijo</strong>.
                        </p>
                        <p className="text-sm text-zinc-400">
                            ¿Deseas generar el pago de nómina para esta tarea?
                        </p>
                    </div>
                }
                confirmText="Sí, pasar a pago"
                cancelText="No, solo completar"
                variant="default"
                loading={isUpdatingCompletion}
                loadingText="Procesando..."
                zIndex={100010}
            />
        </>
    );
}
