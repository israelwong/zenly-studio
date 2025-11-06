'use client';

import { useState } from 'react';
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
import { moveProspect } from '@/lib/actions/studio/builder/commercial/prospects';
import { toast } from 'sonner';
import type { Prospect, PipelineStage } from '@/lib/actions/schemas/prospects-schemas';

interface PromisesKanbanProps {
  studioSlug: string;
  prospects: Prospect[];
  pipelineStages: PipelineStage[];
  search: string;
  onSearchChange: (search: string) => void;
  onProspectCreated: () => void;
  onProspectUpdated: () => void;
  onProspectMoved: () => void;
  onPipelineStagesUpdated: () => void;
}

export function PromisesKanban({
  studioSlug,
  prospects,
  pipelineStages,
  search,
  onSearchChange,
  onProspectCreated,
  onProspectUpdated,
  onProspectMoved,
  onPipelineStagesUpdated,
}: PromisesKanbanProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Agrupar prospects por stage
  const prospectsByStage = pipelineStages.reduce((acc: Record<string, Prospect[]>, stage: PipelineStage) => {
    acc[stage.id] = prospects.filter(
      (p: Prospect) => p.prospect_pipeline_stage_id === stage.id
    );
    return acc;
  }, {} as Record<string, Prospect[]>);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const prospectId = active.id as string;
    const newStageId = over.id as string;

    // Verificar que es un stage válido
    const stage = pipelineStages.find((s: PipelineStage) => s.id === newStageId);
    if (!stage) return;

    try {
      const result = await moveProspect(studioSlug, {
        prospect_id: prospectId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Promesa movida exitosamente');
        onProspectMoved();
      } else {
        toast.error(result.error || 'Error al mover promesa');
      }
    } catch (error) {
      console.error('Error moviendo promesa:', error);
      toast.error('Error al mover promesa');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleProspectClick = (prospectId: string) => {
    router.push(`/${studioSlug}/studio/builder/commercial/promises/${prospectId}`);
  };

  const activeProspect = activeId
    ? prospects.find((p: Prospect) => p.id === activeId)
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
              prospects={prospectsByStage[stage.id] || []}
              onProspectClick={handleProspectClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProspect ? (
            <div className="opacity-50">
              <PromiseCard prospect={activeProspect} />
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
  prospects,
  onProspectClick,
}: {
  stage: PipelineStage;
  prospects: Prospect[];
  onProspectClick: (id: string) => void;
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
          {prospects.length}
        </span>
      </div>

      {/* Lista de prospects */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
        <SortableContext
          items={prospects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {prospects.map((prospect) => (
            <PromiseCard
              key={prospect.id}
              prospect={prospect}
              onClick={() => onProspectClick(prospect.id)}
            />
          ))}
        </SortableContext>

        {prospects.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Sin promesas
          </div>
        )}
      </div>
    </div>
  );
}

