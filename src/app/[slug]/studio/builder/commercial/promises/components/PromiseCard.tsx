'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare } from 'lucide-react';
import type { PromiseWithContact } from '@/lib/actions/schemas/promises-schemas';

interface PromiseKanbanCardProps {
    promise: PromiseWithContact;
    onClick?: (promise: PromiseWithContact) => void;
}

export function PromiseKanbanCard({ promise, onClick }: PromiseKanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: promise.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? transition : `${transition}, all 0.2s ease-in-out`,
        opacity: isDragging ? 0.5 : 1,
    };

    // Obtener fecha de evento (defined_date tiene prioridad sobre interested_dates)
    const getEventDate = (): Date | null => {
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

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatInterestedDates = (dates: string[] | null) => {
        if (!dates || dates.length === 0) return 'Fecha no definida';
        if (dates.length === 1) {
            return formatDate(new Date(dates[0]));
        }
        return `${dates.length} fechas`;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            data-id={promise.id}
            onClick={() => onClick?.(promise)}
            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 cursor-pointer transition-all duration-200 hover:shadow-lg"
        >
            <div className="space-y-3">
                {/* Nombre */}
                <div>
                    <h3 className="font-medium text-white text-sm">{promise.name}</h3>
                </div>

                {/* Tipo de evento */}
                {promise.event_type && (
                    <p className="text-xs text-zinc-400">{promise.event_type.name}</p>
                )}

                {/* Fecha de evento */}
                <div className={`flex items-center gap-2 text-xs ${isExpired ? 'text-red-400' : 'text-zinc-400'}`}>
                    <Calendar className="h-3 w-3" />
                    <span>
                        {eventDate
                            ? formatDate(eventDate)
                            : formatInterestedDates(promise.interested_dates)
                        }
                    </span>
                    {daysRemaining !== null && (
                        <span className={`ml-1 ${isExpired ? 'text-red-400 font-medium' : 'text-zinc-500'}`}>
                            {isExpired
                                ? `(${Math.abs(daysRemaining)} días vencidos)`
                                : `(${daysRemaining} días)`
                            }
                        </span>
                    )}
                </div>

                {/* Último log asociado */}
                {promise.last_log && (
                    <div className="flex items-start gap-1.5 text-xs text-zinc-500 pt-1 border-t border-zinc-700/50">
                        <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-2 flex-1">{promise.last_log.content}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

