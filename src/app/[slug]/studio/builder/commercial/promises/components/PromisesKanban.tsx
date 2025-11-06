'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Settings } from 'lucide-react';
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
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { PromiseCard } from './PromiseCard';
import { PipelineConfigModal } from './PipelineConfigModal';
import { movePromise } from '@/lib/actions/studio/builder/commercial/prospects';
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
}

export function PromisesKanban({
  studioSlug,
  promises,
  pipelineStages,
  search,
  onSearchChange,
  onPromiseCreated,
  onPromiseUpdated,
  onPromiseMoved,
  onPipelineStagesUpdated,
}: PromisesKanbanProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localPromises, setLocalPromises] = useState<PromiseWithContact[]>(promises);
  const prevPromisesRef = useRef<PromiseWithContact[]>(promises);
  const isDraggingRef = useRef(false);

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

  // Filtrar promesas por búsqueda
  const filteredPromises = useMemo(() => {
    if (!search.trim()) return localPromises;

    const searchLower = search.toLowerCase();
    return localPromises.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(searchLower);
      const emailMatch = p.email?.toLowerCase().includes(searchLower);
      const phoneMatch = p.phone.includes(search);
      const eventTypeMatch = p.event_type?.name.toLowerCase().includes(searchLower);

      return nameMatch || emailMatch || phoneMatch || eventTypeMatch;
    });
  }, [localPromises, search]);

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

  // Agrupar promises por stage (ya ordenadas)
  const promisesByStage = useMemo(() => {
    return pipelineStages.reduce((acc: Record<string, PromiseWithContact[]>, stage: PipelineStage) => {
      acc[stage.id] = sortedPromises.filter(
        (p: PromiseWithContact) => p.promise_pipeline_stage_id === stage.id
      );
      return acc;
    }, {} as Record<string, PromiseWithContact[]>);
  }, [sortedPromises, pipelineStages]);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full">
          <ZenInput
            id="search"
            placeholder="Buscar promesas..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={Search}
            iconClassName="h-4 w-4"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <ZenButton
            variant="ghost"
            onClick={() => setIsConfigModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </ZenButton>
          <ZenButton onClick={() => router.push(`/${studioSlug}/studio/builder/commercial/promises/nueva`)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Promesa
          </ZenButton>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStages.map((stage: PipelineStage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              promises={promisesByStage[stage.id] || []}
              onPromiseClick={handlePromiseClick}
            />
          ))}
        </div>

        <DragOverlay style={{ cursor: 'grabbing' }}>
          {activePromise ? (
            <div className="opacity-90 rotate-2 shadow-2xl">
              <PromiseCard promise={activePromise} />
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
    </div>
  );
}

// Componente para cada columna del Kanban
function KanbanColumn({
  stage,
  promises,
  onPromiseClick,
}: {
  stage: PipelineStage;
  promises: PromiseWithContact[];
  onPromiseClick: (promise: PromiseWithContact) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="min-w-[280px] flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-700 p-4"
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
        className="space-y-3"
        style={{
          minHeight: promises.length === 0 ? '200px' : 'auto',
        }}
      >
        <SortableContext
          items={promises.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {promises.map((promise) => (
            <PromiseCard
              key={promise.id}
              promise={promise}
              onClick={onPromiseClick}
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

