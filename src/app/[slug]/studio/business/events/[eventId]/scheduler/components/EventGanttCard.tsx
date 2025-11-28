'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { GanttCardTable } from './GanttCardTable';
import { GanttTaskModal } from './GanttTaskModal';

import { type DateRange } from 'react-day-picker';

interface EventGanttCardProps {
  cotizacion: NonNullable<EventoDetalle['cotizaciones']>[0];
  studioSlug: string;
  eventId: string;
  eventDate: Date | null;
  dateRange?: DateRange;
  showDuration?: boolean;
  showProgress?: boolean;
}

interface GroupedItem {
  seccion: string;
  categoria: string;
  items: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'];
}

export function EventGanttCard({ cotizacion, studioSlug, eventId, eventDate, dateRange, showDuration = false, showProgress = false }: EventGanttCardProps) {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [localItems, setLocalItems] = useState(cotizacion.cotizacion_items || []);
  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    taskId: string | null;
    dayDate: Date | null;
    itemId: string | null;
    itemName: string | null;
  }>({
    isOpen: false,
    taskId: null,
    dayDate: null,
    itemId: null,
    itemName: null,
  });

  // Sincronizar items locales con prop cuando cambie
  useEffect(() => {
    setLocalItems(cotizacion.cotizacion_items || []);
  }, [cotizacion.cotizacion_items]);

  // Crear mapa de items usando estado local
  const itemsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof cotizacion.cotizacion_items>[0]>();
    localItems.forEach((item) => {
      if (item.item_id) {
        map.set(item.item_id, item);
      }
    });
    return map;
  }, [localItems]);

  // Filtrar catálogo para mostrar solo items incluidos en la cotización
  const catalogoFiltrado = useMemo(() => {
    return catalogo.map(seccion => ({
      ...seccion,
      categorias: seccion.categorias
        .map(categoria => ({
          ...categoria,
          servicios: categoria.servicios.filter(servicio => itemsMap.has(servicio.id))
        }))
        .filter(categoria => categoria.servicios.length > 0)
    })).filter(seccion => seccion.categorias.length > 0);
  }, [catalogo, itemsMap]);

  useEffect(() => {
    const loadCatalogo = async () => {
      try {
        setLoading(true);
        const catalogoResult = await obtenerCatalogo(studioSlug);
        if (catalogoResult.success && catalogoResult.data) {
          setCatalogo(catalogoResult.data);
        }
      } catch (error) {
        // Error silencioso - el componente maneja el estado de loading
      } finally {
        setLoading(false);
      }
    };

    loadCatalogo();
  }, [studioSlug]);

  if (loading) {
    return (
      <ZenCard variant="outlined">
        <ZenCardHeader>
          <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  if (!cotizacion.cotizacion_items || cotizacion.cotizacion_items.length === 0) {
    return null;
  }

  if (catalogoFiltrado.length === 0) {
    return (
      <ZenCard variant="outlined">
        <ZenCardHeader>
          <ZenCardTitle className="text-lg">{cotizacion.name}</ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent>
          <p className="text-sm text-zinc-400">No hay items para mostrar</p>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard variant="outlined" className="overflow-hidden">
      <ZenCardHeader>
        <ZenCardTitle className="text-lg">{cotizacion.name}</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-0 sm:p-0">
        <GanttCardTable
          secciones={catalogoFiltrado}
          itemsMap={itemsMap}
          studioSlug={studioSlug}
          dateRange={dateRange}
          showDuration={showDuration}
          showProgress={showProgress}
          onTaskClick={(taskId, dayDate, itemId) => {
            const item = itemsMap.get(itemId);
            setTaskModalState({
              isOpen: true,
              taskId,
              dayDate,
              itemId,
              itemName: item?.name_snapshot || item?.name || null,
            });
          }}
          onAddTaskClick={(dayDate, itemId, itemName) => {
            setTaskModalState({
              isOpen: true,
              taskId: null,
              dayDate,
              itemId,
              itemName,
            });
          }}
        />
      </ZenCardContent>

      {/* Modal de tarea */}
      {taskModalState.itemId && (
        <GanttTaskModal
          isOpen={taskModalState.isOpen}
          onClose={() => {
            setTaskModalState({
              isOpen: false,
              taskId: null,
              dayDate: null,
              itemId: null,
              itemName: null,
            });
          }}
          studioSlug={studioSlug}
          eventId={eventId}
          itemId={taskModalState.itemId}
          itemName={taskModalState.itemName || undefined}
          dayDate={taskModalState.dayDate}
          dateRange={dateRange}
          taskId={taskModalState.taskId}
          onSuccess={async () => {
            // Cerrar modal inmediatamente para mejor UX
            setTaskModalState({
              isOpen: false,
              taskId: null,
              dayDate: null,
              itemId: null,
              itemName: null,
            });
            // Refrescar datos del servidor
            router.refresh();
          }}
        />
      )}
    </ZenCard>
  );
}

