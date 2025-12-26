'use client';

import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ZenButton } from '@/components/ui/zen';
import { ZenAvatar, ZenAvatarImage, ZenAvatarFallback } from '@/components/ui/zen/media/ZenAvatar';
import { ExternalLink, Mail, Phone, Calendar as CalendarIcon, Clock, Tag, CheckCircle2 } from 'lucide-react';
import { formatInitials } from '@/lib/actions/utils/formatting';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';

interface AgendaItemHoverCardProps {
  item: AgendaItem;
  trigger: React.ReactNode;
  onViewPromise?: (promiseId: string) => void;
  onViewEvento?: (eventoId: string) => void;
  openDelay?: number;
  closeDelay?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
}

export function AgendaItemHoverCard({
  item,
  trigger,
  onViewPromise,
  onViewEvento,
  openDelay = 200,
  closeDelay = 100,
  side = 'top',
  sideOffset = 8,
  className,
}: AgendaItemHoverCardProps) {
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.contexto === 'promise' && item.promise_id && onViewPromise) {
      onViewPromise(item.promise_id);
    } else if (item.contexto === 'evento' && item.evento_id && onViewEvento) {
      onViewEvento(item.evento_id);
    }
  };

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        sideOffset={sideOffset}
        className={`w-80 bg-zinc-900 border-zinc-700 !z-[100] ${className || ''}`}
      >
        <div className="space-y-3">
          {/* Mensaje para fechas expiradas/caducadas */}
          {item.is_expired && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-2">
              <p className="text-xs font-medium text-red-400">Fecha caducada</p>
            </div>
          )}

          {/* Avatar y Nombre del contacto */}
          <div className="flex items-start gap-3">
            {item.contact_avatar_url || item.contact_name ? (
              <ZenAvatar className="h-12 w-12 flex-shrink-0">
                {item.contact_avatar_url ? (
                  <ZenAvatarImage
                    src={item.contact_avatar_url}
                    alt={item.contact_name || 'Contacto'}
                  />
                ) : null}
                <ZenAvatarFallback>
                  {item.contact_name ? formatInitials(item.contact_name) : '?'}
                </ZenAvatarFallback>
              </ZenAvatar>
            ) : null}
            <div className="flex flex-col gap-1">
              {item.contact_name && (
                <div className="font-semibold text-white text-sm">{item.contact_name}</div>
              )}
              {/* Teléfono */}
              {item.contact_phone && (
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{item.contact_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tipo de evento */}
          {item.event_type_name && (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Tag className="h-3.5 w-3.5 text-zinc-400" />
              <span>{item.event_type_name}</span>
            </div>
          )}

          {/* Correo */}
          {item.contact_email && (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Mail className="h-3.5 w-3.5 text-zinc-400" />
              <span>{item.contact_email}</span>
            </div>
          )}

          {/* Fecha registro */}
          {item.created_at && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                Registro:{' '}
                {new Intl.DateTimeFormat('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(item.created_at))}
              </span>
            </div>
          )}

          {/* Fecha actualización */}
          {item.updated_at && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Actualizado:{' '}
                {new Intl.DateTimeFormat('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(item.updated_at))}
              </span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 mt-2">
            {(item.contexto === 'promise' && item.promise_id) ||
              (item.contexto === 'evento' && item.evento_id) ? (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleViewClick}
                className="w-full text-xs h-7"
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                {item.contexto === 'promise' ? 'Ver Promesa' : 'Ver Evento'}
              </ZenButton>
            ) : null}

            {/* Botón para abrir en Google Calendar (solo si está sincronizado) */}
            {item.contexto === 'evento' &&
              item.is_main_event_date &&
              item.google_event_id ? (
              <ZenButton
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Obtener el email del estudio desde el contexto o usar el evento
                  // Por ahora, usamos el formato estándar de Google Calendar
                  window.open(
                    `https://calendar.google.com/calendar/u/0/r/eventedit/${item.google_event_id}`,
                    '_blank'
                  );
                }}
                className="w-full text-xs h-7 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              >
                <CalendarIcon className="h-3 w-3 mr-1.5" />
                Abrir en Google Calendar
              </ZenButton>
            ) : null}
          </div>

          {/* Badge tipo de cita */}
          {!item.is_pending_date && !item.is_confirmed_event_date && item.type_scheduling && (
            <div className="mt-2 pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-400">
                {item.type_scheduling === 'virtual' ? 'Virtual' : 'Presencial'}
              </span>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

