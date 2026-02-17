'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenBadge, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { asignarCrewAItem, obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchedulerItemSync } from '../../hooks/useSchedulerItemSync';
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';

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

interface SchedulerItemDetailPopoverProps {
    item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
    studioSlug: string;
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

export function SchedulerItemDetailPopover({ item, studioSlug, children, onItemUpdate }: SchedulerItemDetailPopoverProps) {
    // Hook de sincronización (optimista + servidor)
    const { localItem, updateCrewMember } = useSchedulerItemSync(item, onItemUpdate);

    const [open, setOpen] = useState(false);
    const [selectCrewModalOpen, setSelectCrewModalOpen] = useState(false);
    const [members, setMembers] = useState<CrewMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Usar localItem (sincronizado con servidor)
    const selectedMemberId = localItem.assigned_to_crew_member_id;
    const isService = localItem.profit_type === 'servicio' || localItem.profit_type === 'service';
    const itemName = localItem.name || 'Sin nombre';
    const costoUnitario = localItem.cost ?? localItem.cost_snapshot ?? 0;
    const costoTotal = costoUnitario * localItem.quantity;

    // Cargar miembros solo para mostrar el nombre del asignado
    const loadMembers = useCallback(async () => {
        try {
            setLoadingMembers(true);
            const result = await obtenerCrewMembers(studioSlug);
            if (result.success && result.data) {
                setMembers(result.data as CrewMember[]);
            }
        } catch (error) {
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
                }
            );

            toast.success(memberId ? 'Personal asignado correctamente' : 'Asignación removida');
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
            />
        </>
    );
}

