'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Video, MapPin, FileText, Archive, Phone, FlaskRound, Tag, Percent, HandCoins } from 'lucide-react';
import type { PromiseWithContact } from '@/lib/actions/schemas/promises-schemas';
import { formatRelativeTime, formatInitials, formatDate } from '@/lib/actions/utils/formatting';
import { ZenAvatar, ZenAvatarImage, ZenAvatarFallback, ZenConfirmModal, ZenBadge } from '@/components/ui/zen';
import { getPromiseTagsByPromiseId, type PromiseTag } from '@/lib/actions/studio/commercial/promises';
import { obtenerAgendamientoPorPromise } from '@/lib/actions/shared/agenda-unified.actions';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';

interface PromiseKanbanCardProps {
    promise: PromiseWithContact;
    onClick?: (promise: PromiseWithContact) => void;
    studioSlug?: string;
    onArchived?: () => void;
}

export function PromiseKanbanCard({ promise, onClick, studioSlug, onArchived }: PromiseKanbanCardProps) {
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: promise.promise_id || promise.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging
            ? 'none'
            : `${transition}, all 0.2s cubic-bezier(0.18, 0.67, 0.6, 1.22)`,
        opacity: isDragging ? 0 : 1,
        cursor: isDragging ? 'grabbing' : 'pointer',
    };

    // Obtener fecha de evento (event_date tiene prioridad, luego defined_date, luego interested_dates)
    const getEventDate = (): Date | null => {
        if (promise.event_date) {
            return new Date(promise.event_date);
        }
        if (promise.defined_date) {
            return new Date(promise.defined_date);
        }
        if (promise.interested_dates && promise.interested_dates.length > 0) {
            // Tomar la primera fecha de interés
            return new Date(promise.interested_dates[0]);
        }
        return null;
    };

    const eventDate = getEventDate();

    // Calcular días restantes
    const getDaysRemaining = (): number | null => {
        if (!eventDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const event = new Date(eventDate);
        event.setHours(0, 0, 0, 0);
        const diffTime = event.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysRemaining = getDaysRemaining();
    const isExpired = daysRemaining !== null && daysRemaining < 0;

    // Determinar color de fecha según días restantes
    const getDateColor = (): string => {
        if (daysRemaining === null) return 'text-zinc-400';
        if (daysRemaining < 0) return 'text-red-400'; // Expirada
        if (daysRemaining <= 7) return 'text-amber-400'; // Próxima (7 días o menos)
        return 'text-emerald-400'; // Con tiempo (más de 7 días)
    };



    // Si los datos no vienen en la promesa, cargarlos (fallback para compatibilidad)
    const [fallbackTags, setFallbackTags] = useState<PromiseTag[]>([]);
    const [fallbackAgendamiento, setFallbackAgendamiento] = useState<AgendaItem | null>(null);
    const [fallbackCotizacionesCount, setFallbackCotizacionesCount] = useState<number>(0);

    useEffect(() => {
        const promiseId = promise.promise_id;
        if (!promiseId || !studioSlug) return;

        // Solo cargar si no vienen en la promesa
        if (promise.tags && promise.agenda !== undefined && promise.cotizaciones_count !== undefined) {
            return; // Ya tenemos los datos
        }

        const loadData = async () => {
            // Cargar etiquetas solo si no vienen
            if (!promise.tags) {
                try {
                    const tagsResult = await getPromiseTagsByPromiseId(promiseId);
                    if (tagsResult.success && tagsResult.data) {
                        setFallbackTags(tagsResult.data);
                    }
                } catch (error) {
                    console.error('Error loading tags:', error);
                }
            }

            // Cargar agendamiento solo si no viene
            if (promise.agenda === undefined) {
                try {
                    const agendaResult = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
                    if (agendaResult.success && agendaResult.data) {
                        setFallbackAgendamiento(agendaResult.data);
                    }
                } catch (error) {
                    console.error('Error loading agendamiento:', error);
                }
            }

            // Cargar cotizaciones solo si no viene
            if (promise.cotizaciones_count === undefined) {
                try {
                    const cotizacionesResult = await getCotizacionesByPromiseId(promiseId);
                    if (cotizacionesResult.success && cotizacionesResult.data) {
                        setFallbackCotizacionesCount(cotizacionesResult.data.length);
                    }
                } catch (error) {
                    console.error('Error loading cotizaciones:', error);
                }
            }
        };

        loadData();
    }, [promise.promise_id, studioSlug, promise.tags, promise.agenda, promise.cotizaciones_count]);

    // Usar datos de la promesa o fallback
    const finalTags = promise.tags || fallbackTags;
    const finalAgendamiento: AgendaItem | null = promise.agenda && promise.agenda.date ? {
        id: promise.agenda.id,
        type_scheduling: promise.agenda.type_scheduling as 'presencial' | 'virtual' | null,
        date: promise.agenda.date,
        time: promise.agenda.time || null,
        address: promise.agenda.address || null,
        link_meeting_url: promise.agenda.link_meeting_url || null,
        concept: promise.agenda.concept || null,
        status: 'pendiente',
        contexto: 'promise' as const,
    } : fallbackAgendamiento;
    const finalCotizacionesCount = promise.cotizaciones_count !== undefined ? promise.cotizaciones_count : fallbackCotizacionesCount;

    // Formatear fecha y hora del agendamiento
    const formatAgendamientoDate = (agenda: AgendaItem): string => {
        if (!agenda.date) return '';
        const date = new Date(agenda.date);
        const dateStr = formatDate(date);
        const timeStr = agenda.time || '';
        return timeStr ? `${dateStr} ${timeStr}` : dateStr;
    };

    // Obtener tipo de cita formateado
    const getTipoCita = (agenda: AgendaItem): string => {
        return agenda.type_scheduling === 'virtual' ? 'virtual' : 'presencial';
    };

    // Verificar si la promesa está archivada
    const isArchived = promise.promise_pipeline_stage?.slug === 'archived';

    // Abrir modal de confirmación
    const handleArchiveClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevenir que active el onClick de la tarjeta
        setShowArchiveModal(true);
    };

    // Confirmar archivar promesa
    const handleConfirmArchive = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!promise.promise_id) return;
        setShowArchiveModal(false);
        // Usar setTimeout para asegurar que el modal se cierre antes de ejecutar onArchived
        setTimeout(() => {
            onArchived?.();
        }, 0);
    };

    const handleClick = (e: React.MouseEvent) => {
        // Si hay arrastre activo, prevenir el clic
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Ejecutar onClick normalmente
        if (onClick) {
            onClick(promise);
        }
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                data-id={promise.promise_id || promise.id}
                onClick={handleClick}
                className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 hover:shadow-lg relative"
            >
                {/* Icono de archivar en esquina superior derecha - mostrar solo si NO está archivada */}
                {promise.promise_id && studioSlug && !isArchived && (
                    <button
                        onClick={handleArchiveClick}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300 z-20"
                        title="Archivar promesa"
                    >
                        <Archive className="h-4 w-4" />
                    </button>
                )}

                <div className="space-y-2.5 relative z-10">
                    {/* Header: Avatar, Nombre y Tipo de evento */}
                    <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        <ZenAvatar className="h-12 w-12 flex-shrink-0">
                            {promise.avatar_url ? (
                                <ZenAvatarImage
                                    src={promise.avatar_url}
                                    alt={promise.name}
                                />
                            ) : null}
                            <ZenAvatarFallback>
                                {formatInitials(promise.name)}
                            </ZenAvatarFallback>
                        </ZenAvatar>

                        {/* Nombre, Teléfono y Tipo de evento */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-white text-sm leading-tight truncate">{promise.name}</h3>
                                {/* Badge de prueba */}
                                {promise.is_test && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-400/30 shrink-0">
                                        <FlaskRound className="h-2.5 w-2.5" />
                                        PRUEBA
                                    </span>
                                )}
                            </div>
                            {promise.phone && (
                                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{promise.phone}</span>
                                </div>
                            )}
                            {promise.event_type && (
                                <p className="text-xs text-zinc-400 mt-0.5">{promise.event_type.name}</p>
                            )}
                        </div>
                    </div>

                    {/* Fecha de interés - Color dinámico según urgencia */}
                    {eventDate && (
                        <div className={`flex items-center gap-1.5 text-xs ${getDateColor()}`}>
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">
                                {formatDate(eventDate)}
                                {daysRemaining !== null && (
                                    <span className="ml-1.5 font-normal opacity-80">
                                        {isExpired
                                            ? `(Hace ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'día' : 'días'})`
                                            : `(Faltan ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'})`
                                        }
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Etiquetas - Badges minimalistas full rounded */}
                    {finalTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {finalTags.map((tag) => (
                                <span
                                    key={tag.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: `${tag.color}20`,
                                        color: tag.color,
                                    }}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Badge de procedencia */}
                    {promise.offer ? (
                        <div className="flex items-start gap-1.5 text-xs">
                            <Tag className="h-3 w-3 mt-0.5 flex-shrink-0 text-purple-400" />
                            <div className="flex-1 min-w-0">
                                <div className="text-purple-300 font-medium truncate">
                                    {promise.offer.name}
                                </div>
                                {promise.offer.business_term && (
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {promise.offer.business_term.discount_percentage !== null && (
                                            <span className="inline-flex items-center gap-0.5 text-purple-400/80">
                                                <Percent className="h-2.5 w-2.5" />
                                                {promise.offer.business_term.discount_percentage}% desc.
                                            </span>
                                        )}
                                        {promise.offer.business_term.advance_percentage !== null && (
                                            <span className="inline-flex items-center gap-0.5 text-purple-400/80">
                                                <HandCoins className="h-2.5 w-2.5" />
                                                {promise.offer.business_term.advance_percentage}% anticipo
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <Tag className="h-3 w-3 flex-shrink-0" />
                            <span>Registro manual</span>
                        </div>
                    )}

                    {/* Cita agendada */}
                    {finalAgendamiento && (
                        <div className={`flex items-center gap-1.5 text-xs ${finalAgendamiento.type_scheduling === 'virtual' ? 'text-blue-400' : 'text-zinc-400'}`}>
                            {finalAgendamiento.type_scheduling === 'virtual' ? (
                                <Video className="h-3 w-3 flex-shrink-0" />
                            ) : (
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span>
                                Cita {getTipoCita(finalAgendamiento)} - {formatAgendamientoDate(finalAgendamiento)}
                            </span>
                        </div>
                    )}

                    {/* Última interacción - solo tiempo relativo */}
                    {promise.updated_at && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>
                                Últ. interacción: {formatRelativeTime(promise.updated_at)}
                            </span>
                        </div>
                    )}

                    {/* Último log asociado */}
                    {promise.last_log && (
                        <div className="flex items-start gap-1.5 text-xs text-zinc-500">
                            <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <p className="line-clamp-2 flex-1">{promise.last_log.content}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación - fuera del contenedor clickeable */}
            <ZenConfirmModal
                isOpen={showArchiveModal}
                onClose={() => setShowArchiveModal(false)}
                onConfirm={handleConfirmArchive}
                title="Archivar promesa"
                description={`¿Estás seguro de que deseas archivar la promesa de "${promise.name}"? Esta acción moverá la promesa a la etapa "Archivado".`}
                confirmText="Archivar"
                cancelText="Cancelar"
                variant="destructive"
            />
        </>
    );
}

