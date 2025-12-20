'use client';

import React from 'react';
import { MapPin, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { ZenDialog, ZenBadge } from '@/components/ui/zen';
import type { ItinerarioItem, ItinerarioTipo } from './EventItinerarioCard';

interface EventItinerarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerario: ItinerarioItem[];
}

const getTipoColor = (tipo: ItinerarioTipo) => {
  const colors: Record<ItinerarioTipo, string> = {
    preparacion: 'bg-blue-950/30 text-blue-400 border-blue-800/50',
    ceremonia: 'bg-purple-950/30 text-purple-400 border-purple-800/50',
    evento: 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50',
    desmontaje: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  return colors[tipo];
};

const getTipoLabel = (tipo: ItinerarioTipo) => {
  const labels: Record<ItinerarioTipo, string> = {
    preparacion: 'Preparación',
    ceremonia: 'Ceremonia',
    evento: 'Evento',
    desmontaje: 'Desmontaje',
  };
  return labels[tipo];
};

export function EventItinerarioModal({
  isOpen,
  onClose,
  itinerario,
}: EventItinerarioModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Itinerario del evento"
      description="Programa completo y ubicaciones del día del evento"
      size="4xl"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {itinerario.map((item, index) => (
          <div
            key={item.id}
            className="relative pl-8 pb-4 last:pb-0"
          >
            {/* Timeline line */}
            {index < itinerario.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-800" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
              <Clock className="h-3 w-3 text-zinc-500" />
            </div>

            {/* Content */}
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-emerald-400">
                      {item.hora_inicio} - {item.hora_fin}
                    </span>
                    <ZenBadge
                      variant="outline"
                      className={`text-xs px-2 py-0.5 ${getTipoColor(item.tipo)}`}
                    >
                      {getTipoLabel(item.tipo)}
                    </ZenBadge>
                  </div>
                  <h4 className="text-base font-medium text-zinc-200">
                    {item.actividad}
                  </h4>
                </div>
              </div>

              {/* Ubicación */}
              {item.ubicacion && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-zinc-400">
                      {item.ubicacion}
                    </span>
                    {item.ubicacion_url && (
                      <a
                        href={item.ubicacion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              {item.notas && (
                <div className="flex items-start gap-2 bg-amber-950/10 border border-amber-800/30 rounded px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-amber-300/90">
                    {item.notas}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {itinerario.length === 0 && (
          <div className="text-center py-12 text-zinc-600">
            No hay actividades programadas
          </div>
        )}
      </div>
    </ZenDialog>
  );
}
