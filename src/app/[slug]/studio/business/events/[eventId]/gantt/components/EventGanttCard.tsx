'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { CrewMemberSelector } from '@/components/shared/crew-members/CrewMemberSelector';
import { asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { toast } from 'sonner';

interface EventGanttCardProps {
  cotizacion: NonNullable<EventoDetalle['cotizaciones']>[0];
  studioSlug: string;
  eventDate: Date | null;
}

interface GroupedItem {
  seccion: string;
  categoria: string;
  items: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'];
}

export function EventGanttCard({ cotizacion, studioSlug, eventDate }: EventGanttCardProps) {
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());
  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Crear mapa de items de la cotización usando item_id
  const itemsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof cotizacion.cotizacion_items>[0]>();
    cotizacion.cotizacion_items?.forEach((item) => {
      if (item.item_id) {
        map.set(item.item_id, item);
      }
    });
    return map;
  }, [cotizacion.cotizacion_items]);

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
        console.error('Error loading catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogo();
  }, [studioSlug]);

  // Expandir todas las secciones y categorías por defecto cuando se carga el catálogo
  useEffect(() => {
    if (catalogoFiltrado.length > 0) {
      const nuevasSecciones = new Set<string>();
      const nuevasCategorias = new Set<string>();

      catalogoFiltrado.forEach(seccion => {
        nuevasSecciones.add(seccion.id);
        seccion.categorias.forEach(categoria => {
          nuevasCategorias.add(categoria.id);
        });
      });

      setSeccionesExpandidas(nuevasSecciones);
      setCategoriasExpandidas(nuevasCategorias);
    }
  }, [catalogoFiltrado]);

  const toggleSeccion = (seccionId: string) => {
    setSeccionesExpandidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(seccionId)) {
        nuevo.delete(seccionId);
      } else {
        nuevo.add(seccionId);
      }
      return nuevo;
    });
  };

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasExpandidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(categoriaId)) {
        nuevo.delete(categoriaId);
      } else {
        nuevo.add(categoriaId);
      }
      return nuevo;
    });
  };

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
    <ZenCard variant="outlined">
      <ZenCardHeader>
        <ZenCardTitle className="text-lg">{cotizacion.name}</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="space-y-2">
        {catalogoFiltrado
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
          .map((seccion) => {
            const isSeccionExpanded = seccionesExpandidas.has(seccion.id);
            const categoriasSorted = seccion.categorias.sort((a, b) => (a.orden || 0) - (b.orden || 0));

            return (
              <div
                key={seccion.id}
                className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30"
              >
                {/* Nivel 1: Sección */}
                <button
                  onClick={() => toggleSeccion(seccion.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isSeccionExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="text-base font-medium text-zinc-300">{seccion.nombre}</span>
                  </div>
                </button>

                {/* Contenido de la sección */}
                {isSeccionExpanded && (
                  <div className="border-t border-zinc-800 bg-zinc-900/20">
                    <div className="px-4 py-2 space-y-2">
                      {categoriasSorted.map((categoria) => {
                        const isCategoriaExpanded = categoriasExpandidas.has(categoria.id);
                        const serviciosSorted = categoria.servicios.sort((a, b) => (a.orden || 0) - (b.orden || 0));

                        return (
                          <div
                            key={categoria.id}
                            className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/30"
                          >
                            {/* Nivel 2: Categoría */}
                            <button
                              onClick={() => toggleCategoria(categoria.id)}
                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isCategoriaExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-zinc-400">
                                  {categoria.nombre}
                                </span>
                              </div>
                            </button>

                            {/* Contenido de la categoría */}
                            {isCategoriaExpanded && (
                              <div className="border-t border-zinc-800 bg-zinc-900/20">
                                <div className="px-3 py-2 space-y-1">
                                  {serviciosSorted.map((servicio) => {
                                    const cotizacionItem = itemsMap.get(servicio.id);
                                    if (!cotizacionItem) return null;

                                    const handleCrewChange = async (memberId: string | null) => {
                                      const result = await asignarCrewAItem(
                                        studioSlug,
                                        cotizacionItem.id,
                                        memberId
                                      );
                                      if (result.success) {
                                        toast.success('Personal asignado correctamente');
                                        window.location.reload();
                                      } else {
                                        toast.error(result.error || 'Error al asignar personal');
                                      }
                                    };

                                    return (
                                      <div
                                        key={servicio.id}
                                        className="flex items-center justify-between py-2 px-2 text-sm text-zinc-300 rounded hover:bg-zinc-800/30 transition-colors"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="break-words text-zinc-300">
                                              {servicio.nombre}
                                            </span>
                                            <span className="text-emerald-400 font-medium whitespace-nowrap">
                                              x{cotizacionItem.quantity}
                                            </span>
                                          </div>
                                          {cotizacionItem.description && (
                                            <p className="text-xs text-zinc-500 mt-1">
                                              {cotizacionItem.description}
                                            </p>
                                          )}
                                          <div className="mt-2">
                                            <CrewMemberSelector
                                              studioSlug={studioSlug}
                                              selectedMemberId={cotizacionItem.assigned_to_crew_member_id || null}
                                              onSelect={handleCrewChange}
                                              placeholder="Asignar personal"
                                              className="w-full"
                                            />
                                          </div>
                                        </div>
                                        <button
                                          className="ml-2 p-1.5 text-zinc-400 hover:text-white transition-colors"
                                          title="Configurar item"
                                        >
                                          <Settings className="h-4 w-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </ZenCardContent>
    </ZenCard>
  );
}

