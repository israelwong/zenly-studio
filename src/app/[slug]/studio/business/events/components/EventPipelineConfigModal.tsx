'use client';

import React, { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { ZenDialog, ZenInput, ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';
import {
  updateEventPipelineStage,
  reorderEventPipelineStages,
} from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';

interface EventPipelineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  pipelineStages: EventPipelineStage[];
  onSuccess: () => void;
}

export function EventPipelineConfigModal({
  isOpen,
  onClose,
  studioSlug,
  pipelineStages,
  onSuccess,
}: EventPipelineConfigModalProps) {
  const [stages, setStages] = useState<EventPipelineStage[]>(pipelineStages);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStages([...pipelineStages]);
    }
  }, [isOpen, pipelineStages]);

  const handleNameChange = (id: string, name: string) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Actualizar nombres
      const updatePromises = stages.map((stage) =>
        updateEventPipelineStage(studioSlug, {
          id: stage.id,
          name: stage.name,
        })
      );

      await Promise.all(updatePromises);

      // Reordenar
      const reorderResult = await reorderEventPipelineStages(studioSlug, {
        stage_ids: stages.map((s) => s.id),
      });

      if (reorderResult.success) {
        toast.success('Pipeline configurado exitosamente');
        onSuccess();
        onClose();
      } else {
        toast.error(reorderResult.error || 'Error al configurar pipeline');
      }
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error('Error al configurar pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Pipeline"
      description="Edita los nombres y orden de las etapas del pipeline"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
            >
              <GripVertical className="h-5 w-5 text-zinc-400 cursor-grab" />
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <ZenInput
                value={stage.name}
                onChange={(e) => handleNameChange(stage.id, e.target.value)}
                className="flex-1"
                disabled={stage.is_system}
                placeholder="Nombre de la etapa"
              />
              {stage.is_system && (
                <span className="text-xs text-zinc-400">Sistema</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <ZenButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </ZenButton>
          <ZenButton type="submit" loading={loading}>
            Guardar
          </ZenButton>
        </div>
      </form>
    </ZenDialog>
  );
}

