'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EventWithContact } from '@/lib/actions/schemas/events-schemas';
import { formatRelativeTime, formatInitials } from '@/lib/actions/utils/formatting';
import { formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';

interface EventKanbanCardProps {
  event: EventWithContact;
  onClick?: (event: EventWithContact) => void;
  studioSlug?: string;
}

export function EventKanbanCard({ event, onClick, studioSlug }: EventKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? 'none'
      : `${transition}, all 0.2s cubic-bezier(0.18, 0.67, 0.6, 1.22)`,
    opacity: isDragging ? 0 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer',
    pointerEvents: isDragging ? 'none' : 'auto',
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
      onClick(event);
    }
  };

  // Usar formatDisplayDateShort que usa métodos UTC exclusivamente
  const formatDate = formatDisplayDateShort;

  // Calcular días restantes hasta el evento usando métodos UTC
  const getDaysRemaining = (): number | null => {
    const today = new Date();
    const todayYear = today.getUTCFullYear();
    const todayMonth = today.getUTCMonth();
    const todayDay = today.getUTCDate();
    const todayUtc = new Date(Date.UTC(todayYear, todayMonth, todayDay));
    
    const eventDate = new Date(event.event_date);
    const eventYear = eventDate.getUTCFullYear();
    const eventMonth = eventDate.getUTCMonth();
    const eventDay = eventDate.getUTCDate();
    const eventUtc = new Date(Date.UTC(eventYear, eventMonth, eventDay));
    
    const diffTime = eventUtc.getTime() - todayUtc.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();
  const isExpired = daysRemaining !== null && daysRemaining < 0;
  const isToday = daysRemaining === 0;

  // Obtener contacto (prioridad: contact > promise.contact)
  const contact = event.contact || event.promise?.contact;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-id={event.id}
      onClick={handleClick}
      className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 hover:shadow-lg relative"
    >
      <div className="space-y-2.5 relative z-10">
        {/* Header: Avatar, Nombre y Tipo de evento */}
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <ZenAvatar className="h-12 w-12 shrink-0">
            <ZenAvatarFallback>
              {formatInitials(contact?.name || event.name || 'E')}
            </ZenAvatarFallback>
          </ZenAvatar>

          {/* Nombre, Contacto y Tipo de evento */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm leading-tight truncate">
              {event.name || 'Sin nombre'}
            </h3>
            {contact?.name && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                <span className="truncate">{contact.name}</span>
              </div>
            )}
            {event.event_type && (
              <p className="text-xs text-zinc-400 mt-0.5">{event.event_type.name}</p>
            )}
          </div>
        </div>

        {/* Fecha del evento */}
        <div className={`text-xs ${isExpired ? 'text-red-400' : isToday ? 'text-blue-400' : 'text-zinc-400'
          }`}>
          <span>
            {formatDate(event.event_date)}
            {daysRemaining !== null && (
              <span className={`ml-1.5 ${isExpired ? 'text-red-400 font-medium' :
                isToday ? 'text-blue-400 font-medium' :
                  'text-zinc-500'
                }`}>
                {isExpired
                  ? `(Hace ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'día' : 'días'})`
                  : isToday
                    ? '(Hoy)'
                    : `(Faltan ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'})`
                }
              </span>
            )}
          </span>
        </div>

        {/* Dirección */}
        {event.address && (
          <div className="text-xs text-zinc-400">
            <span className="truncate">{event.address}</span>
          </div>
        )}

        {/* Monto contratado */}
        {event.contract_value && (
          <div className="text-xs text-zinc-400">
            <span>
              ${event.contract_value.toLocaleString('es-MX', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            {event.paid_amount > 0 && (
              <span className="text-zinc-500">
                ({((event.paid_amount / event.contract_value) * 100).toFixed(0)}% pagado)
              </span>
            )}
          </div>
        )}

        {/* Última actualización */}
        {event.updated_at && (
          <div className="text-xs text-zinc-500">
            <span>
              Actualizado: {formatRelativeTime(event.updated_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

