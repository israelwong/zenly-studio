'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenDialog, ZenTextarea, ZenSwitch, ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar, type ZenCalendarProps } from '@/components/ui/zen';
import { crearGanttTask, actualizarGanttTask, obtenerGanttTask, eliminarGanttTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { Calendar, Trash2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

// Tipo específico para ZenCalendar con mode="single"
type ZenCalendarSingleProps = Omit<ZenCalendarProps, 'mode' | 'selected' | 'onSelect'> & {
    mode: 'single';
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
};

interface GanttTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    eventId: string;
    itemId: string;
    itemName?: string; // Nombre del servicio/item
    dayDate: Date | null;
    dateRange?: DateRange;
    taskId?: string | null; // Si existe, es edición
    onSuccess: () => void;
}

export function GanttTaskModal({
    isOpen,
    onClose,
    studioSlug,
    eventId,
    itemId,
    itemName,
    dayDate,
    dateRange,
    taskId,
    onSuccess,
}: GanttTaskModalProps) {
    const [notes, setNotes] = useState('');
    const [isRange, setIsRange] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);


    // Cargar datos de tarea existente si se está editando
    useEffect(() => {
        if (isOpen && taskId) {
            const loadTask = async () => {
                try {
                    setLoading(true);
                    const result = await obtenerGanttTask(studioSlug, eventId, taskId);
                    if (result.success && result.data) {
                        const task = result.data as {
                            start_date: Date;
                            end_date: Date;
                            status: string;
                            notes: string | null;
                        };
                        setStartDate(new Date(task.start_date));
                        setEndDate(new Date(task.end_date));
                        setIsRange(task.start_date.toDateString() !== task.end_date.toDateString());
                        setIsCompleted(task.status === 'COMPLETED');
                        setNotes(task.notes || '');
                    }
                } catch {
                    toast.error('Error al cargar la tarea');
                } finally {
                    setLoading(false);
                }
            };
            loadTask();
        } else if (isOpen && dayDate) {
            // Inicializar fechas cuando se crea nueva tarea
            setStartDate(dayDate);
            setEndDate(dayDate);
            setIsRange(false);
            setNotes('');
            setIsCompleted(false);
        }
    }, [isOpen, taskId, dayDate, studioSlug, eventId]);

    // Calcular duración en días
    const durationDays = startDate && endDate
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate) {
            toast.error('La fecha de inicio es requerida');
            return;
        }

        if (isRange && !endDate) {
            toast.error('La fecha de fin es requerida para un rango');
            return;
        }

        if (isRange && startDate && endDate && startDate > endDate) {
            toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        // Validar que las fechas estén dentro del rango del proyecto
        if (dateRange?.from && dateRange?.to) {
            if (startDate < dateRange.from) {
                toast.error('La fecha de inicio está fuera del rango del proyecto');
                return;
            }
            const finalEndDate = isRange && endDate ? endDate : startDate;
            if (finalEndDate > dateRange.to) {
                toast.error('La fecha de fin está fuera del rango del proyecto');
                return;
            }
        }

        setLoading(true);
        try {
            const finalEndDate = isRange && endDate ? endDate : startDate;
            if (!finalEndDate) {
                toast.error('Error en las fechas');
                setLoading(false);
                return;
            }

            if (taskId) {
                // Actualizar tarea existente
                const result = await actualizarGanttTask(studioSlug, eventId, taskId, {
                    startDate: startDate || undefined,
                    endDate: finalEndDate,
                    notes: notes || undefined,
                    isCompleted,
                });

                if (result.success) {
                    toast.success('Tarea actualizada correctamente');
                    onSuccess();
                    handleClose();
                } else {
                    toast.error(result.error || 'Error al actualizar la tarea');
                }
            } else {
                // Crear nueva tarea usando el nombre del item
                const result = await crearGanttTask(studioSlug, eventId, {
                    itemId,
                    name: itemName || 'Tarea',
                    startDate: startDate!,
                    endDate: finalEndDate,
                    notes: notes || undefined,
                    isCompleted,
                });

                if (result.success) {
                    toast.success('Tarea creada correctamente');
                    onSuccess();
                    handleClose();
                } else {
                    toast.error(result.error || 'Error al crear la tarea');
                }
            }
        } catch {
            toast.error('Error al guardar la tarea');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!taskId) return;

        if (!confirm('¿Estás seguro de eliminar esta tarea?')) {
            return;
        }

        setLoading(true);
        try {
            const result = await eliminarGanttTask(studioSlug, eventId, taskId);

            if (result.success) {
                toast.success('Tarea eliminada correctamente');
                onSuccess();
                handleClose();
            } else {
                toast.error(result.error || 'Error al eliminar la tarea');
            }
        } catch {
            toast.error('Error al eliminar la tarea');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setNotes('');
        setIsRange(false);
        setStartDate(null);
        setEndDate(null);
        setIsCompleted(false);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={handleClose}
            title={taskId ? 'Editar Tarea' : 'Nueva Tarea'}
            description={dayDate ? format(dayDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : undefined}
            maxWidth="lg"
            showCloseButton={true}
            closeOnClickOutside={false}
            onSave={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
            onCancel={handleClose}
            saveLabel="Guardar"
            cancelLabel="Cancelar"
            isLoading={loading}
            zIndex={10060}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de rango */}
                <div className="flex items-center gap-4">
                    <ZenSwitch
                        checked={!isRange}
                        onCheckedChange={(checked) => setIsRange(!checked)}
                        label="Una fecha"
                    />
                    <ZenSwitch
                        checked={isRange}
                        onCheckedChange={setIsRange}
                        label="Rango de fechas"
                    />
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Fecha inicio */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            Fecha {isRange ? 'inicio' : ''}
                        </label>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                                <ZenButton
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {startDate ? (
                                        format(startDate, "d MMM yyyy", { locale: es })
                                    ) : (
                                        <span className="text-zinc-500">Seleccionar fecha</span>
                                    )}
                                </ZenButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                                {React.createElement(ZenCalendar, {
                                    mode: "single" as const,
                                    defaultMonth: startDate || new Date(),
                                    selected: startDate,
                                    onSelect: (date) => {
                                        if (date) {
                                            setStartDate(date);
                                            if (!isRange) {
                                                setEndDate(date);
                                            }
                                            setStartDateOpen(false);
                                        }
                                    },
                                    locale: es,
                                } as ZenCalendarSingleProps)}
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Fecha fin (solo si es rango) */}
                    {isRange && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">
                                Fecha fin
                            </label>
                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                <PopoverTrigger asChild>
                                    <ZenButton
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {endDate ? (
                                            format(endDate, "d MMM yyyy", { locale: es })
                                        ) : (
                                            <span className="text-zinc-500">Seleccionar fecha</span>
                                        )}
                                    </ZenButton>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                                    {React.createElement(ZenCalendar, {
                                        mode: "single" as const,
                                        defaultMonth: endDate || new Date(),
                                        selected: endDate,
                                        onSelect: (date) => {
                                            if (date) {
                                                setEndDate(date);
                                                setEndDateOpen(false);
                                            }
                                        },
                                        locale: es,
                                        disabled: (date: Date) => startDate ? date < startDate : false,
                                    } as ZenCalendarSingleProps)}
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                {/* Duración calculada */}
                {durationDays > 0 && (
                    <div className="text-sm text-zinc-400">
                        Duración: <span className="text-zinc-300 font-medium">{durationDays} día{durationDays !== 1 ? 's' : ''}</span>
                    </div>
                )}

                {/* Notas / Bitácora */}
                <ZenTextarea
                    label="Notas / Bitácora"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agrega notas, comentarios o bitácora de la tarea..."
                    rows={4}
                />

                {/* Completada */}
                <ZenSwitch
                    checked={isCompleted}
                    onCheckedChange={setIsCompleted}
                    label="Tarea completada"
                />

                {/* Botón eliminar (solo en modo edición) */}
                {taskId && (
                    <div className="pt-4 border-t border-zinc-800">
                        <ZenButton
                            type="button"
                            variant="ghost"
                            onClick={handleDelete}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar tarea
                        </ZenButton>
                    </div>
                )}
            </form>
        </ZenDialog>
    );
}

