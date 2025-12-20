'use client';

import React from 'react';
import { ZenCard, ZenButton } from '@/components/ui/zen';

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
}

interface EventAgendaCardProps {
  studioSlug: string;
  eventId: string;
  agenda: AgendaItem[];
  onAgendaUpdated?: () => void;
}

export function EventAgendaCard({
  studioSlug,
  eventId,
  agenda,
  onAgendaUpdated,
}: EventAgendaCardProps) {
  return (
    <ZenCard title="Agenda">
      <div className="space-y-4">
        {agenda.length > 0 ? (
          <div className="space-y-2">
            {agenda.map((item) => (
              <div key={item.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-zinc-400 mt-1">{item.description}</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  {item.start_time} - {item.end_time}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No hay agenda</p>
        )}

        <ZenButton variant="outline" className="w-full">
          Agregar actividad
        </ZenButton>
      </div>
    </ZenCard>
  );
}
