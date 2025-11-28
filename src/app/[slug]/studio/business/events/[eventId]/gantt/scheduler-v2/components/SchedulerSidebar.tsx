'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface SchedulerSidebarProps {
  secciones: SeccionData[];
  itemsMap: Map<string, NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>;
  renderItem: (item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>, metadata: {
    seccionNombre: string;
    categoriaNombre: string;
    servicioNombre: string;
    servicioId: string;
  }) => React.ReactNode;
}

export const SchedulerSidebar = React.memo(({
  secciones,
  itemsMap,
  renderItem,
}: SchedulerSidebarProps) => {
  return (
    <div className="w-[360px] flex-shrink-0 border-r border-zinc-800 bg-zinc-950 overflow-y-auto">
      {secciones.map((seccion) => (
        <React.Fragment key={seccion.id}>
          {/* Sección */}
          <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 sticky top-0 z-20">
            <span className="text-sm font-semibold text-zinc-300">{seccion.nombre}</span>
          </div>

          {/* Categorías */}
          {seccion.categorias.map((categoria) => (
            <React.Fragment key={categoria.id}>
              {/* Categoría */}
              <div className="bg-zinc-900/30 border-b border-zinc-800/50 px-6 py-1.5">
                <span className="text-xs font-medium text-zinc-400">{categoria.nombre}</span>
              </div>

              {/* Items */}
              {categoria.servicios.map((servicio) => {
                const item = itemsMap.get(servicio.id);
                if (!item) return null;

                return (
                  <div
                    key={item.id}
                    className="h-[60px] border-b border-zinc-800/50 flex items-center px-4 hover:bg-zinc-900/50 transition-colors"
                  >
                    {renderItem(item, {
                      seccionNombre: seccion.nombre,
                      categoriaNombre: categoria.nombre,
                      servicioNombre: servicio.nombre,
                      servicioId: servicio.id,
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
});

SchedulerSidebar.displayName = 'SchedulerSidebar';

