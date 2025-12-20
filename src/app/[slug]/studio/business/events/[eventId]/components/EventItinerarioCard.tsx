'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { EventItinerarioModal } from './EventItinerarioModal';

export type ItinerarioTipo = 'preparacion' | 'ceremonia' | 'evento' | 'desmontaje';

export interface ItinerarioItem {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  actividad: string;
  ubicacion?: string;
  ubicacion_url?: string;
  notas?: string;
  tipo: ItinerarioTipo;
}

interface EventItinerarioCardProps {
  studioSlug: string;
  eventId: string;
}

// Datos hardcodeados de ejemplo
const ITINERARIO_DATA: ItinerarioItem[] = [
  {
    id: '1',
    hora_inicio: '08:00',
    hora_fin: '10:00',
    actividad: 'Llegada de equipo de producción',
    ubicacion: 'Salón de eventos "Los Jardines"',
    ubicacion_url: 'https://maps.google.com/?q=19.4326,-99.1332',
    notas: 'Llegar por entrada de servicio',
    tipo: 'preparacion',
  },
  {
    id: '2',
    hora_inicio: '10:00',
    hora_fin: '12:00',
    actividad: 'Montaje de equipo técnico y escenografía',
    ubicacion: 'Salón de eventos "Los Jardines"',
    tipo: 'preparacion',
  },
  {
    id: '3',
    hora_inicio: '16:00',
    hora_fin: '17:00',
    actividad: 'Ceremonia religiosa',
    ubicacion: 'Parroquia San José',
    ubicacion_url: 'https://maps.google.com/?q=19.4285,-99.1277',
    notas: 'Confirmar con el padre a las 15:30',
    tipo: 'ceremonia',
  },
  {
    id: '4',
    hora_inicio: '18:00',
    hora_fin: '19:00',
    actividad: 'Cóctel de bienvenida',
    ubicacion: 'Salón de eventos "Los Jardines"',
    tipo: 'evento',
  },
  {
    id: '5',
    hora_inicio: '19:00',
    hora_fin: '20:00',
    actividad: 'Cena y vals',
    ubicacion: 'Salón de eventos "Los Jardines"',
    tipo: 'evento',
  },
  {
    id: '6',
    hora_inicio: '20:00',
    hora_fin: '23:00',
    actividad: 'Fiesta y baile',
    ubicacion: 'Salón de eventos "Los Jardines"',
    tipo: 'evento',
  },
  {
    id: '7',
    hora_inicio: '23:00',
    hora_fin: '01:00',
    actividad: 'Desmontaje de equipo',
    ubicacion: 'Salón de eventos "Los Jardines"',
    notas: 'Coordinar con personal del salón',
    tipo: 'desmontaje',
  },
];

export function EventItinerarioCard({ studioSlug, eventId }: EventItinerarioCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Actividades principales para mostrar en la card (ceremonias y evento)
  const actividadesPrincipales = ITINERARIO_DATA.filter(
    item => item.tipo === 'ceremonia' || item.tipo === 'evento'
  ).slice(0, 3);

  return (
    <>
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <ZenCardTitle className="text-base">Itinerario del evento</ZenCardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {ITINERARIO_DATA.length} actividades programadas
                </p>
              </div>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-4">
          <div className="space-y-3">
            {actividadesPrincipales.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded bg-zinc-900/50"
              >
                <div className="text-xs font-medium text-emerald-400 min-w-[80px]">
                  {item.hora_inicio}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-200 font-medium">
                    {item.actividad}
                  </p>
                  {item.ubicacion && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {item.ubicacion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="w-full mt-4"
          >
            Ver itinerario completo
          </ZenButton>
        </ZenCardContent>
      </ZenCard>

      {/* Modal con itinerario completo */}
      <EventItinerarioModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itinerario={ITINERARIO_DATA}
      />
    </>
  );
}
