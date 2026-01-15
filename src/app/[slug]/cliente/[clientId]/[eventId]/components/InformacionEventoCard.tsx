'use client';

import { Calendar, Tag } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent } from '@/components/ui/zen';
import { useEvento } from '../context/EventoContext';

function formatFecha(fecha: string): string {
  try {
    const fechaSolo = fecha.split('T')[0];
    const [year, month, day] = fechaSolo.split('-').map(Number);
    // Crear fecha usando componentes UTC para evitar problemas de zona horaria
    const fechaObj = new Date(Date.UTC(year, month - 1, day));

    return fechaObj.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Fecha no disponible';
  }
}

export function InformacionEventoCard() {
  const { evento } = useEvento();

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Información del Evento</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Nombre del evento</label>
          <p className="text-sm text-zinc-100 font-medium">{evento.name || 'Sin nombre'}</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Sede</label>
          <p className="text-sm text-zinc-100">{evento.event_location || 'Sin sede especificada'}</p>
        </div>

        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatFecha(evento.event_date)}</span>
          </div>
          {evento.event_type && (
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Tag className="h-3.5 w-3.5 text-zinc-500" />
              <span>{evento.event_type.name}</span>
            </div>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

