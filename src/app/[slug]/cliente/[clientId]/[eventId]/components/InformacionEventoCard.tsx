'use client';

import { useState } from 'react';
import { Edit2, Calendar, Tag } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { useEvento } from '../context/EventoContext';
import { EventInfoModal } from './EventInfoModal';
import type { ClientEventDetail } from '@/types/client';

interface InformacionEventoCardProps {
  slug: string;
  clientId: string;
  eventId: string;
}

function formatFecha(fecha: string): string {
  try {
    const fechaSolo = fecha.split('T')[0];
    const fechaObj = new Date(fechaSolo + 'T00:00:00');

    return fechaObj.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    return 'Fecha no disponible';
  }
}

export function InformacionEventoCard({ slug, clientId, eventId }: InformacionEventoCardProps) {
  const { evento } = useEvento();
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);

  const handleUpdate = () => {
    // Recargar la página para actualizar el contexto
    window.location.reload();
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader>
          <div className="flex items-center justify-between">
            <ZenCardTitle>Información del Evento</ZenCardTitle>
            <ZenButton
              size="icon"
              variant="ghost"
              onClick={() => setShowEventInfoModal(true)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="space-y-4">
          {/* Nombre del evento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Nombre del evento</label>
            <p className="text-base text-zinc-100 font-medium">
              {evento.name || 'Sin nombre'}
            </p>
          </div>

          {/* Sede del evento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Sede</label>
            <p className="text-base text-zinc-100">
              {evento.event_location || 'Sin sede especificada'}
            </p>
          </div>

          {/* Información adicional (solo lectura) */}
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <span>{formatFecha(evento.event_date)}</span>
            </div>

            {evento.event_type && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Tag className="h-4 w-4 text-zinc-500" />
                <span>{evento.event_type.name}</span>
              </div>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>

      <EventInfoModal
        isOpen={showEventInfoModal}
        onClose={() => setShowEventInfoModal(false)}
        eventId={eventId}
        clientId={clientId}
        initialName={evento.name}
        initialLocation={evento.event_location}
        onUpdate={handleUpdate}
      />
    </>
  );
}

