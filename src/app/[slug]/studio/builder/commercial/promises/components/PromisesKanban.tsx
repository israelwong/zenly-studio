'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Settings, Archive, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ZenInput } from '@/components/ui/zen';
import { PromiseKanbanCard } from './PromiseKanbanCard';
import { PipelineConfigModal } from './PipelineConfigModal';
import { PromiseFormModal } from './PromiseFormModal';
import { movePromise } from '@/lib/actions/studio/builder/commercial/promises';
import { toast } from 'sonner';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import confetti from 'canvas-confetti';

interface PromisesKanbanProps {
  studioSlug: string;
  promises: PromiseWithContact[];
  pipelineStages: PipelineStage[];
  search: string;
  onSearchChange: (search: string) => void;
  onPromiseCreated: () => void;
  onPromiseUpdated: () => void;
  onPromiseMoved: () => void;
  onPipelineStagesUpdated: () => void;
  isPromiseFormModalOpen?: boolean;
  setIsPromiseFormModalOpen?: (open: boolean) => void;
}

export function PromisesKanban({
  studioSlug,
  promises,
  pipelineStages,
  search: externalSearch,
  onSearchChange,
  onPromiseCreated,
  onPromiseUpdated,
  onPromiseMoved,
  onPipelineStagesUpdated,
  isPromiseFormModalOpen: externalIsOpen,
  setIsPromiseFormModalOpen: externalSetIsOpen,
}: PromisesKanbanProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isPromiseFormModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsPromiseFormModalOpen = externalSetIsOpen || setInternalIsOpen;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localPromises, setLocalPromises] = useState<PromiseWithContact[]>(promises);
  const prevPromisesRef = useRef<PromiseWithContact[]>(promises);
  const isDraggingRef = useRef(false);
  const [showArchived, setShowArchived] = useState(false);
  const [localSearch, setLocalSearch] = useState(externalSearch || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local cuando cambian las promesas desde el padre
  // Evitar sincronización durante drag and drop para prevenir parpadeos
  useEffect(() => {
    // Si estamos arrastrando, no sincronizar
    if (isDraggingRef.current) {
      prevPromisesRef.current = promises;
      return;
    }

    // Comparar con la referencia anterior para detectar cambios reales
    const prevIds = new Set(prevPromisesRef.current.map(p => p.id));
    const newIds = new Set(promises.map(p => p.id));

    const hasIdChanges =
      prevIds.size !== newIds.size ||
      [...prevIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !prevIds.has(id));

    // Solo sincronizar si hay cambios en IDs (nuevas/eliminadas promesas)
    // No sincronizar por cambios de stage_id ya que se manejan con actualización optimista
    if (hasIdChanges || localPromises.length === 0) {
      setLocalPromises(promises);
    }

    prevPromisesRef.current = promises;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promises]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sincronizar búsqueda externa si cambia (solo una vez al cargar)
  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== localSearch) {
      setLocalSearch(externalSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejar tecla Escape para limpiar búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setLocalSearch('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtrar promesas por búsqueda local
  const filteredPromises = useMemo(() => {
    if (!localSearch.trim()) return localPromises;

    const searchLower = localSearch.toLowerCase();
    return localPromises.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(searchLower);
      const emailMatch = p.email?.toLowerCase().includes(searchLower);
      const phoneMatch = p.phone.includes(localSearch);
      const eventTypeMatch = p.event_type?.name.toLowerCase().includes(searchLower);

      // Búsqueda por fecha de evento
      let dateMatch = false;
      if (p.defined_date) {
        const eventDate = new Date(p.defined_date);
        const dateStr = eventDate.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).toLowerCase();
        dateMatch = dateStr.includes(searchLower);
      }
      if (!dateMatch && p.interested_dates && p.interested_dates.length > 0) {
        dateMatch = p.interested_dates.some(date => {
          const dateObj = new Date(date);
          const dateStr = dateObj.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).toLowerCase();
          return dateStr.includes(searchLower);
        });
      }

      // Búsqueda por agendamiento (cita)
      let agendaMatch = false;
      if (p.agenda) {
        const hasAgenda = p.agenda.date !== null;
        const isCitaKeyword = searchLower === 'cita' || searchLower === 'citas';
        const isVirtualKeyword = searchLower === 'virtual' || searchLower === 'virtuales';
        const isPresencialKeyword = searchLower === 'presencial' || searchLower === 'presenciales';

        // Si busca "cita", mostrar todas las que tienen agendamiento
        if (isCitaKeyword && hasAgenda) {
          agendaMatch = true;
        }
        // Si busca "virtual", mostrar las que tienen type_scheduling === 'virtual'
        else if (isVirtualKeyword && p.agenda.type_scheduling === 'virtual') {
          agendaMatch = true;
        }
        // Si busca "presencial", mostrar las que tienen type_scheduling === 'presencial'
        else if (isPresencialKeyword && p.agenda.type_scheduling === 'presencial') {
          agendaMatch = true;
        }
        // Búsqueda en otros campos del agendamiento
        else if (hasAgenda) {
          const addressMatch = p.agenda.address?.toLowerCase().includes(searchLower) ?? false;
          const conceptMatch = p.agenda.concept?.toLowerCase().includes(searchLower) ?? false;
          const linkMatch = p.agenda.link_meeting_url?.toLowerCase().includes(searchLower) ?? false;

          // Búsqueda por fecha de agendamiento
          let agendaDateMatch = false;
          if (p.agenda.date) {
            const agendaDate = new Date(p.agenda.date);
            const agendaDateStr = agendaDate.toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }).toLowerCase();
            agendaDateMatch = agendaDateStr.includes(searchLower);
          }

          // Búsqueda por hora de agendamiento
          const timeMatch = p.agenda.time?.toLowerCase().includes(searchLower) ?? false;

          agendaMatch = addressMatch || conceptMatch || linkMatch || agendaDateMatch || timeMatch;
        }
      }

      // Búsqueda por tags
      const tagsMatch = p.tags?.some(tag =>
        tag.name.toLowerCase().includes(searchLower) ||
        tag.slug.toLowerCase().includes(searchLower)
      );

      // Búsqueda por último log
      const logMatch = p.last_log?.content.toLowerCase().includes(searchLower);

      return nameMatch || emailMatch || phoneMatch || eventTypeMatch || dateMatch || agendaMatch || tagsMatch || logMatch;
    });
  }, [localPromises, localSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    // Opcional: notificar al padre si es necesario
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    searchInputRef.current?.focus();
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  // Ordenar promesas: por fecha de evento (defined_date) o fecha de actualización
  const sortedPromises = useMemo(() => {
    return [...filteredPromises].sort((a, b) => {
      // Prioridad 1: Fecha definida del evento
      const dateA = a.defined_date ? new Date(a.defined_date).getTime() : 0;
      const dateB = b.defined_date ? new Date(b.defined_date).getTime() : 0;

      if (dateA !== 0 && dateB !== 0) {
        return dateA - dateB; // Más cercana primero
      }
      if (dateA !== 0) return -1; // A tiene fecha, B no
      if (dateB !== 0) return 1; // B tiene fecha, A no

      // Prioridad 2: Fecha de actualización (más reciente primero)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filteredPromises]);

  // Filtrar stages según toggle de archivados
  const visibleStages = useMemo(() => {
    if (showArchived) {
      return pipelineStages;
    }
    return pipelineStages.filter((stage) => stage.slug !== 'archived');
  }, [pipelineStages, showArchived]);

  // Agrupar promises por stage (ya ordenadas)
  const promisesByStage = useMemo(() => {
    return visibleStages.reduce((acc: Record<string, PromiseWithContact[]>, stage: PipelineStage) => {
      acc[stage.id] = sortedPromises.filter(
        (p: PromiseWithContact) => p.promise_pipeline_stage_id === stage.id
      );
      return acc;
    }, {} as Record<string, PromiseWithContact[]>);
  }, [sortedPromises, visibleStages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    isDraggingRef.current = false;

    if (!over || active.id === over.id) return;

    const promiseId = active.id as string;
    const newStageId = over.id as string;

    // Verificar que es un stage válido
    const stage = pipelineStages.find((s: PipelineStage) => s.id === newStageId);
    if (!stage) return;

    // Buscar la promesa para obtener su promise_id
    const promise = localPromises.find((p: PromiseWithContact) => p.id === promiseId);
    if (!promise || !promise.promise_id) {
      toast.error('No se pudo encontrar la promesa');
      return;
    }

    // Verificar si es etapa "aprobado" para lanzar confeti de forma optimista
    const isApprovedStage = stage.slug === 'approved' || stage.name.toLowerCase().includes('aprobado');

    // Disparar confeti inmediatamente si es etapa aprobado
    if (isApprovedStage) {
      // Función para calcular y disparar confeti desde la posición de la tarjeta
      const fireConfetti = () => {
        let confettiOrigin: { x?: number; y: number } = { y: 0.9 }; // Por defecto, parte inferior de la ventana

        try {
          // Buscar el elemento en el DOM usando el ID de la promesa
          // Usar un pequeño delay para asegurar que el elemento esté en su nueva posición
          const activeElement = document.querySelector(`[data-id="${promiseId}"]`) as HTMLElement;

          if (activeElement) {
            const rect = activeElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;

            // Calcular posición relativa (0-1) desde el centro de la tarjeta
            const x = (rect.left + rect.width / 2) / windowWidth;
            const y = (rect.top + rect.height / 2) / windowHeight;

            confettiOrigin = { x, y };
          }
        } catch {
          // Si hay error, usar posición por defecto (parte inferior)
          console.debug('No se pudo obtener posición de la tarjeta, usando posición por defecto');
        }

        confetti({
          particleCount: 100,
          spread: 70,
          origin: confettiOrigin,
        });
      };

      // Disparar inmediatamente (el elemento puede estar en DragOverlay o en su nueva posición)
      // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
      requestAnimationFrame(() => {
        fireConfetti();
      });
    }

    // Actualización optimista local
    setLocalPromises((prev) =>
      prev.map((p) =>
        p.id === promiseId
          ? { ...p, promise_pipeline_stage_id: newStageId }
          : p
      )
    );

    try {
      const result = await movePromise(studioSlug, {
        promise_id: promise.promise_id,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Promesa movida exitosamente');
        // No llamar onPromiseMoved() para evitar refresh completo
        // La actualización optimista ya actualizó el estado local
      } else {
        // Revertir actualización optimista en caso de error
        setLocalPromises(prevPromisesRef.current);
        toast.error(result.error || 'Error al mover promesa');
      }
    } catch (error) {
      // Revertir actualización optimista en caso de error
      setLocalPromises(prevPromisesRef.current);
      console.error('Error moviendo promesa:', error);
      toast.error('Error al mover promesa');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    isDraggingRef.current = true;
  };

  const handlePromiseClick = (promise: PromiseWithContact) => {
    // Usar promiseId si está disponible, de lo contrario usar contactId como fallback
    const routeId = promise.promise_id || promise.id;
    router.push(`/${studioSlug}/studio/builder/commercial/promises/${routeId}`);
  };

  const activePromise = activeId
    ? localPromises.find((p: PromiseWithContact) => p.id === activeId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4 flex-shrink-0">
        <div className="flex-1 w-full relative">
          <div className="relative">
            <ZenInput
              ref={searchInputRef}
              id="search"
              placeholder="Buscar promesas..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={Search}
              iconClassName="h-4 w-4"
              className={localSearch ? 'pr-10' : ''}
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showArchived
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Ocultar' : 'Mostrar'} Archivados
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Configurar
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1 min-h-0 pb-4">
          {/* Si hay más de 3 etapas, todas tienen ancho fijo con scroll */}
          {visibleStages.length > 3 ? (
            visibleStages.map((stage: PipelineStage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                promises={promisesByStage[stage.id] || []}
                onPromiseClick={handlePromiseClick}
                studioSlug={studioSlug}
                isFlexible={false}
                onPromiseArchived={onPromiseUpdated}
              />
            ))
          ) : (
            /* Si hay 3 o menos, las primeras 3 ocupan el ancho disponible */
            <div className="flex gap-4 flex-1 min-w-0 w-full">
              {visibleStages.map((stage: PipelineStage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  promises={promisesByStage[stage.id] || []}
                  onPromiseClick={handlePromiseClick}
                  studioSlug={studioSlug}
                  isFlexible={true}
                  onPromiseArchived={onPromiseUpdated}
                />
              ))}
            </div>
          )}
        </div>

        <DragOverlay style={{ cursor: 'grabbing' }}>
          {activePromise ? (
            <div className="opacity-90 rotate-2 shadow-2xl">
              <PromiseKanbanCard promise={activePromise} studioSlug={studioSlug} onArchived={onPromiseUpdated} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modales */}
      <PipelineConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        studioSlug={studioSlug}
        pipelineStages={pipelineStages}
        onSuccess={onPipelineStagesUpdated}
      />
      <PromiseFormModal
        isOpen={isPromiseFormModalOpen}
        onClose={() => setIsPromiseFormModalOpen(false)}
        studioSlug={studioSlug}
        onSuccess={() => {
          onPromiseCreated();
          setIsPromiseFormModalOpen(false);
        }}
      />
    </div>
  );
}

// Componente para cada columna del Kanban
function KanbanColumn({
  stage,
  promises,
  onPromiseClick,
  studioSlug,
  isFlexible = false,
  onPromiseArchived,
}: {
  stage: PipelineStage;
  promises: PromiseWithContact[];
  onPromiseClick: (promise: PromiseWithContact) => void;
  studioSlug: string;
  isFlexible?: boolean;
  onPromiseArchived?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${isFlexible
        ? 'flex-1 min-w-[280px]'
        : 'w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0'
        } flex flex-col rounded-lg border p-4 h-full overflow-hidden transition-all duration-200 ${isOver
          ? 'bg-zinc-800/70'
          : 'bg-zinc-900/50 border-zinc-700'
        }`}
      style={{
        borderColor: isOver ? stage.color : undefined,
        boxShadow: isOver ? `0 10px 15px -3px ${stage.color}20, 0 4px 6px -2px ${stage.color}10` : undefined,
      }}
    >
      {/* Header de columna */}
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-700"
        style={{ borderBottomColor: stage.color + '40' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium text-white text-sm">{stage.name}</h3>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
          {promises.length}
        </span>
      </div>

      {/* Lista de promises */}
      <div
        className="space-y-3 flex-1 overflow-y-auto min-h-0"
        style={{
          minHeight: promises.length === 0 ? '200px' : 'auto',
        }}
      >
        <SortableContext
          items={promises.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {promises.map((promise) => (
            <PromiseKanbanCard
              key={promise.id}
              promise={promise}
              onClick={onPromiseClick}
              studioSlug={studioSlug}
              onArchived={onPromiseArchived}
            />
          ))}
        </SortableContext>

        {promises.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Sin promesas
          </div>
        )}
      </div>
    </div>
  );
}

