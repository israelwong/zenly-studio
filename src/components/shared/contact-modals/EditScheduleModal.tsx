'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Clock, Loader2 } from 'lucide-react';
import { toggleHorarioEstado, actualizarHorario, inicializarHorariosPorDefecto } from '@/lib/actions/studio/profile/horarios';
import { toast } from 'sonner';

interface Horario {
    id?: string;
    dia: string;
    apertura?: string;
    cierre?: string;
    cerrado: boolean;
}

interface EditScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    horarios: Horario[];
    onSuccess?: () => void;
}

const DIAS_SEMANA = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
];

export function EditScheduleModal({
    isOpen,
    onClose,
    studioSlug,
    horarios: initialHorarios,
    onSuccess
}: EditScheduleModalProps) {
    const [horarios, setHorarios] = useState<Horario[]>(initialHorarios);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);

    useEffect(() => {
        setHorarios(initialHorarios);
    }, [initialHorarios, isOpen]);

    // Inicializar horarios si están vacíos
    useEffect(() => {
        const initIfEmpty = async () => {
            if (isOpen && initialHorarios.length === 0 && !initializing) {
                setInitializing(true);
                try {
                    const wasInitialized = await inicializarHorariosPorDefecto(studioSlug);
                    if (wasInitialized) {
                        toast.success('Horarios inicializados');
                        onSuccess?.();
                    }
                } catch (error) {
                    console.error('Error initializing horarios:', error);
                    toast.error('Error al inicializar horarios');
                } finally {
                    setInitializing(false);
                }
            }
        };
        initIfEmpty();
    }, [isOpen, initialHorarios.length, studioSlug, initializing, onSuccess]);

    const handleHorarioUpdate = async (id: string, field: 'start_time' | 'end_time', value: string) => {
        const horario = horarios.find(h => h.id === id);
        if (!horario || !horario.id) return;

        const currentValue = field === 'start_time' ? horario.apertura : horario.cierre;
        if (currentValue === value) return;

        setLoading(true);
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

            await actualizarHorario(studioSlug, id, {
                id: id,
                studio_slug: studioSlug,
                day_of_week: horario.dia as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
                start_time: field === 'start_time' ? value : (horario.apertura || '09:00'),
                end_time: field === 'end_time' ? value : (horario.cierre || '18:00'),
                is_active: !horario.cerrado,
                order: 0
            });

            toast.success('Horario actualizado');
            onSuccess?.();
        } catch (error) {
            console.error('Error updating horario:', error);
            toast.error('Error al actualizar horario');
            setHorarios(initialHorarios);
        } finally {
            setLoading(false);
        }
    };

    const handleHorarioToggle = async (id: string, cerrado: boolean) => {
        const horario = horarios.find(h => h.id === id);
        if (!horario || !horario.id || horario.cerrado === cerrado) return;

        setLoading(true);
        try {
            // Actualizar optimísticamente
            const updated = horarios.map(h =>
                h.id === id ? { ...h, cerrado } : h
            );
            setHorarios(updated);

            await toggleHorarioEstado(studioSlug, id, {
                id: horario.id,
                studio_slug: studioSlug,
                is_active: !cerrado
            });

            toast.success(`Horario ${cerrado ? 'desactivado' : 'activado'}`);
            onSuccess?.();
        } catch (error) {
            console.error('Error toggling horario:', error);
            toast.error('Error al cambiar estado');
            // Revertir
            const reverted = horarios.map(h =>
                h.id === id ? { ...h, cerrado: !cerrado } : h
            );
            setHorarios(reverted);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-emerald-400" />
                        Editar Horarios de Atención
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                    {initializing ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                            <span className="ml-2 text-zinc-400">Inicializando horarios...</span>
                        </div>
                    ) : horarios.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            <p>No hay horarios configurados</p>
                        </div>
                    ) : (
                        DIAS_SEMANA.map((dia) => {
                            const horario = horarios.find(h => h.dia === dia.key);
                            return (
                                <div
                                    key={dia.key}
                                    className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-b-0"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className="text-zinc-300 font-medium w-24 text-sm">
                                            {dia.label}
                                        </span>
                                        {horario ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={horario.apertura || '09:00'}
                                                    onChange={(e) => horario.id && handleHorarioUpdate(horario.id, 'start_time', e.target.value)}
                                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                    disabled={horario.cerrado || loading}
                                                />
                                                <span className="text-zinc-500">-</span>
                                                <input
                                                    type="time"
                                                    value={horario.cierre || '18:00'}
                                                    onChange={(e) => horario.id && handleHorarioUpdate(horario.id, 'end_time', e.target.value)}
                                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                    disabled={horario.cerrado || loading}
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
                                            onChange={(e) => horario?.id && handleHorarioToggle(horario.id, !e.target.checked)}
                                            disabled={loading}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-zinc-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex gap-3 pt-4 mt-4 border-t border-zinc-800">
                    <ZenButton
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1"
                    >
                        Cerrar
                    </ZenButton>
                </div>
            </DialogContent>
        </Dialog>
    );
}
