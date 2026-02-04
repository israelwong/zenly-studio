'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Video, MapPin, FileText, Archive, Phone, FlaskRound, Tag, Percent, HandCoins, GripVertical, MoreVertical, Trash2, Clock } from 'lucide-react';
import type { PromiseWithContact } from '@/lib/actions/schemas/promises-schemas';
import { formatRelativeTime, formatInitials } from '@/lib/actions/utils/formatting';
import { formatDisplayDateShort, formatDisplayDate, getRelativeDateLabel, getRelativeDateDiffDays } from '@/lib/utils/date-formatter';
import { ZenAvatar, ZenAvatarImage, ZenAvatarFallback, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { ArchivePromiseModal } from './ArchivePromiseModal';
import { PromiseDeleteModal } from '@/components/shared/promises';
import type { PromiseTag } from '@/lib/actions/studio/commercial/promises';
import { deletePromise } from '@/lib/actions/studio/commercial/promises';
import type { Reminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { toast } from 'sonner';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { createStageNameMap, getCotizacionStatusDisplayName, isTerminalStage, getTerminalColor } from '@/lib/utils/pipeline-stage-names';
import { getPromisePath } from '@/lib/utils/promise-navigation';

interface PromiseKanbanCardProps {
    promise: PromiseWithContact;
    onClick?: (promise: PromiseWithContact) => void;
    studioSlug?: string;
    onArchived?: (archiveReason?: string) => void;
    onDeleted?: () => void;
    onTagsUpdated?: () => void;
    pipelineStages?: PipelineStage[];
}

export function PromiseKanbanCard({ promise, onClick, studioSlug, onArchived, onDeleted, onTagsUpdated, pipelineStages = [] }: PromiseKanbanCardProps) {
    // Crear mapa de nombres de stages para obtener nombres personalizados
    const stageNameMap = pipelineStages.length > 0 ? createStageNameMap(pipelineStages) : null;
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // ✅ OPTIMIZACIÓN: Usar reminder que viene en la promesa (ya no se carga por separado)
    const [reminder, setReminder] = useState<Reminder | null>(
      promise.reminder && !promise.reminder.is_completed ? promise.reminder as Reminder : null
    );
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
    };

    // Obtener fecha de evento (event_date tiene prioridad, luego defined_date, luego interested_dates)
    // Retorna Date object para cálculos, pero siempre usa componentes UTC
    // IMPORTANTE: Cuando Prisma devuelve un campo DATE, se serializa como string ISO al cliente
    // Necesitamos extraer directamente los componentes YYYY-MM-DD sin crear Date intermedio
    const getEventDate = (): Date | null => {
        if (promise.event_date) {
            // Si es string ISO (viene serializado desde el servidor), extraer componentes directamente
            if (typeof promise.event_date === 'string') {
                const dateMatch = promise.event_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    const [, year, month, day] = dateMatch;
                    // Crear fecha usando UTC con mediodía como buffer
                    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
                }
            }
            // Si es Date object, extraer componentes UTC
            const date = promise.event_date instanceof Date ? promise.event_date : new Date(promise.event_date);
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
        }
        if (promise.defined_date) {
            // Mismo tratamiento para defined_date
            if (typeof promise.defined_date === 'string') {
                const dateMatch = promise.defined_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    const [, year, month, day] = dateMatch;
                    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
                }
            }
            const date = promise.defined_date instanceof Date ? promise.defined_date : new Date(promise.defined_date);
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
        }
        if (promise.interested_dates && promise.interested_dates.length > 0) {
            // Tomar la primera fecha de interés y parsear usando componentes UTC
            const dateStr = promise.interested_dates[0];
            const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                const [, year, month, day] = dateMatch;
                return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
            }
            const date = new Date(dateStr);
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
        }
        return null;
    };

    const eventDate = getEventDate();

    // Días restantes usando fecha local del usuario (getRelativeDateDiffDays)
    const daysRemaining = eventDate ? getRelativeDateDiffDays(eventDate) : null;
    const isExpired = daysRemaining !== null && daysRemaining < 0;

    // Determinar color de fecha según días restantes
    const getDateColor = (): string => {
        if (daysRemaining === null) return 'text-zinc-400';
        if (daysRemaining < 0) return 'text-red-400'; // Expirada
        if (daysRemaining <= 7) return 'text-amber-400'; // Próxima (7 días o menos)
        return 'text-emerald-400'; // Con tiempo (más de 7 días)
    };



    // Si los datos no vienen en la promesa, cargarlos (fallback para compatibilidad)
    // Inicializar con promise.tags si existe para que las actualizaciones locales funcionen
    const [fallbackTags, setFallbackTags] = useState<PromiseTag[]>((promise.tags as PromiseTag[]) || []);
    const [fallbackAgendamiento, setFallbackAgendamiento] = useState<AgendaItem | null>(null);
    const [fallbackCotizacionesCount, setFallbackCotizacionesCount] = useState<number>(0);
    const [fallbackCotizaciones, setFallbackCotizaciones] = useState<CotizacionListItem[]>([]);

    // Sincronizar fallbackTags cuando promise.tags cambia desde el padre
    useEffect(() => {
        if (promise.tags) {
            setFallbackTags(promise.tags as PromiseTag[]);
        }
    }, [promise.tags]);

    // Validar si un agendamiento tiene una cita válida (con date y type_scheduling)
    const hasValidCita = (agenda: AgendaItem | null): boolean => {
        if (!agenda) return false;
        if (!agenda.date) return false;
        if (!agenda.type_scheduling || (agenda.type_scheduling !== 'presencial' && agenda.type_scheduling !== 'virtual')) return false;
        return true;
    };

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

    // Calcular stats de cotizaciones (pendientes y en negociación)
    // Solo usar fallbackCotizaciones ya que las cotizaciones completas no vienen en PromiseWithContact
    // Excluir cotizaciones archivadas (campo archived = true)
    // Nota: La consulta ya filtra por status !== 'archivada', pero verificamos archived por seguridad
    const cotizacionesPendientes = fallbackCotizaciones.filter(
        (cot: CotizacionListItem) =>
            cot.status === 'pendiente' &&
            !cot.archived
    ).length;
    const cotizacionesEnNegociacion = fallbackCotizaciones.filter(
        (cot: CotizacionListItem) =>
            cot.status === 'negociacion' &&
            !cot.archived
    ).length;

    // Formatear fecha y hora del agendamiento usando métodos UTC
    const formatAgendamientoDate = (agenda: AgendaItem): string => {
        if (!agenda.date) return '';
        const dateStr = formatDisplayDate(agenda.date);
        const timeStr = agenda.time || '';
        return timeStr ? `${dateStr} ${timeStr}` : dateStr;
    };

    // Obtener tipo de cita formateado
    const getTipoCita = (agenda: AgendaItem): string => {
        return agenda.type_scheduling === 'virtual' ? 'virtual' : 'presencial';
    };

    // Verificar si la promesa está archivada
    const isArchived = promise.promise_pipeline_stage?.slug === 'archived';

    // Verificar si la etapa es aprobado
    const isApprovedStage = promise.promise_pipeline_stage?.slug === 'approved' || promise.promise_pipeline_stage?.slug === 'aprobado';

    // Verificar si está en cierre (no mostrar menú ni archivar)
    const isClosing = promise.promise_pipeline_stage?.slug === 'closing';

    // Abrir modal de confirmación
    const handleArchiveClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevenir que active el onClick de la tarjeta
        setShowArchiveModal(true);
    };

    // Confirmar archivar: el modal unificado pasa el motivo a onArchived; el modal cierra vía onClose
    const handleConfirmArchive = (archiveReason?: string) => {
        if (!promise.promise_id) return;
        onArchived?.(archiveReason);
    };


    // Confirmar eliminar promesa
    const handleConfirmDelete = async () => {
        if (!promise.promise_id || !studioSlug) return;
        setIsDeleting(true);
        try {
            const result = await deletePromise(studioSlug, promise.promise_id);
            if (result.success) {
                setShowDeleteModal(false);
                toast.success('Promesa eliminada');
                setTimeout(() => {
                    onDeleted?.();
                }, 0);
            } else {
                toast.error(result.error || 'Error al eliminar promesa');
            }
        } catch (error) {
            console.error('Error deleting promise:', error);
            toast.error('Error al eliminar promesa');
        } finally {
            setIsDeleting(false);
        }
    };


    const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Si es Ctrl/Cmd+click, permitir comportamiento nativo (abrir en nueva ventana)
        if (e.ctrlKey || e.metaKey) {
            return; // Dejar que Link maneje (abrir en nueva ventana)
        }
        
        // Click normal: prevenir default y usar onClick del padre para mantener estado
        e.preventDefault();
        if (onClick) {
            onClick(promise);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Si el click viene del drag handle, prevenir navegación
        const target = e.target as HTMLElement;
        if (target.closest('[data-drag-handle]')) {
            e.preventDefault();
        }
    };

    const handleAuxClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Middle-click (button === 1) o click con botón secundario con modificador
        // Permitir comportamiento nativo para abrir en nueva ventana
        if (e.button === 1 || (e.button === 2 && (e.ctrlKey || e.metaKey))) {
            return; // Dejar que el navegador maneje
        }
    };

    // Limitar nombre a las dos primeras palabras
    const getDisplayName = (name: string): string => {
        const words = name.trim().split(/\s+/);
        return words.slice(0, 2).join(' ');
    };

    const promiseId = promise.promise_id || promise.id;
    const href = studioSlug ? getPromisePath(studioSlug, promise) : '#';

    // Tinte dinámico: prioridad 1 terminal (getTerminalColor), prioridad 2 primera etiqueta
    const stageSlug = promise.promise_pipeline_stage?.slug;
    const terminalColor = stageSlug && isTerminalStage(stageSlug) ? getTerminalColor(stageSlug) : null;
    const primaryTag = finalTags && finalTags.length > 0 ? finalTags[0] : null;
    const tagColor = terminalColor ?? primaryTag?.color ?? null;

    const cardStyles: React.CSSProperties = {
        ...style,
    };

    const baseClassName = "rounded-lg p-4 border transition-all duration-200 hover:shadow-lg relative cursor-pointer block no-underline text-inherit";

    if (tagColor) {
        cardStyles.backgroundColor = `${tagColor}14`;
        cardStyles.borderColor = `${tagColor}33`;
    } else {
        cardStyles.backgroundColor = undefined;
        cardStyles.borderColor = undefined;
    }

    return (
        <>
            <Link
                href={href}
                ref={setNodeRef}
                style={cardStyles}
                {...attributes}
                onClick={handleCardClick}
                onMouseDown={handleMouseDown}
                onAuxClick={handleAuxClick}
                data-id={promiseId}
                className={tagColor
                    ? baseClassName
                    : `${baseClassName} bg-zinc-900 border-zinc-700 hover:border-zinc-600`
                }
                onMouseEnter={(e) => {
                    if (tagColor) {
                        e.currentTarget.style.borderColor = `${tagColor}4D`; // 30% en hover
                    }
                }}
                onMouseLeave={(e) => {
                    if (tagColor) {
                        e.currentTarget.style.borderColor = `${tagColor}33`; // 20% normal
                    }
                }}
                suppressHydrationWarning
            >
                {/* Drag Handle - Esquina superior izquierda */}
                <div
                    {...listeners}
                    data-drag-handle
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-2 left-2 p-1.5 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300 cursor-grab active:cursor-grabbing z-20"
                    title="Arrastrar para mover"
                >
                    <GripVertical className="h-4 w-4" />
                </div>

                {/* Botones de Acciones - Esquina superior derecha */}
                {promise.promise_id && studioSlug && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                        {!isArchived && !isClosing && (
                            <>
                                {/* Si es etapa aprobado, mostrar solo botón archivar */}
                                {isApprovedStage ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleArchiveClick(e);
                                        }}
                                        className="p-1 rounded-md bg-zinc-800/60 hover:bg-red-500/20 transition-colors text-zinc-400 hover:text-red-400 z-20"
                                        title="Archivar promesa"
                                    >
                                        <Archive className="h-3.5 w-3.5" />
                                    </button>
                                ) : (
                                    <ZenDropdownMenu>
                                        <ZenDropdownMenuTrigger asChild>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 rounded-md bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors text-zinc-400 hover:text-zinc-300 z-20"
                                                title="Más opciones"
                                                suppressHydrationWarning
                                            >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </button>
                                        </ZenDropdownMenuTrigger>
                                        <ZenDropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <ZenDropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleArchiveClick(e);
                                                }}
                                            >
                                                <Archive className="h-4 w-4 mr-2" />
                                                Archivar
                                            </ZenDropdownMenuItem>
                                            <ZenDropdownMenuSeparator />
                                            <ZenDropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteModal(true);
                                                }}
                                                className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Eliminar
                                            </ZenDropdownMenuItem>
                                        </ZenDropdownMenuContent>
                                    </ZenDropdownMenu>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="space-y-1.5 relative z-10">
                    {/* Header: Avatar, Nombre y Tipo evento */}
                    <div className="flex items-start gap-2 pl-8">
                        {/* Avatar - solo mostrar si hay imagen o nombre válido */}
                        {(promise.avatar_url || (promise.name && formatInitials(promise.name))) && (
                            <ZenAvatar className="h-10 w-10 shrink-0">
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
                        )}

                        {/* Información del contacto - Reorganizada */}
                        <div className="flex-1 min-w-0 space-y-1">
                            {/* Nombre contacto */}
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-white text-sm leading-tight truncate" title={promise.name}>{getDisplayName(promise.name)}</h3>
                                {/* Badge de prueba */}
                                {promise.is_test && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-400/30 shrink-0">
                                        <FlaskRound className="h-2.5 w-2.5" />
                                        PRUEBA
                                    </span>
                                )}
                            </div>

                            {/* Tipo evento */}
                            {promise.event_type && (
                                <div className="text-xs text-zinc-400">
                                    <span className="truncate">{promise.event_type.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Línea separadora sutil */}
                    <div className="border-t border-zinc-700/30 pt-1.5"></div>

                    {/* Fecha de evento - Separada debajo */}
                    {eventDate ? (
                        <div className={`flex items-center gap-1.5 text-xs ${getDateColor()}`}>
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span className="font-medium">
                                {formatDisplayDateShort(eventDate)}
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
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <ZenBadge variant="destructive" className="text-[10px] px-1.5 py-0.5 gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                Fecha no definida
                            </ZenBadge>
                        </div>
                    )}

                    {/* Detalles - Mostrados directamente debajo de la fecha */}
                    {(promise.offer || finalAgendamiento || promise.updated_at || promise.last_log) && (
                        <div className="space-y-1.5">
                            {/* Badge de procedencia */}
                            {promise.offer ? (
                                <div className="flex items-start gap-1.5 text-xs">
                                    <Tag className="h-3 w-3 mt-0.5 shrink-0 text-purple-400" />
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
                                    <Tag className="h-3 w-3 shrink-0" />
                                    <span>Registro manual</span>
                                </div>
                            )}

                            {/* Mini stat de cotizaciones */}
                            {finalCotizacionesCount > 0 && (
                                <div className="flex items-center gap-2 text-xs text-blue-400/80">
                                    <FileText className="h-3 w-3 shrink-0" />
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">
                                            {finalCotizacionesCount} {finalCotizacionesCount === 1 ? 'cotización' : 'cotizaciones'}
                                        </span>
                                        {(cotizacionesPendientes > 0 || cotizacionesEnNegociacion > 0) && (
                                            <div className="flex items-center gap-1.5">
                                                {cotizacionesPendientes > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400/90 text-[10px] font-medium border border-blue-500/30">
                                                        {cotizacionesPendientes} {getCotizacionStatusDisplayName('pendiente', stageNameMap).toLowerCase()}{cotizacionesPendientes !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {cotizacionesEnNegociacion > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400/90 text-[10px] font-medium border border-amber-500/30">
                                                        {cotizacionesEnNegociacion} {getCotizacionStatusDisplayName('negociacion', stageNameMap).toLowerCase()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Cita agendada - Solo mostrar si tiene cita válida */}
                            {hasValidCita(finalAgendamiento) && (
                                <div className={`flex items-center gap-1.5 text-xs ${finalAgendamiento!.type_scheduling === 'virtual' ? 'text-blue-400' : 'text-zinc-400'}`}>
                                    {finalAgendamiento!.type_scheduling === 'virtual' ? (
                                        <Video className="h-3 w-3 shrink-0" />
                                    ) : (
                                        <MapPin className="h-3 w-3 shrink-0" />
                                    )}
                                    <span>
                                        Cita {getTipoCita(finalAgendamiento!)} - {formatAgendamientoDate(finalAgendamiento!)}
                                    </span>
                                </div>
                            )}

                            {/* Última interacción */}
                            {promise.updated_at && (
                                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    <span suppressHydrationWarning>
                                        Últ. interacción: {formatRelativeTime(promise.updated_at)}
                                    </span>
                                </div>
                            )}

                            {/* Último log asociado */}
                            {promise.last_log && (
                                <div className="flex items-start gap-1.5 text-xs text-zinc-500">
                                    <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                    <p className="line-clamp-2 flex-1">{promise.last_log.content}</p>
                                </div>
                            )}

                            {/* Badge de recordatorio */}
                            {reminder && (
                                <div className="mt-1">
                                    <ZenBadge
                                        variant={
                                            new Date(reminder.reminder_date) < new Date()
                                                ? 'destructive'
                                                : 'warning'
                                        }
                                        className="text-[10px] px-1.5 py-0.5 gap-1"
                                    >
                                        <Clock className="h-2.5 w-2.5" />
                                        <span className="truncate max-w-[120px]" title={reminder.subject_text}>
                                            {reminder.subject_text}
                                        </span>
                                        <span className="text-zinc-400">
                                            {getRelativeDateLabel(reminder.reminder_date, { pastLabel: 'Vencido' }).text}
                                        </span>
                                    </ZenBadge>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Link>

            <ArchivePromiseModal
                isOpen={showArchiveModal}
                onClose={() => setShowArchiveModal(false)}
                onConfirm={handleConfirmArchive}
            />

            {/* Modal de confirmación eliminar - fuera del contenedor clickeable */}
            {promise.promise_id && studioSlug && (
                <PromiseDeleteModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleConfirmDelete}
                    studioSlug={studioSlug}
                    promiseId={promise.promise_id}
                    promiseName={promise.name}
                    isDeleting={isDeleting}
                />
            )}

        </>
    );
}

