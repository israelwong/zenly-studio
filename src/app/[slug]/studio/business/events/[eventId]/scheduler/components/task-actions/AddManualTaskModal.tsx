'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenInput } from '@/components/ui/zen';
import { crearTareaManualScheduler } from '@/lib/actions/studio/business/events/scheduler-actions';
import { toast } from 'sonner';
import { STAGE_LABELS, type TaskCategoryStage } from '../../utils/scheduler-section-stages';

export interface AddManualTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  studioSlug: string;
  eventId: string;
  sectionId: string;
  stage: TaskCategoryStage | string;
}

export function AddManualTaskModal({
  isOpen,
  onClose,
  onSuccess,
  studioSlug,
  eventId,
  sectionId,
  stage,
}: AddManualTaskModalProps) {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDurationDays(1);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Escribe el nombre de la tarea');
      return;
    }
    setIsLoading(true);
    try {
      const result = await crearTareaManualScheduler(studioSlug, eventId, {
        sectionId,
        stage,
        name: trimmed,
        durationDays,
      });
      if (result.success) {
        toast.success('Tarea creada');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error ?? 'Error al crear la tarea');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stageLabel = typeof stage === 'string' && stage in STAGE_LABELS ? STAGE_LABELS[stage as TaskCategoryStage] : stage;

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      onCancel={onClose}
      title="Añadir tarea manual"
      description={`Etapa: ${stageLabel}`}
      saveLabel="Crear tarea"
      isLoading={isLoading}
      saveDisabled={!name.trim()}
      maxWidth="md"
    >
      <div className="space-y-4">
        <ZenInput
          label="Nombre de la tarea"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Revisión de iluminación"
          autoFocus
        />
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Duración (días)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={durationDays}
            onChange={(e) => setDurationDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>
    </ZenDialog>
  );
}
