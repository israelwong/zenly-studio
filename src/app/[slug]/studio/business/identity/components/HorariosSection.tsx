'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Clock } from 'lucide-react';
import { Horario } from '../../types';
import { toggleHorarioEstado, actualizarHorario, inicializarHorariosPorDefecto } from '@/lib/actions/studio/profile/horarios';
import { toast } from 'sonner';

interface HorariosSectionProps {
    studioSlug: string;
    horarios?: Horario[]; // Data from parent (builder-profile)
    onLocalUpdate?: (data: Partial<{ horarios: Horario[] }>) => void;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function HorariosSection({ studioSlug, horarios: initialHorarios = [], onLocalUpdate, loading = false, onDataChange }: HorariosSectionProps) {
    const [horarios, setHorarios] = useState<Horario[]>(initialHorarios || []);
    const [loadingHorarios, setLoadingHorarios] = useState(false);
    const isInitialMount = useRef(true);
    const hasInitialized = useRef(false);

    // Sync with parent data (only if data actually changed)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Only update if data actually changed (deep comparison)
        const hasChanged = JSON.stringify(horarios) !== JSON.stringify(initialHorarios);
        if (hasChanged) {
            setHorarios(initialHorarios);
        }
    }, [initialHorarios]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize with defaults if empty (only after loading completes, and only once)
    useEffect(() => {
        const initIfEmpty = async () => {
            // Solo inicializar si:
            // 1. Ya terminó la carga
            // 2. No hay horarios
            // 3. No se ha inicializado antes
            if (!loading && initialHorarios.length === 0 && !hasInitialized.current) {
                hasInitialized.current = true;
                setLoadingHorarios(true);
                try {
                    const wasInitialized = await inicializarHorariosPorDefecto(studioSlug);
                    // Solo mostrar toast si realmente se inicializaron horarios
                    if (wasInitialized) {
                        toast.success('Horarios inicializados. Recarga la página.');
                        await onDataChange?.();
                    }
                } catch (error) {
                    console.error('Error initializing horarios:', error);
                    toast.error('Error al inicializar horarios');
                    hasInitialized.current = false; // Permitir reintentar si falla
                } finally {
                    setLoadingHorarios(false);
                }
            }
        };
        initIfEmpty();
    }, [loading, initialHorarios.length, studioSlug]);

    const handleHorarioUpdate = async (id: string, field: 'start_time' | 'end_time', value: string) => {
        const horario = horarios.find(h => h.id === id);
        if (!horario || !horario.id) return;

        // Validar que el valor realmente cambió
        const currentValue = field === 'start_time' ? horario.apertura : horario.cierre;
        if (currentValue === value) return;

        try {
            // Actualizar optimísticamente
            const updated = horarios.map(h =>
                h.id === id
                    ? {
                        ...h,
                        apertura: field === 'start_time' ? value : (h.apertura || ''),
                        cierre: field === 'end_time' ? value : (h.cierre || '')
                    }
                    : h
            );
            setHorarios(updated);
            onLocalUpdate?.({ horarios: updated });

            // Llamar Server Action
            await actualizarHorario(studioSlug, id, {
                id: id,
                studio_slug: studioSlug,
                day_of_week: horario.dia as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
                start_time: field === 'start_time' ? value : (horario.apertura || '09:00'),
                end_time: field === 'end_time' ? value : (horario.cierre || '18:00'),
                is_active: !horario.cerrado,
                order: 0
            });

            toast.success('Horario actualizado exitosamente');
            await onDataChange?.();
        } catch (error) {
            console.error('Error updating horario:', error);
            toast.error('Error al actualizar horario');
            // Revert to initial data from parent
            setHorarios(initialHorarios);
        }
    };

    const handleHorarioToggle = async (id: string, cerrado: boolean) => {
        try {
            const horario = horarios.find(h => h.id === id);
            if (!horario || !horario.id) return;

            // Validar que el estado realmente cambió
            if (horario.cerrado === cerrado) return;

            // Actualizar optimísticamente
            const updated = horarios.map(h =>
                h.id === id ? { ...h, cerrado } : h
            );
            setHorarios(updated);
            onLocalUpdate?.({ horarios: updated });

            // Llamar Server Action
            await toggleHorarioEstado(studioSlug, id, {
                id: horario.id,
                studio_slug: studioSlug,
                is_active: !cerrado
            });

            toast.success(`Horario ${cerrado ? 'desactivado' : 'activado'} exitosamente`);
            await onDataChange?.();
        } catch (error) {
            console.error('Error toggling horario:', error);
            toast.error('Error al cambiar estado del horario');

            // Revertir cambio optimístico
            const reverted = horarios.map(h =>
                h.id === id ? { ...h, cerrado: !cerrado } : h
            );
            setHorarios(reverted);
            onLocalUpdate?.({ horarios: reverted });
        }
    };


    const diasSemana = [
        { key: 'monday', label: 'Lunes' },
        { key: 'tuesday', label: 'Martes' },
        { key: 'wednesday', label: 'Miércoles' },
        { key: 'thursday', label: 'Jueves' },
        { key: 'friday', label: 'Viernes' },
        { key: 'saturday', label: 'Sábado' },
        { key: 'sunday', label: 'Domingo' }
    ];


    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-400" />
                    <ZenCardTitle>Horarios de Atención</ZenCardTitle>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-6">
                {loading ? (
                    <div className="space-y-3">
                        {diasSemana.map((_, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-20 bg-zinc-700/50 rounded"></div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-24 bg-zinc-700/50 rounded"></div>
                                        <div className="h-4 w-1 bg-zinc-700/50"></div>
                                        <div className="h-8 w-24 bg-zinc-700/50 rounded"></div>
                                    </div>
                                </div>
                                <div className="w-9 h-5 bg-zinc-700/50 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                ) : loadingHorarios ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin border-2 border-orange-500 border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-zinc-400">Cargando horarios...</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {diasSemana.map((dia) => {
                            const horario = horarios.find(h => h.dia === dia.key);
                            return (
                                <div key={dia.key} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-zinc-300 font-medium w-20">{dia.label}</span>
                                        {horario ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={horario.apertura}
                                                    onChange={(e) => handleHorarioUpdate(horario.id!, 'start_time', e.target.value)}
                                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
                                                    disabled={horario.cerrado}
                                                />
                                                <span className="text-zinc-500">-</span>
                                                <input
                                                    type="time"
                                                    value={horario.cierre}
                                                    onChange={(e) => handleHorarioUpdate(horario.id!, 'end_time', e.target.value)}
                                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
                                                    disabled={horario.cerrado}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-zinc-500 text-sm">No configurado</span>
                                        )}
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!horario?.cerrado}
                                            onChange={(e) => horario && handleHorarioToggle(horario.id!, !e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ZenCardContent>
        </ZenCard>
    );
}