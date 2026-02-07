'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarIcon, Clock, FileText, Link as LinkIcon, AlertCircle, Video, MapPin, Plus, Settings, Trash2 } from 'lucide-react';
import { ZenInput, ZenButton, ZenCard, ZenCardContent, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { ZenCalendar } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { es } from 'date-fns/locale';
import { verificarDisponibilidadFecha, type AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import {
  getAgendaSubjectTemplates,
  createAgendaSubjectTemplate,
  updateAgendaSubjectTemplate,
  deleteAgendaSubjectTemplate,
  type AgendaSubjectTemplate,
} from '@/lib/actions/shared/agenda-subject-templates.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
        location_name?: string;
        location_address?: string;
        location_url?: string;
    }) => Promise<void>;
    onCancel?: () => void;
    onCancelCita?: () => Promise<void>;
    onDelete?: () => void;
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
    const subjectContext = contexto === 'promise' ? 'COMMERCIAL' : contexto === 'evento' ? 'OPERATIONAL' : 'GLOBAL';

    const [date, setDate] = useState<Date | undefined>(() => {
        if (initialData?.date) {
            // Normalizar fecha inicial usando métodos UTC para evitar problemas de zona horaria
            const dateObj = initialData.date instanceof Date 
                ? initialData.date 
                : new Date(initialData.date);
            return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 12, 0, 0));
        }
        return undefined;
    });
    const [time, setTime] = useState(initialData?.time || '');
    const [subject, setSubject] = useState(initialData?.concept || '');
    const [locationName, setLocationName] = useState(initialData?.location_name || '');
    const [address, setAddress] = useState(initialData?.location_address ?? initialData?.address ?? '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
    const [subjectTemplates, setSubjectTemplates] = useState<AgendaSubjectTemplate[]>([]);
    const [loadingSubjectTemplates, setLoadingSubjectTemplates] = useState(false);
    const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
    const [modalTemplates, setModalTemplates] = useState<AgendaSubjectTemplate[]>([]);
    const [loadingModalTemplates, setLoadingModalTemplates] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editTemplateText, setEditTemplateText] = useState('');
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
    const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
    const subjectSuggestionsRef = useRef<HTMLDivElement>(null);
    const [linkMeetingUrl, setLinkMeetingUrl] = useState(
        initialData?.type_scheduling === 'presencial' ? (initialData?.location_url ?? initialData?.link_meeting_url) || '' : ''
    );
    const [virtualLink, setVirtualLink] = useState(
        initialData?.type_scheduling === 'virtual' ? (initialData?.location_url ?? initialData?.link_meeting_url) || '' : ''
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
            if (initialData?.date) {
                // Normalizar fecha usando métodos UTC
                const dateObj = initialData.date instanceof Date 
                    ? initialData.date 
                    : new Date(initialData.date);
                setDate(new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 12, 0, 0)));
            } else {
                setDate(undefined);
            }
            setTime(initialData?.time || '');
            setSubject(initialData?.concept || '');
            setLocationName(initialData?.location_name || '');
            setAddress(initialData?.location_address ?? initialData?.address ?? '');
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
                setSubject('');
                setLocationName('');
                setAddress('');
                setDescription('');
                setLinkMeetingUrl('');
                setVirtualLink('');
                setEventType(null);
                setErrors({});
            }
        }
    }, [initialData?.id, initialData?.date, initialData?.time, initialData?.address, initialData?.description, initialData?.type_scheduling, initialData?.link_meeting_url, initialDataId, hasUserModified]);

    useEffect(() => {
        setLoadingSubjectTemplates(true);
        getAgendaSubjectTemplates(studioSlug, subjectContext)
            .then((res) => {
                if (res.success && res.data) setSubjectTemplates(res.data);
            })
            .finally(() => setLoadingSubjectTemplates(false));
    }, [studioSlug, subjectContext]);

    const filteredSubjectTemplates = useMemo(() => {
        if (!subject.trim()) return subjectTemplates;
        const q = subject.trim().toLowerCase();
        return subjectTemplates.filter((t) => t.text.toLowerCase().includes(q));
    }, [subjectTemplates, subject]);

    const subjectExactMatch = useMemo(
        () => subjectTemplates.some((t) => t.text.trim().toLowerCase() === subject.trim().toLowerCase()),
        [subjectTemplates, subject]
    );
    const canAddSubjectAsNew = subject.trim().length > 0 && !subjectExactMatch;

    const handleSelectSubjectTemplate = (t: AgendaSubjectTemplate) => {
        setSubject(t.text);
        setShowSubjectSuggestions(false);
        setHasUserModified(true);
    };

    const handleAddSubjectAsNewTemplate = async () => {
        const trimmed = subject.trim();
        if (!trimmed) return;
        // Never pass GLOBAL when form knows context: evento → OPERATIONAL, promise → COMMERCIAL
        const createContext = contexto === 'evento' ? 'OPERATIONAL' : contexto === 'promise' ? 'COMMERCIAL' : undefined;
        const res = await createAgendaSubjectTemplate(studioSlug, trimmed, createContext);
        if (res.success) {
            setSubjectTemplates((prev) => [res.data!, ...prev]);
            setShowSubjectSuggestions(false);
            toast.success('Plantilla agregada');
            setHasUserModified(true);
        } else {
            toast.error(res.error ?? 'Error al crear plantilla');
        }
    };

    const openTemplatesModal = () => {
        setShowSubjectSuggestions(false);
        setTemplatesModalOpen(true);
        setEditingTemplateId(null);
        setEditTemplateText('');
        setDeletingTemplateId(null);
        setLoadingModalTemplates(true);
        getAgendaSubjectTemplates(studioSlug, subjectContext)
            .then((res) => {
                if (res.success && res.data) setModalTemplates(res.data);
            })
            .finally(() => setLoadingModalTemplates(false));
    };

    const handleSaveEditTemplate = async (templateId: string) => {
        const trimmed = editTemplateText.trim();
        if (!trimmed) return;
        const result = await updateAgendaSubjectTemplate(studioSlug, templateId, trimmed);
        if (result.success) {
            setModalTemplates((prev) => prev.map((x) => (x.id === templateId ? result.data! : x)));
            setSubjectTemplates((prev) => prev.map((x) => (x.id === templateId ? result.data! : x)));
            if (subject === editTemplateText.trim()) setSubject(trimmed);
            setEditingTemplateId(null);
            setEditTemplateText('');
            toast.success('Plantilla actualizada');
        } else {
            toast.error(result.error ?? 'Error al actualizar');
        }
    };

    const confirmDeleteTemplate = async () => {
        if (!deletingTemplateId) return;
        setIsDeletingTemplate(true);
        const result = await deleteAgendaSubjectTemplate(studioSlug, deletingTemplateId);
        if (result.success) {
            setModalTemplates((prev) => prev.filter((x) => x.id !== deletingTemplateId));
            setSubjectTemplates((prev) => prev.filter((x) => x.id !== deletingTemplateId));
            setDeletingTemplateId(null);
            toast.success('Plantilla eliminada');
        } else {
            toast.error(result.error ?? 'Error al eliminar');
        }
        setIsDeletingTemplate(false);
    };

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

        const conceptValue = subject.trim() || (eventType === 'presencial' ? 'Cita presencial' : 'Cita virtual');

        try {
            await onSubmit({
                date: date!,
                time: time || undefined,
                address: eventType === 'presencial' ? address || undefined : undefined,
                concept: conceptValue,
                description: description || undefined,
                link_meeting_url: eventType === 'presencial' ? linkMeetingUrl || undefined : eventType === 'virtual' ? virtualLink || undefined : undefined,
                type_scheduling: eventType || undefined,
                location_name: locationName.trim() || undefined,
                location_address: eventType === 'presencial' ? (address || undefined) : undefined,
                location_url: eventType === 'presencial' ? (linkMeetingUrl || undefined) : eventType === 'virtual' ? (virtualLink || undefined) : undefined,
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
                                mode="single"
                                selected={date}
                                onSelect={(selectedDate: Date | undefined) => {
                                    if (selectedDate) {
                                        // Normalizar fecha seleccionada usando métodos UTC con mediodía como buffer
                                        const normalizedDate = new Date(Date.UTC(
                                            selectedDate.getUTCFullYear(),
                                            selectedDate.getUTCMonth(),
                                            selectedDate.getUTCDate(),
                                            12, 0, 0
                                        ));
                                        setDate(normalizedDate);
                                        setCalendarOpen(false);
                                        setHasUserModified(true);
                                    }
                                }}
                                locale={es}
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
                                <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-orange-300">
                                        Has seleccionado una fecha que ya ha pasado: {formatDisplayDate(date)}
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
                            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
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

            {/* Asunto (con plantillas tipo QuickNote) */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Asunto</label>
                <div className="relative" ref={subjectSuggestionsRef}>
                    <ZenInput
                        value={subject}
                        onChange={(e) => {
                            setSubject(e.target.value);
                            setHasUserModified(true);
                        }}
                        onFocus={() => setShowSubjectSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSubjectSuggestions(false), 200)}
                        placeholder="Ej: Sesión de fotos, Entrega de fotos, Cita presencial..."
                        disabled={loading}
                    />
                    {showSubjectSuggestions && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-60 overflow-y-auto">
                            {canAddSubjectAsNew && (
                                <button
                                    type="button"
                                    onClick={handleAddSubjectAsNewTemplate}
                                    className="w-full px-3 py-2 text-left text-sm text-blue-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-700"
                                >
                                    <Plus className="h-4 w-4 shrink-0" />
                                    Agregar &quot;{subject.trim().length > 40 ? subject.trim().slice(0, 40) + '…' : subject.trim()}&quot; como nueva plantilla
                                </button>
                            )}
                            {loadingSubjectTemplates ? (
                                <div className="py-4 text-center text-xs text-zinc-500">Cargando…</div>
                            ) : filteredSubjectTemplates.length === 0 ? (
                                <div className="px-3 py-4 text-center text-xs text-zinc-500">
                                    {canAddSubjectAsNew ? null : 'Sin plantillas. Escribe y agrega una.'}
                                </div>
                            ) : (
                                filteredSubjectTemplates.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSelectSubjectTemplate(t)}
                                        className={cn(
                                            'w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2'
                                        )}
                                    >
                                        <span className="truncate">{t.text}</span>
                                        {t.usage_count > 0 && (
                                            <span className="shrink-0 text-[10px] text-zinc-500">{t.usage_count}</span>
                                        )}
                                    </button>
                                ))
                            )}
                            <button
                                type="button"
                                onClick={openTemplatesModal}
                                className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-t border-zinc-700"
                            >
                                <Settings className="h-4 w-4 shrink-0" />
                                Gestionar plantillas
                            </button>
                        </div>
                    )}
                </div>
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
                            Nombre del lugar
                        </label>
                        <ZenInput
                            value={locationName}
                            onChange={(e) => {
                                setLocationName(e.target.value);
                                setHasUserModified(true);
                            }}
                            placeholder="Ej: Hacienda del Bosque"
                        />
                    </div>
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

            <ZenDialog
                isOpen={templatesModalOpen}
                onClose={() => setTemplatesModalOpen(false)}
                title="Plantillas de asunto"
                description="Edita o elimina los asuntos disponibles para agendamientos"
                onCancel={() => setTemplatesModalOpen(false)}
                cancelLabel="Cerrar"
                maxWidth="md"
            >
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {loadingModalTemplates ? (
                        <div className="py-8 text-center text-sm text-zinc-500">Cargando…</div>
                    ) : modalTemplates.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-8">No hay plantillas. Escribe un asunto arriba y agrega una.</p>
                    ) : (
                        modalTemplates.map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center gap-2 p-3 rounded-md border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                            >
                                {editingTemplateId === t.id ? (
                                    <>
                                        <ZenInput
                                            value={editTemplateText}
                                            onChange={(e) => setEditTemplateText(e.target.value)}
                                            className="flex-1 min-w-0"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEditTemplate(t.id);
                                                if (e.key === 'Escape') {
                                                    setEditingTemplateId(null);
                                                    setEditTemplateText('');
                                                }
                                            }}
                                        />
                                        <ZenButton type="button" size="sm" onClick={() => handleSaveEditTemplate(t.id)}>
                                            Guardar
                                        </ZenButton>
                                        <ZenButton
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingTemplateId(null);
                                                setEditTemplateText('');
                                            }}
                                        >
                                            Cancelar
                                        </ZenButton>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 min-w-0 truncate text-sm text-zinc-200">{t.text}</span>
                                        {t.usage_count > 0 && (
                                            <span className="text-[10px] text-zinc-500">{t.usage_count}</span>
                                        )}
                                        <ZenButton
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingTemplateId(t.id);
                                                setEditTemplateText(t.text);
                                            }}
                                            title="Editar"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                        </ZenButton>
                                        <ZenButton
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300"
                                            onClick={() => setDeletingTemplateId(t.id)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </ZenButton>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ZenDialog>

            <ZenConfirmModal
                isOpen={deletingTemplateId !== null}
                onClose={() => setDeletingTemplateId(null)}
                onConfirm={confirmDeleteTemplate}
                title="Eliminar plantilla"
                description="¿Eliminar esta plantilla de asunto? No se borran los agendamientos ya creados."
                confirmLabel="Eliminar"
                variant="destructive"
                loading={isDeletingTemplate}
            />
        </form>
    );
}

