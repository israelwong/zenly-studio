'use client';

import React, { useState, useCallback } from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { SchedulerItemPopover } from './SchedulerItemPopover';
import { ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface SchedulerSidebarProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  studioSlug: string;
  renderItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
}

interface SchedulerItemProps {
  item: CotizacionItem;
  metadata: ItemMetadata;
  studioSlug: string;
  renderItem?: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Componente individual para cada item con su propio estado
function SchedulerItem({ item: initialItem, metadata, studioSlug, renderItem }: SchedulerItemProps) {
  const [localItem, setLocalItem] = useState(initialItem);

  const handleCrewMemberUpdate = useCallback((crewMemberId: string | null, crewMember?: { id: string; name: string; tipo: string } | null) => {
    if (crewMemberId && crewMember) {
      setLocalItem(prev => ({
        ...prev,
        assigned_to_crew_member_id: crewMemberId,
        assigned_to_crew_member: {
          id: crewMember.id,
          name: crewMember.name,
          tipo: crewMember.tipo as 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR',
          category: {
            id: '',
            name: crewMember.tipo || 'Sin categoría',
          },
        },
      } as typeof prev));
    } else {
      setLocalItem(prev => ({
        ...prev,
        assigned_to_crew_member_id: null,
        assigned_to_crew_member: null,
      }));
    }
  }, []);

  const DefaultItemRender = () => (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{metadata.servicioNombre}</p>
        {localItem.assigned_to_crew_member && (
          <div className="flex items-center gap-1.5 mt-1">
            <ZenAvatar className="h-4 w-4 flex-shrink-0">
              <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[8px]">
                {getInitials(localItem.assigned_to_crew_member.name)}
              </ZenAvatarFallback>
            </ZenAvatar>
            <p className="text-xs text-zinc-500 truncate">
              {localItem.assigned_to_crew_member.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <SchedulerItemPopover
      item={localItem}
      studioSlug={studioSlug}
      onCrewMemberUpdate={handleCrewMemberUpdate}
    >
      <button className="w-full text-left">
        {renderItem ? renderItem(localItem, metadata) : <DefaultItemRender />}
      </button>
    </SchedulerItemPopover>
  );
}

export const SchedulerSidebar = React.memo(({
  secciones,
  itemsMap,
  studioSlug,
  renderItem,
}: SchedulerSidebarProps) => {
  return (
    <div className="w-full bg-zinc-950">
      {/* Header placeholder - altura exacta 60px para alinear con SchedulerHeader */}
      <div className="h-[60px] bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 flex items-center px-4 flex-shrink-0 sticky top-0 left-0 z-30">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Servicios</span>
      </div>

      {secciones.map((seccion) => (
        <React.Fragment key={seccion.id}>
          {/* Sección - altura exacta 40px */}
          <div className="h-[40px] bg-zinc-900/50 border-b border-zinc-800 px-4 flex items-center">
            <span className="text-sm font-semibold text-zinc-300">{seccion.nombre}</span>
          </div>

          {/* Categorías */}
          {seccion.categorias.map((categoria) => (
            <React.Fragment key={categoria.id}>
              {/* Categoría - altura exacta 32px */}
              <div className="h-[32px] bg-zinc-900/30 border-b border-zinc-800/50 px-6 flex items-center">
                <span className="text-xs font-medium text-zinc-400">{categoria.nombre}</span>
              </div>

              {/* Items - altura exacta 60px */}
              {categoria.servicios.map((servicio) => {
                const item = itemsMap.get(servicio.id);
                if (!item) return null;

                const metadata: ItemMetadata = {
                  seccionNombre: seccion.nombre,
                  categoriaNombre: categoria.nombre,
                  servicioNombre: servicio.nombre,
                  servicioId: servicio.id,
                };

                return (
                  <div
                    key={item.id}
                    className="h-[60px] border-b border-zinc-800/50 flex items-center px-4 hover:bg-zinc-900/50 transition-colors"
                  >
                    <SchedulerItem
                      item={item}
                      metadata={metadata}
                      studioSlug={studioSlug}
                      renderItem={renderItem}
                    />
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

