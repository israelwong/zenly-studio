'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, MapPin, HandCoins, User } from 'lucide-react';
import type { EventWithContact, EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { formatRelativeTime, formatInitials } from '@/lib/actions/utils/formatting';
import { getRelativeDateDiffDays, formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { ZenAvatar, ZenAvatarFallback, ZenBadge } from '@/components/ui/zen';

interface EventKanbanCardProps {
  event: EventWithContact;
  onClick?: (event: EventWithContact) => void;
  studioSlug?: string;
  pipelineStages?: EventPipelineStage[];
  onEventArchived?: (eventId: string) => void;
}

export function EventKanbanCard({
  event,
  onClick,
  studioSlug,
  pipelineStages = [],
  onEventArchived,
}: EventKanbanCardProps) {
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

  const contact = event.contact || event.promise?.contact;

  const getEventDate = (): Date | null => {
    if (!event.event_date) return null;
    const raw = event.event_date;
    if (typeof raw === 'string') {
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    }
    const d = raw instanceof Date ? raw : new Date(raw);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
  };
  const eventDate = getEventDate();
  const daysRemaining = eventDate ? getRelativeDateDiffDays(eventDate) : null;
  const isExpired = daysRemaining !== null && daysRemaining < 0;
  const getDateColor = (): string => {
    if (daysRemaining === null) return 'text-zinc-400';
    if (daysRemaining <= 0) return 'text-red-400'; // hoy o pasado
    if (daysRemaining <= 7) return 'text-amber-400'; // próximos 7 días
    return 'text-emerald-400';
  };
  const isArchived = event.stage?.slug === 'archivado';

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      e.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const href = studioSlug ? `/${studioSlug}/studio/business/events/${event.id}` : '#';
  const isCompact = isArchived;

  return (
    <>
      <Link
        href={href}
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-id={event.id}
        onClick={handleCardClick}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('[data-drag-handle]')) e.preventDefault();
        }}
        className={
          isCompact
            ? 'rounded-lg p-2.5 border transition-all duration-200 hover:shadow-lg relative cursor-pointer block no-underline text-inherit bg-zinc-900 border-zinc-700 hover:border-zinc-600'
            : 'rounded-lg p-4 border transition-all duration-200 hover:shadow-lg relative cursor-pointer block no-underline text-inherit bg-zinc-900 border-zinc-700 hover:border-zinc-600'
        }
      >
        {/* Drag Handle - mismo que PromiseKanbanCard */}
        {!isCompact && (
          <div
            {...listeners}
            data-drag-handle
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-2 left-1.5 p-1.5 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300 cursor-grab active:cursor-grabbing z-20"
            title="Arrastrar para mover"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        <div className={isCompact ? 'space-y-1 relative z-10' : 'space-y-1.5 relative z-10'}>
          {/* Header: Avatar, Nombre, Tipo evento, Cliente - mismo orden que Promise */}
          <div className={`flex items-start gap-2 ${isCompact ? 'pl-2' : 'pl-6'}`}>
            {!isCompact && (
              <ZenAvatar className="h-10 w-10 shrink-0">
                <ZenAvatarFallback>
                  {formatInitials(contact?.name || event.name || 'E')}
                </ZenAvatarFallback>
              </ZenAvatar>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className={`font-medium text-white leading-tight truncate ${isCompact ? 'text-xs' : 'text-sm'}`} title={event.name || 'Sin nombre'}>
                {event.name || 'Sin nombre'}
              </h3>
              {event.event_type && !isCompact && (
                <div className="text-xs text-zinc-400">
                  <span className="truncate">{event.event_type.name}</span>
                </div>
              )}
              {isCompact && (event.event_type || eventDate) && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 truncate min-w-0">
                  {event.event_type && <span className="shrink-0 truncate">{event.event_type.name}</span>}
                  {event.event_type && eventDate && <span className="shrink-0 opacity-60">·</span>}
                  {eventDate && (
                    <span className={getDateColor()}>
                      <Calendar className="h-2.5 w-2.5 inline-block align-middle mr-0.5" />
                      {formatDisplayDateShort(eventDate)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isCompact && <div className="border-t border-zinc-700/30 pt-1.5" />}

          {/* Body: Cliente primero, luego fecha y resto de metadata */}
          {!isCompact && contact?.name && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-normal">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{contact.name}</span>
            </div>
          )}

          {!isCompact && eventDate ? (
            <div className={`flex items-center gap-1.5 text-xs ${getDateColor()}`}>
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="font-medium">
                {formatDisplayDateShort(eventDate)}
                {daysRemaining !== null && (
                  <span className="ml-1.5 font-normal opacity-80">
                    {isExpired ? `(Hace ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'día' : 'días'})` : `(Faltan ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'})`}
                  </span>
                )}
              </span>
            </div>
          ) : !isCompact ? (
            <div className="flex items-center gap-1.5">
              <ZenBadge variant="destructive" className="text-[10px] px-1.5 py-0.5 gap-1">
                <Calendar className="h-2.5 w-2.5" />
                Fecha no definida
              </ZenBadge>
            </div>
          ) : null}

          {/* Detalles: ubicación, financiero, última interacción (footer) */}
          {!isCompact && (event.address || (event.contract_value != null && event.contract_value > 0) || event.updated_at) && (
            <div className="space-y-1.5">
              {event.address && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{event.address}</span>
                </div>
              )}

              {event.contract_value != null && event.contract_value > 0 && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                  <HandCoins className="h-3 w-3 shrink-0" />
                  <span className="font-medium">
                    ${event.contract_value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    {event.paid_amount > 0 && (
                      <span className="ml-1.5 font-normal opacity-80">
                        ({((event.paid_amount / event.contract_value) * 100).toFixed(0)}% pagado)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {event.updated_at && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span suppressHydrationWarning>
                    Últ. interacción: {formatRelativeTime(event.updated_at)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
    </>
  );
}
