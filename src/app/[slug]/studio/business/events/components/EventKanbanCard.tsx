'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EventWithContact } from '@/lib/actions/schemas/events-schemas';
import { formatRelativeTime, formatInitials } from '@/lib/actions/utils/formatting';
import { getRelativeDateLabel } from '@/lib/utils/date-formatter';
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

  // Misma lógica que PromiseKanbanCard/ReminderButton: getRelativeDateLabel (fechas relativas consistentes)
  const relativeDate = event.event_date != null ? getRelativeDateLabel(event.event_date, { pastLabel: 'Vencida', futureVariant: 'success' }) : null;
  const isExpired = relativeDate?.variant === 'destructive';
  const isToday = relativeDate?.variant === 'warning';

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

        {/* Fecha del evento — mismo formato que PromiseKanbanCard (getRelativeDateLabel) */}
        <div className={`text-xs ${isExpired ? 'text-red-400' : isToday ? 'text-blue-400' : 'text-zinc-400'}`}>
          {relativeDate ? (
            <span className={isExpired ? 'font-medium' : isToday ? 'font-medium' : undefined}>
              {relativeDate.text}
            </span>
          ) : (
            <span>—</span>
          )}
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

