'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { ZenInput, ZenButton, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { toast } from 'sonner';
import {
  obtenerCrewSkills,
  crearCrewSkill,
  actualizarCrewSkill,
  eliminarCrewSkill,
} from '@/lib/actions/studio/crew';

interface CrewSkill {
  id: string;
  name: string;
  color: string | null;
  icono: string | null;
}

interface CrewSkillsManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

export function CrewSkillsManageModal({
  isOpen,
  onClose,
  studioSlug,
}: CrewSkillsManageModalProps) {
  const [skills, setSkills] = useState<(CrewSkill & { isPending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newSkillColor, setNewSkillColor] = useState('#3B82F6');
  const [isCreatingSkills, setIsCreatingSkills] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<CrewSkill | null>(null);
  const [isDeletingSkill, setIsDeletingSkill] = useState(false);

  const loadSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await obtenerCrewSkills(studioSlug);
      if (result.success && result.data) {
        setSkills(result.data);
      }
    } catch (error) {
      console.error('Error cargando habilidades:', error);
      toast.error('Error al cargar habilidades');
    } finally {
      setIsLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      loadSkills();
    }
  }, [isOpen, loadSkills]);

  const handleCreateSkills = useCallback(async () => {
    if (!newSkillInput.trim() || isCreatingSkills) return;

    const skillNames = newSkillInput
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);

    if (skillNames.length === 0) {
      toast.error('Ingresa al menos una habilidad');
      return;
    }

    const existingNames = new Set(skills.map((s) => s.name.toLowerCase()));
    const newNames = skillNames.filter((name) => !existingNames.has(name.toLowerCase()));

    if (newNames.length === 0) {
      toast.info('Todas las habilidades ya existen');
      setNewSkillInput('');
      return;
    }

    setIsCreatingSkills(true);
    setNewSkillInput('');

    // Agregar temporales inmediatamente
    const tempSkills = newNames.map((name, index) => ({
      id: `temp-${Date.now()}-${index}`,
      name,
      color: newSkillColor,
      icono: null,
      isPending: true,
    }));

    setSkills((prev) => [...prev, ...tempSkills]);

    try {
      const results = await Promise.all(
        newNames.map((skillName) =>
          crearCrewSkill(studioSlug, {
            name: skillName,
            color: newSkillColor,
          })
        )
      );

      const successfulSkills: CrewSkill[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.success && result.data) {
          successfulSkills.push(result.data);
        } else {
          errors.push(newNames[index]);
        }
      });

      // Reemplazar temporales con reales
      setSkills((prev) => {
        const withoutTemp = prev.filter((s) => !s.isPending);
        const existingIds = new Set(withoutTemp.map((s) => s.id));
        const newRealSkills = successfulSkills.filter((s) => !existingIds.has(s.id));
        return [...withoutTemp, ...newRealSkills];
      });

      if (errors.length > 0) {
        toast.error(`${errors.length} habilidad(es) no se pudieron crear`);
      } else if (successfulSkills.length > 0) {
        toast.success(`${successfulSkills.length} habilidad(es) creada(s)`);
      }
    } catch (error) {
      console.error('Error creando habilidades:', error);
      toast.error('Error al crear habilidades');
      loadSkills();
    } finally {
      setIsCreatingSkills(false);
    }
  }, [studioSlug, skills, newSkillColor, isCreatingSkills]);

  const handleDeleteSkill = useCallback(async () => {
    if (!skillToDelete || isDeletingSkill) return;

    setIsDeletingSkill(true);
    try {
      const result = await eliminarCrewSkill(studioSlug, skillToDelete.id);
      if (result.success) {
        setSkills((prev) => prev.filter((s) => s.id !== skillToDelete.id));
        toast.success('Habilidad eliminada');
      } else {
        toast.error(result.error || 'Error al eliminar habilidad');
      }
    } catch (error) {
      console.error('Error eliminando habilidad:', error);
      toast.error('Error al eliminar habilidad');
    } finally {
      setIsDeletingSkill(false);
      setSkillToDelete(null);
    }
  }, [studioSlug, skillToDelete, isDeletingSkill]);

  return (
    <>
      <ZenDialog isOpen={isOpen} onClose={onClose} title="Gestionar Habilidades">
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {/* Crear nuevas habilidades */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-200">
              Crear Habilidades
            </label>
            <p className="text-xs text-zinc-400">
              Separa múltiples habilidades con comas. Ej: Fotografía, Edición, Retoque
            </p>
            <div className="flex gap-2">
              <ZenInput
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                placeholder="Ingresa nuevas habilidades..."
                disabled={isCreatingSkills}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateSkills();
                  }
                }}
              />
              <select
                value={newSkillColor}
                onChange={(e) => setNewSkillColor(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600 h-10"
              >
                {PRESET_COLORS.map((color) => (
                  <option key={color} value={color}>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </option>
                ))}
              </select>
            </div>
            <ZenButton
              onClick={handleCreateSkills}
              loading={isCreatingSkills}
              disabled={isCreatingSkills || !newSkillInput.trim()}
              className="w-full"
            >
              Crear
            </ZenButton>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-700" />

          {/* Lista de habilidades */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-200">
              Habilidades Existentes ({skills.length})
            </label>
            {isLoading ? (
              <p className="text-sm text-zinc-400">Cargando...</p>
            ) : skills.length === 0 ? (
              <p className="text-sm text-zinc-400">No hay habilidades aún</p>
            ) : (
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg group"
                    style={{
                      opacity: skill.isPending ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: skill.color || '#6366F1' }}
                      />
                      <span className="text-sm text-zinc-200 truncate">
                        {skill.name}
                      </span>
                      {skill.isPending && (
                        <span className="text-xs text-zinc-400">Guardando...</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSkillToDelete(skill)}
                      disabled={skill.isPending}
                      className="ml-2 p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ZenDialog>

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={!!skillToDelete}
        onClose={() => setSkillToDelete(null)}
        onConfirm={handleDeleteSkill}
        title="Eliminar Habilidad"
        description={`¿Estás seguro de que deseas eliminar "${skillToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={isDeletingSkill}
        variant="destructive"
      />
    </>
  );
}

