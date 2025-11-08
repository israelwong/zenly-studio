'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Sparkles, Loader2 } from 'lucide-react';
import {
  ZenButton,
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { obtenerPaquetes } from '@/lib/actions/studio/builder/paquetes/paquetes.actions';
import {
  getCotizacionesByPromiseId,
  reorderCotizaciones,
} from '@/lib/actions/studio/builder/commercial/promises/cotizaciones.actions';
import { PromiseQuotesPanelCard } from './PromiseQuotesPanelCard';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { CotizacionListItem } from '@/lib/actions/studio/builder/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';

interface PromiseQuotesPanelProps {
  studioSlug: string;
  promiseId: string | null;
  eventTypeId: string | null;
  isSaved: boolean;
  contactId?: string | null;
}

export function PromiseQuotesPanel({
  studioSlug,
  promiseId,
  eventTypeId,
  isSaved,
  contactId,
}: PromiseQuotesPanelProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<Array<{ id: string; name: string; precio: number | null }>>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<CotizacionListItem[]>([]);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const loadPackages = async () => {
      if (!eventTypeId) {
        setPackages([]);
        setLoadingPackages(false);
        return;
      }
      setLoadingPackages(true);
      try {
        const result = await obtenerPaquetes(studioSlug);
        if (result.success && result.data) {
          // Filtrar paquetes por tipo de evento si está disponible
          const filteredPackages = result.data
            .filter((pkg: PaqueteFromDB) => {
              // Si el paquete tiene event_types, filtrar por eventTypeId
              if (pkg.event_types) {
                return pkg.event_types.id === eventTypeId;
              }
              return true; // Si no tiene tipo de evento, incluir todos
            })
            .map((pkg: PaqueteFromDB) => ({
              id: pkg.id,
              name: pkg.name,
              precio: pkg.precio || null,
            }));
          setPackages(filteredPackages);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };

    loadPackages();
  }, [studioSlug, eventTypeId]);

  useEffect(() => {
    const loadCotizaciones = async () => {
      if (!promiseId || !isSaved) {
        setCotizaciones([]);
        setLoadingCotizaciones(false);
        return;
      }

      // Solo mostrar skeleton si realmente vamos a cargar datos
      setLoadingCotizaciones(true);

      try {
        const result = await getCotizacionesByPromiseId(promiseId);
        // result.data siempre es un array (puede estar vacío)
        // Si success es true, usar el array (vacío o con datos)
        if (result.success) {
          setCotizaciones(result.data || []);
        } else {
          setCotizaciones([]);
        }
      } catch (error) {
        console.error('[PromiseQuotesPanel] Error loading cotizaciones:', error);
        setCotizaciones([]);
      } finally {
        // Ocultar skeleton inmediatamente después de recibir respuesta
        setLoadingCotizaciones(false);
      }
    };

    loadCotizaciones();
  }, [promiseId, isSaved]);

  const handleCreateFromPackage = (packageId: string) => {
    if (!promiseId) {
      toast.error('Se requiere una promesa para crear una cotización');
      return;
    }
    // Navegar a la ruta de nueva cotización con el paqueteId como parámetro
    const basePath = `/${studioSlug}/studio/builder/commercial/promises/${promiseId}/cotizacion/nueva`;
    const params = new URLSearchParams();
    if (packageId) {
      params.set('paqueteId', packageId);
    }
    if (contactId) {
      params.set('contactId', contactId);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
  };

  const handleCreateCustom = () => {
    if (!promiseId) {
      return;
    }
    // Navegar a la ruta de nueva cotización sin paqueteId (personalizada)
    const basePath = `/${studioSlug}/studio/builder/commercial/promises/${promiseId}/cotizacion/nueva`;
    const params = new URLSearchParams();
    if (contactId) {
      params.set('contactId', contactId);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (isReordering || !over || active.id === over.id) {
      return;
    }

    const oldIndex = cotizaciones.findIndex((c) => c.id === active.id);
    const newIndex = cotizaciones.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newCotizaciones = arrayMove(cotizaciones, oldIndex, newIndex);

    try {
      setIsReordering(true);

      // Actualización optimista
      setCotizaciones(newCotizaciones);

      // Actualizar en el servidor
      const cotizacionIds = newCotizaciones.map((c) => c.id);
      const result = await reorderCotizaciones(studioSlug, cotizacionIds);

      if (!result.success) {
        toast.error(result.error || 'Error al reordenar cotizaciones');
        // Revertir cambio local
        setCotizaciones(cotizaciones);
      }
    } catch (error) {
      console.error('Error reordering cotizaciones:', error);
      toast.error('Error al reordenar cotizaciones');
      // Revertir cambio local
      setCotizaciones(cotizaciones);
    } finally {
      setIsReordering(false);
    }
  };

  const isMenuDisabled = !eventTypeId || !isSaved;

  return (
    <ZenCard className="min-h-[300px] flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">Cotizaciones</ZenCardTitle>
          <ZenDropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <ZenDropdownMenuTrigger asChild>
              <ZenButton
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={isMenuDisabled}
              >
                <Plus className="h-3.5 w-3.5" />
              </ZenButton>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end" className="min-w-[200px]">
              {loadingPackages ? (
                <div className="px-2 py-3 flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando paquetes...</span>
                </div>
              ) : packages.length > 0 ? (
                <>
                  {packages.map((pkg) => (
                    <ZenDropdownMenuItem
                      key={pkg.id}
                      onClick={() => handleCreateFromPackage(pkg.id)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      <span className="flex-1">{pkg.name}</span>
                      {pkg.precio !== null && (
                        <span className="text-xs text-zinc-400 ml-2">
                          ${pkg.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </ZenDropdownMenuItem>
                  ))}
                  <ZenDropdownMenuSeparator />
                  <ZenDropdownMenuItem onClick={handleCreateCustom}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Personalizada
                  </ZenDropdownMenuItem>
                </>
              ) : (
                <ZenDropdownMenuItem onClick={handleCreateCustom}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Personalizada
                </ZenDropdownMenuItem>
              )}
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 flex flex-col">
        <div
          className="relative overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-zinc-500"
          style={{
            maxHeight: cotizaciones.length > 3 ? '450px' : 'none',
            scrollbarWidth: 'thin',
            scrollbarColor: '#52525b transparent',
          }}
        >
          {!isSaved ? (
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              <p className="text-xs text-zinc-500 text-center px-4">
                Guarda la promesa para agregar cotizaciones
              </p>
            </div>
          ) : loadingCotizaciones ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg bg-zinc-800/50 border-zinc-700 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-4 h-4 bg-zinc-700 rounded mt-1" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 bg-zinc-700 rounded w-3/4" />
                      <div className="h-3 bg-zinc-700 rounded w-1/2" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-4 bg-zinc-700 rounded w-20" />
                        <div className="h-5 bg-zinc-700 rounded-full w-16" />
                      </div>
                      <div className="h-3 bg-zinc-700 rounded w-32" />
                    </div>
                    <div className="w-6 h-6 bg-zinc-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              {!eventTypeId ? (
                <p className="text-xs text-zinc-500 text-center px-4">
                  Selecciona un tipo de evento para crear cotizaciones
                </p>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 text-center px-4">
                    No hay cotizaciones asociadas a esta promesa
                  </p>
                  <p className="text-xs text-zinc-400 text-center px-4 mt-2">
                    Usa el botón + para crear una nueva cotización
                  </p>
                </>
              )}
            </div>
          ) : !isHydrated ? (
            <div className="space-y-2">
              {cotizaciones.map((cotizacion) => (
                <PromiseQuotesPanelCard
                  key={cotizacion.id}
                  cotizacion={cotizacion}
                  studioSlug={studioSlug}
                  promiseId={promiseId}
                  contactId={contactId}
                  isDuplicating={duplicatingId === cotizacion.id}
                  onDuplicateStart={(id) => setDuplicatingId(id)}
                  onDuplicateComplete={(newCotizacion) => {
                    setDuplicatingId(null);
                    setCotizaciones((prev) => [...prev, newCotizacion]);
                  }}
                  onDuplicateError={() => {
                    setDuplicatingId(null);
                  }}
                  onDelete={(id) => {
                    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
                  }}
                  onArchive={(id) => {
                    // Actualización local: marcar como archivada
                    setCotizaciones((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, archived: true } : c))
                    );
                  }}
                  onUnarchive={(id) => {
                    // Actualización local: marcar como desarchivada
                    setCotizaciones((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, archived: false } : c))
                    );
                  }}
                  onNameUpdate={(id, newName) => {
                    setCotizaciones((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
                    );
                  }}
                />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={cotizaciones.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={`space-y-2 ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                  {cotizaciones.map((cotizacion) => (
                    <PromiseQuotesPanelCard
                      key={cotizacion.id}
                      cotizacion={cotizacion}
                      studioSlug={studioSlug}
                      promiseId={promiseId}
                      contactId={contactId}
                      isDuplicating={duplicatingId === cotizacion.id}
                      onDuplicateStart={(id) => setDuplicatingId(id)}
                      onDuplicateComplete={(newCotizacion) => {
                        setDuplicatingId(null);
                        setCotizaciones((prev) => [...prev, newCotizacion]);
                      }}
                      onDuplicateError={() => {
                        setDuplicatingId(null);
                      }}
                      onDelete={(id) => {
                        setCotizaciones((prev) => prev.filter((c) => c.id !== id));
                      }}
                      onArchive={(id) => {
                        // Actualización local: marcar como archivada
                        setCotizaciones((prev) =>
                          prev.map((c) => (c.id === id ? { ...c, archived: true } : c))
                        );
                      }}
                      onUnarchive={(id) => {
                        // Actualización local: marcar como desarchivada
                        setCotizaciones((prev) =>
                          prev.map((c) => (c.id === id ? { ...c, archived: false } : c))
                        );
                      }}
                      onNameUpdate={(id, newName) => {
                        setCotizaciones((prev) =>
                          prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
                        );
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {/* Gradiente inferior - 1/4 de la altura del área scrollable (450px / 4 = 112.5px) */}
          {cotizaciones.length > 3 && (
            <div className="sticky bottom-0 h-[112.5px] pointer-events-none bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent z-10" />
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

