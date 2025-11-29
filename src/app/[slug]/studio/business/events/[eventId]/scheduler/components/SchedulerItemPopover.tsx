'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenInput, ZenButton, ZenBadge, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { CrewMemberFormModal } from '@/components/shared/crew-members/CrewMemberFormModal';
import { asignarCrewAItem, obtenerCrewMembers, actualizarGanttTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssignCrewBeforeCompleteModal } from './AssignCrewBeforeCompleteModal';
import { useSchedulerItemSync } from '../hooks/useSchedulerItemSync';

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

export function SchedulerItemPopover({ item, studioSlug, eventId, children, onItemUpdate }: SchedulerItemPopoverProps) {
    // Hook de sincronización (optimista + servidor)
    const { localItem, updateCrewMember, updateCompletionStatus } = useSchedulerItemSync(item, onItemUpdate);

    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<CrewMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);
    const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);

    // Usar localItem (sincronizado con servidor)
    const selectedMemberId = localItem.assigned_to_crew_member_id;
    const isTaskCompleted = !!localItem.gantt_task?.completed_at;

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

    // Cargar miembros cada vez que se abre el popover
    useEffect(() => {
        if (open) {
            loadMembers();
        }
    }, [open, loadMembers]);

    // Filtrar miembros según búsqueda
    const filteredMembers = useMemo(() => {
        if (!searchTerm.trim()) return members;
        const term = searchTerm.toLowerCase();
        return members.filter(m =>
            m.name.toLowerCase().includes(term) ||
            m.email?.toLowerCase().includes(term) ||
            m.tipo.toLowerCase().includes(term)
        );
    }, [members, searchTerm]);

    const handleMemberSelect = async (memberId: string | null) => {
        const selectedMember = memberId ? members.find(m => m.id === memberId) : null;

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
            }
        );

        toast.success('Personal asignado correctamente');
        setSearchTerm('');
    };

    const handleRemoveAssignment = async () => {
        await handleMemberSelect(null);
    };

    const handleCrewCreated = async () => {
        setFormModalOpen(false);
        setSearchTerm('');
        await loadMembers();
        setTimeout(() => {
            setOpen(true);
        }, 100);
    };

    const handleOpenCreateModal = () => {
        setOpen(false);
        setTimeout(() => {
            setFormModalOpen(true);
        }, 150);
    };

    const handleTaskCompletionToggle = async (checked: boolean) => {
        if (!localItem.gantt_task?.id) return;

        // Si se intenta completar pero no hay personal asignado, mostrar modal
        if (checked && !localItem.assigned_to_crew_member_id) {
            setOpen(false);
            setTimeout(() => {
                setAssignCrewModalOpen(true);
            }, 100);
            return;
        }

        setIsUpdatingCompletion(true);

        try {
            await updateCompletionStatus(checked, async () => {
                const result = await actualizarGanttTask(
                    studioSlug,
                    eventId,
                    localItem.gantt_task!.id,
                    {
                        isCompleted: checked,
                        assignedToCrewMemberId: localItem.assigned_to_crew_member_id || undefined,
                    }
                );

                if (result.success) {
                    if (result.payrollResult?.success && result.payrollResult.personalNombre) {
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
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al actualizar tarea');
        }

        setIsUpdatingCompletion(false);
    };

    const handleAssignAndComplete = async (crewMemberId: string) => {
        if (!localItem.gantt_task?.id) return;

        setIsUpdatingCompletion(true);

        try {
            const selectedMember = members.find(m => m.id === crewMemberId);

            // 1. Asignar personal (con actualización optimista)
            await updateCrewMember(
                crewMemberId,
                selectedMember ? {
                    id: selectedMember.id,
                    name: selectedMember.name,
                    tipo: selectedMember.tipo,
                } : null,
                async () => {
                    const assignResult = await asignarCrewAItem(studioSlug, localItem.id, crewMemberId);
                    if (!assignResult.success) {
                        throw new Error(assignResult.error || 'Error al asignar personal');
                    }
                }
            );

            // 2. Completar tarea (con actualización optimista)
            await updateCompletionStatus(true, async () => {
                const result = await actualizarGanttTask(
                    studioSlug,
                    eventId,
                    localItem.gantt_task!.id,
                    {
                        isCompleted: true,
                        assignedToCrewMemberId: crewMemberId,
                    }
                );

                if (result.success) {
                    setAssignCrewModalOpen(false);

                    if (result.payrollResult?.success && result.payrollResult.personalNombre) {
                        toast.success(`Personal asignado y tarea completada. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
                    } else {
                        toast.warning(`Tarea completada y personal asignado. No se generó pago de nómina: ${result.payrollResult?.error || 'Error desconocido'}`);
                    }
                } else {
                    throw new Error(result.error || 'Error al completar la tarea');
                }
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al procesar');
        }

        setIsUpdatingCompletion(false);
    };

    const handleCompleteWithoutPayment = async () => {
        if (!localItem.gantt_task?.id) return;

        setIsUpdatingCompletion(true);

        try {
            await updateCompletionStatus(true, async () => {
                const result = await actualizarGanttTask(
                    studioSlug,
                    eventId,
                    localItem.gantt_task!.id,
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
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al actualizar tarea');
        }

        setIsUpdatingCompletion(false);
    };

    const hasTask = !!localItem.gantt_task;
    const taskStartDate = localItem.gantt_task ? new Date(localItem.gantt_task.start_date) : null;
    const taskEndDate = localItem.gantt_task ? new Date(localItem.gantt_task.end_date) : null;

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
                                    <div className="text-xs text-zinc-500 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span>Inicio:</span>
                                            <span className="text-zinc-300">
                                                {taskStartDate ? format(taskStartDate, "d 'de' MMMM", { locale: es }) : '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>Fin:</span>
                                            <span className="text-zinc-300">
                                                {taskEndDate ? format(taskEndDate, "d 'de' MMMM", { locale: es }) : '—'}
                                            </span>
                                        </div>
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
                                                isTaskCompleted ? "text-emerald-400" : "text-zinc-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {isTaskCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                <span>Tarea completada</span>
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
                                            <ZenAvatar className="h-6 w-6 flex-shrink-0">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">
                                    Asignar personal:
                                </label>

                                {/* Input de búsqueda */}
                                <ZenInput
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar personal..."
                                    className="w-full"
                                />

                                {/* Lista de coincidencias o botón crear */}
                                {loadingMembers ? (
                                    <div className="text-xs text-zinc-500 py-2">Cargando...</div>
                                ) : searchTerm.trim() && filteredMembers.length === 0 ? (
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleOpenCreateModal}
                                        className="w-full text-xs text-zinc-400 hover:text-zinc-300"
                                    >
                                        Registrar personal
                                    </ZenButton>
                                ) : (
                                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                        {/* Lista de miembros filtrados */}
                                        {(searchTerm.trim() ? filteredMembers : members).slice(0, 5).map((member) => (
                                            <button
                                                key={member.id}
                                                onClick={() => {
                                                    handleMemberSelect(member.id);
                                                    setSearchTerm('');
                                                }}
                                                className={cn(
                                                    'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-zinc-800 rounded transition-colors',
                                                    selectedMemberId === member.id && 'bg-zinc-800'
                                                )}
                                            >
                                                {/* Avatar */}
                                                <ZenAvatar className="h-6 w-6 flex-shrink-0">
                                                    <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                                                        {getInitials(member.name)}
                                                    </ZenAvatarFallback>
                                                </ZenAvatar>

                                                {/* Check indicator */}
                                                <div className="h-3 w-3 flex items-center justify-center flex-shrink-0">
                                                    {selectedMemberId === member.id && (
                                                        <Check className="h-3 w-3 text-emerald-400" />
                                                    )}
                                                </div>

                                                {/* Información */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-zinc-300 truncate">{member.name}</div>
                                                    <div className="text-[10px] text-zinc-500 truncate">
                                                        {member.tipo}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}

                                        {/* Botón crear si hay búsqueda y no hay coincidencias */}
                                        {searchTerm.trim() && filteredMembers.length === 0 && (
                                            <ZenButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleOpenCreateModal}
                                                className="w-full text-xs text-zinc-400 hover:text-zinc-300 mt-2"
                                            >
                                                Registrar personal
                                            </ZenButton>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Modal para crear personal */}
            <CrewMemberFormModal
                studioSlug={studioSlug}
                isOpen={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                initialMember={null}
                onSuccess={handleCrewCreated}
            />

            {/* Modal para asignar personal antes de completar */}
            {localItem.gantt_task && (
                <AssignCrewBeforeCompleteModal
                    isOpen={assignCrewModalOpen}
                    onClose={() => setAssignCrewModalOpen(false)}
                    onCompleteWithoutPayment={handleCompleteWithoutPayment}
                    onAssignAndComplete={handleAssignAndComplete}
                    studioSlug={studioSlug}
                    itemId={localItem.id}
                    itemName={itemName}
                    costoTotal={costoTotal}
                />
            )}
        </>
    );
}
