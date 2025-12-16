'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, Clock, FileText, Link as LinkIcon, AlertCircle, Video, MapPin } from 'lucide-react';
import { ZenInput, ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { ZenCalendar, type ZenCalendarProps } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { formatDate } from '@/lib/actions/utils/formatting';
import { es } from 'date-fns/locale';
import { verificarDisponibilidadFecha, type AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';

// Tipo específico para ZenCalendar con mode="single"
type ZenCalendarSingleProps = Omit<ZenCalendarProps, 'mode' | 'selected' | 'onSelect'> & {
    mode: 'single';
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
};

interface AgendaFormProps {
    studioSlug: string;
    initialData?: AgendaItem | null;
    contexto?: 'promise' | 'evento';
    promiseId?: string | null;
    eventoId?: string | null;
    onSubmit: (data: {
        date: Date;
        time?: string;
        address?: string;
        concept?: string;
        description?: string;
        link_meeting_url?: string;
        type_scheduling?: 'presencial' | 'virtual';
        agenda_tipo?: string;
    }) => Promise<void>;
    onCancel?: () => void;
    onCancelCita?: () => Promise<void>;
    loading?: boolean;
}

export function AgendaForm({
    studioSlug,
    initialData,
    contexto,
    promiseId,
    eventoId,
    onSubmit,
    onCancel,
    onCancelCita,
    onDelete,
    loading = false,
}: AgendaFormProps) {
    const [date, setDate] = useState<Date | undefined>(
        initialData?.date ? new Date(initialData.date) : undefined
    );
    const [time, setTime] = useState(initialData?.time || '');
    const [address, setAddress] = useState(initialData?.address || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [linkMeetingUrl, setLinkMeetingUrl] = useState(
        initialData?.type_scheduling === 'presencial' ? initialData?.link_meeting_url || '' : ''
    );
    const [virtualLink, setVirtualLink] = useState(
        initialData?.type_scheduling === 'virtual' ? initialData?.link_meeting_url || '' : ''
    );
    const [eventType, setEventType] = useState<'presencial' | 'virtual' | null>(
        initialData?.type_scheduling || null
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [conflictos, setConflictos] = useState<AgendaItem[]>([]);
    const [initialDataId, setInitialDataId] = useState<string | undefined>(initialData?.id);
    const [hasUserModified, setHasUserModified] = useState(false);

    // Resetear hasUserModified cuando cambia el id del initialData (nuevo agendamiento o modal reabierto)
    useEffect(() => {
        if (initialData?.id !== initialDataId) {
            setHasUserModified(false);
        }
    }, [initialData?.id, initialDataId]);

    // Sincronizar estado cuando cambia initialData (solo cuando cambia el id o cuando no hay modificaciones del usuario)
    useEffect(() => {
        const currentId = initialData?.id;

        // Si cambió el id, es un agendamiento diferente - siempre sincronizar
        if (currentId !== initialDataId) {
            setInitialDataId(currentId);
            setDate(initialData?.date ? new Date(initialData.date) : undefined);
            setTime(initialData?.time || '');
            setAddress(initialData?.address || '');
            setDescription(initialData?.description || '');
            setLinkMeetingUrl(
                initialData?.type_scheduling === 'presencial' ? initialData?.link_meeting_url || '' : ''
            );
            setVirtualLink(
                initialData?.type_scheduling === 'virtual' ? initialData?.link_meeting_url || '' : ''
            );
            setEventType(initialData?.type_scheduling || null);
            setErrors({});
            setHasUserModified(false);
        } else if (!initialData && initialDataId) {
            // Se eliminó el initialData, resetear solo si el usuario no ha modificado
            if (!hasUserModified) {
                setInitialDataId(undefined);
                setDate(undefined);
                setTime('');
                setAddress('');
                setDescription('');
                setLinkMeetingUrl('');
                setVirtualLink('');
                setEventType(null);
                setErrors({});
            }
        }
    }, [initialData?.id, initialData?.date, initialData?.time, initialData?.address, initialData?.description, initialData?.type_scheduling, initialData?.link_meeting_url, initialDataId, hasUserModified]);

    // Verificar disponibilidad cuando cambia la fecha
    useEffect(() => {
        const verificarDisponibilidad = async () => {
            if (!date) {
                setConflictos([]);
                return;
            }

            try {
                // Usar promiseId/eventoId del initialData si no se proporciona explícitamente
                const finalPromiseId = promiseId || initialData?.promise_id || undefined;
                const finalEventoId = eventoId || initialData?.evento_id || undefined;

                const result = await verificarDisponibilidadFecha(
                    studioSlug,
                    date,
                    initialData?.id,
                    finalPromiseId,
                    finalEventoId
                );

                if (result.success && result.data) {
                    setConflictos(result.data);
                } else {
                    setConflictos([]);
                }
            } catch (error) {
                console.error('Error verificando disponibilidad:', error);
                setConflictos([]);
            }
        };

        verificarDisponibilidad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, studioSlug, initialData?.id, promiseId, eventoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        const newErrors: Record<string, string> = {};
        if (!date) {
            newErrors.date = 'La fecha es requerida';
        }
        if (!eventType) {
            newErrors.eventType = 'El tipo de cita es requerido';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        // Generar concepto automáticamente basado en el tipo de cita
        const conceptoGenerado = eventType === 'presencial' ? 'Cita presencial' : 'Cita virtual';

        try {
            await onSubmit({
                date: date!,
                time: time || undefined,
                address: eventType === 'presencial' ? address || undefined : undefined,
                concept: conceptoGenerado,
                description: description || undefined,
                link_meeting_url: eventType === 'presencial' ? linkMeetingUrl || undefined : eventType === 'virtual' ? virtualLink || undefined : undefined,
                type_scheduling: eventType || undefined,
            });
        } catch (error) {
            console.error('Error submitting agenda form:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fecha y Hora */}
            <div className="grid grid-cols-4 gap-4">
                {/* Columna 1-3: Fecha */}
                <div className="space-y-2 col-span-3">
                    <label className="text-sm font-medium text-zinc-300">Fecha *</label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <ZenButton
                                type="button"
                                variant="outline"
                                icon={CalendarIcon}
                                iconPosition="left"
                                className="w-full justify-start"
                            >
                                {date ? new Intl.DateTimeFormat('es-MX', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                }).format(date) : 'Seleccionar fecha'}
                            </ZenButton>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto p-0 bg-zinc-900 border-zinc-700"
                            align="start"
                            side="bottom"
                            sideOffset={4}
                            style={{ zIndex: 100000 } as React.CSSProperties}
                        >
                            <ZenCalendar
                                {...({
                                    mode: 'single' as const,
                                    selected: date,
                                    onSelect: (selectedDate: Date | undefined) => {
                                        if (selectedDate) {
                                            setDate(selectedDate);
                                            setCalendarOpen(false);
                                            setHasUserModified(true);
                                        }
                                    },
                                    locale: es,
                                } as ZenCalendarSingleProps)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Columna 2: Hora */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 pb-0">Hora</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        <ZenInput
                            type="time"
                            value={time}
                            onChange={(e) => {
                                setTime(e.target.value);
                                setHasUserModified(true);
                            }}
                            placeholder="HH:MM"
                            className="w-full pl-3 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none text-center"
                        />
                    </div>
                </div>
            </div>

            {/* Errores y validaciones */}
            {errors.date && (
                <p className="text-xs text-red-400">{errors.date}</p>
            )}
            {date && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selectedDate = new Date(date);
                selectedDate.setHours(0, 0, 0, 0);
                return selectedDate < today;
            })() && (
                    <ZenCard variant="outlined" className="bg-orange-900/20 border-orange-700/50 mt-2">
                        <ZenCardContent className="p-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-orange-300">
                                        Has seleccionado una fecha que ya ha pasado: {formatDate(date)}
                                    </p>
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                )}
            {conflictos.length > 0 && (
                <ZenCard variant="outlined" className="bg-amber-900/20 border-amber-700/50 mt-2">
                    <ZenCardContent className="p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <p className="text-xs font-medium text-amber-300">
                                    Esta fecha ya está programada:
                                </p>
                                {conflictos.map((conflicto) => (
                                    <div key={conflicto.id} className="text-xs text-amber-200/80 space-y-0.5">
                                        {conflicto.contexto === 'promise' ? (
                                            <>
                                                <p className="font-medium">
                                                    Promesa: {conflicto.contact_name || 'Sin nombre'}
                                                </p>
                                                {conflicto.time && (
                                                    <p className="text-amber-300/70">Hora: {conflicto.time}</p>
                                                )}
                                                {conflicto.concept && (
                                                    <p className="text-amber-300/70">Concepto: {conflicto.concept}</p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium">
                                                    Evento: {conflicto.event_name || 'Sin nombre'}
                                                </p>
                                                {conflicto.time && (
                                                    <p className="text-amber-300/70">Hora: {conflicto.time}</p>
                                                )}
                                                {conflicto.concept && (
                                                    <p className="text-amber-300/70">Concepto: {conflicto.concept}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Tipo de cita */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Tipo de cita *</label>
                <div className="flex gap-2">
                    <ZenButton
                        type="button"
                        variant={eventType === 'presencial' ? 'primary' : 'outline'}
                        onClick={() => {
                            setEventType('presencial');
                            setHasUserModified(true);
                        }}
                        className={`flex-1 transition-all ${eventType === 'presencial'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                    >
                        Presencial
                    </ZenButton>
                    <ZenButton
                        type="button"
                        variant={eventType === 'virtual' ? 'primary' : 'outline'}
                        onClick={() => {
                            setEventType('virtual');
                            setHasUserModified(true);
                        }}
                        className={`flex-1 transition-all ${eventType === 'virtual'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                    >
                        Virtual
                    </ZenButton>
                </div>
                {errors.eventType && (
                    <p className="text-xs text-red-400">{errors.eventType}</p>
                )}
            </div>

            {/* Nombre o descripción */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Nombre o descripción
                </label>
                <textarea
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        setHasUserModified(true);
                    }}
                    placeholder="Notas adicionales sobre el agendamiento"
                    className="w-full min-h-[80px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
            </div>

            {/* Campos condicionales según tipo */}
            {eventType === 'presencial' && (
                <>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Dirección del evento
                        </label>
                        <textarea
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value);
                                setHasUserModified(true);
                            }}
                            placeholder="Dirección del evento"
                            className="w-full min-h-[80px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Link de Google Maps
                        </label>
                        <ZenInput
                            type="url"
                            value={linkMeetingUrl}
                            onChange={(e) => {
                                setLinkMeetingUrl(e.target.value);
                                setHasUserModified(true);
                            }}
                            placeholder="https://maps.google.com/..."
                        />
                    </div>
                </>
            )}

            {eventType === 'virtual' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Link de reunión virtual
                    </label>
                    <ZenInput
                        type="url"
                        value={virtualLink}
                        onChange={(e) => {
                            setVirtualLink(e.target.value);
                            setHasUserModified(true);
                        }}
                        placeholder="https://meet.google.com/... o https://zoom.us/..."
                    />
                </div>
            )}

            {/* Información del contexto */}
            {contexto && (
                <ZenCard variant="outlined" className="bg-blue-900/20 border-blue-700/50">
                    <ZenCardContent className="p-3">
                        <p className="text-xs text-blue-300 font-medium">
                            {contexto === 'promise' && 'Agendamiento asociado a una promesa'}
                            {contexto === 'evento' && 'Agendamiento asociado a un evento'}
                        </p>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Botones */}
            <div className={`flex gap-2 pt-2 ${initialData && onCancelCita ? 'flex-col' : ''}`}>
                <div className="flex gap-2 w-full">
                    {initialData && onDelete && (
                        <ZenButton
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                            disabled={loading}
                            className="shrink-0"
                            title="Eliminar agendamiento"
                        >
                            Eliminar
                        </ZenButton>
                    )}
                    <ZenButton
                        type="submit"
                        disabled={loading || !date || !eventType}
                        loading={loading}
                        className="flex-1"
                    >
                        {initialData ? 'Actualizar' : 'Crear'} Agendamiento
                    </ZenButton>
                </div>
                {initialData?.id && onCancelCita && (
                    <ZenButton
                        type="button"
                        variant="destructive"
                        onClick={onCancelCita}
                        disabled={loading}
                        className="w-full"
                    >
                        Cancelar cita
                    </ZenButton>
                )}
            </div>
        </form>
    );
}

