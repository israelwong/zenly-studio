'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenInput, ZenButton, ZenBadge, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { CrewMemberFormModal } from '@/components/shared/crew-members/CrewMemberFormModal';
import { asignarCrewAItem, obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface GanttItemPopoverProps {
    item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
    studioSlug: string;
    children: React.ReactNode;
    onCrewMemberUpdate?: (crewMemberId: string | null, crewMember?: CrewMember | null) => void;
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

export function GanttItemPopover({ item, studioSlug, children, onCrewMemberUpdate }: GanttItemPopoverProps) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<CrewMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(item.assigned_to_crew_member_id || null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const isService = item.profit_type === 'servicio' || item.profit_type === 'service';
    const itemName = item.name || 'Sin nombre';
    const costoUnitario = item.cost ?? item.cost_snapshot ?? 0;
    const costoTotal = costoUnitario * item.quantity;

    const loadMembers = useCallback(async () => {
        try {
            setLoadingMembers(true);
            const result = await obtenerCrewMembers(studioSlug);
            if (result.success && result.data) {
                setMembers(result.data);
            }
            } catch (error) {
                // Error silencioso
            } finally {
            setLoadingMembers(false);
        }
    }, [studioSlug]);

    // Cargar miembros cada vez que se abre el popover para asegurar sincronización
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
        const result = await asignarCrewAItem(studioSlug, item.id, memberId);
        if (result.success) {
            setSelectedMemberId(memberId);
            // Obtener el crew member completo de la lista cargada
            const selectedMember = memberId ? members.find(m => m.id === memberId) : null;
            // Actualizar estado local en el componente padre
            onCrewMemberUpdate?.(memberId, selectedMember || null);
            toast.success('Personal asignado correctamente');
            setSearchTerm('');
        } else {
            toast.error(result.error || 'Error al asignar personal');
        }
    };

    const handleRemoveAssignment = async () => {
        await handleMemberSelect(null);
    };

    const handleCrewCreated = async () => {
        // Cerrar el modal primero
        setFormModalOpen(false);
        setSearchTerm('');

        // Recargar miembros para incluir el nuevo personal
        await loadMembers();

        // Reabrir el popover después de un pequeño delay para asegurar que los miembros se cargaron
        setTimeout(() => {
            setOpen(true);
        }, 100);
    };

    const handleOpenCreateModal = () => {
        // Cerrar el popover antes de abrir el modal
        setOpen(false);
        // Abrir el modal después de un pequeño delay para que el popover se cierre primero
        setTimeout(() => {
            setFormModalOpen(true);
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
        </>
    );
}

