'use client';

import React from 'react';
import { ZenCard } from '@/components/ui/zen';

interface CotizacionItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface SchedulerInstance {
  id: string;
  name: string;
}

interface EventSchedulerInfoCardProps {
  studioSlug: string;
  eventId: string;
  cotizacionId?: string;
  schedulerInstance?: SchedulerInstance;
  cotizacionItems?: CotizacionItem[];
  onTaskUpdated?: () => void;
}

export function EventSchedulerInfoCard({
  studioSlug,
  eventId,
  cotizacionId,
  schedulerInstance,
  cotizacionItems,
  onTaskUpdated,
}: EventSchedulerInfoCardProps) {
  return (
    <ZenCard title="Cronograma">
      <div className="space-y-4">
        {schedulerInstance ? (
          <div className="p-4 bg-zinc-900 rounded-lg">
            <p className="text-sm text-zinc-400">Scheduler: {schedulerInstance.name}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No hay cronograma asignado</p>
        )}
        
        {cotizacionItems && cotizacionItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Items de cotización</h4>
            <div className="text-xs text-zinc-400 space-y-1">
              {cotizacionItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.description}</span>
                  <span>${item.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ZenCard>
  );
}
