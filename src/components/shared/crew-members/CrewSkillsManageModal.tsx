'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
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


export function CrewSkillsManageModal({
    isOpen,
    onClose,
    studioSlug,
}: CrewSkillsManageModalProps) {
    const [skills, setSkills] = useState<(CrewSkill & { isPending?: boolean })[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newSkillInput, setNewSkillInput] = useState('');
    const [isCreatingSkills, setIsCreatingSkills] = useState(false);
    const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
    const [editingSkillName, setEditingSkillName] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
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
            color: '#6366F1',
            icono: null,
            isPending: true,
        }));

        setSkills((prev) => [...prev, ...tempSkills]);

        try {
            const results = await Promise.all(
                newNames.map((skillName) =>
                    crearCrewSkill(studioSlug, {
                        name: skillName,
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
    }, [studioSlug, skills, isCreatingSkills, newSkillInput, loadSkills]);

    const handleStartEdit = (skill: CrewSkill) => {
        setEditingSkillId(skill.id);
        setEditingSkillName(skill.name);
    };

    const handleSaveEdit = useCallback(async () => {
        if (!editingSkillId || !editingSkillName.trim() || isSavingEdit) return;

        const existingNames = new Set(
            skills
                .filter((s) => s.id !== editingSkillId)
                .map((s) => s.name.toLowerCase())
        );

        if (existingNames.has(editingSkillName.toLowerCase())) {
            toast.error('Ya existe una habilidad con ese nombre');
            return;
        }

        setIsSavingEdit(true);
        try {
            const result = await actualizarCrewSkill(studioSlug, editingSkillId, {
                name: editingSkillName.trim(),
            });

            if (result.success && result.data) {
                setSkills((prev) =>
                    prev.map((s) => (s.id === editingSkillId ? result.data : s))
                );
                setEditingSkillId(null);
                setEditingSkillName('');
                toast.success('Habilidad actualizada');
            } else {
                toast.error(result.error || 'Error al actualizar habilidad');
            }
        } catch (error) {
            console.error('Error actualizando habilidad:', error);
            toast.error('Error al actualizar habilidad');
        } finally {
            setIsSavingEdit(false);
        }
    }, [studioSlug, editingSkillId, editingSkillName, skills, isSavingEdit]);

    const handleCancelEdit = () => {
        setEditingSkillId(null);
        setEditingSkillName('');
    };

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
        <div className="space-y-4 max-h-96 overflow-y-auto w-96">
                    {/* Crear nuevas habilidades */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-400 uppercase">
                            Crear Habilidades
                        </label>
                        <div className="flex gap-2">
                            <ZenInput
                                value={newSkillInput}
                                onChange={(e) => setNewSkillInput(e.target.value)}
                                placeholder="Ej: Fotografía, Edición, Retoque"
                                disabled={isCreatingSkills}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateSkills();
                                    }
                                }}
                            />
                            <ZenButton
                                onClick={handleCreateSkills}
                                loading={isCreatingSkills}
                                disabled={isCreatingSkills || !newSkillInput.trim()}
                                size="sm"
                            >
                                Crear
                            </ZenButton>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Separa múltiples habilidades con comas
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-zinc-700" />

                    {/* Lista de habilidades */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-400 uppercase">
                            Habilidades ({skills.filter((s) => !s.isPending).length})
                        </label>
                        {isLoading ? (
                            <p className="text-sm text-zinc-400">Cargando...</p>
                        ) : skills.filter((s) => !s.isPending).length === 0 ? (
                            <p className="text-sm text-zinc-400">No hay habilidades aún</p>
                        ) : (
                            <div className="space-y-1">
                                {skills.map((skill) => {
                                    if (skill.isPending) return null;

                                    const isEditing = editingSkillId === skill.id;

                                    return (
                                        <div
                                            key={skill.id}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 group transition-colors"
                                        >
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: skill.color || '#6366F1' }}
                                            />

                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editingSkillName}
                                                        onChange={(e) => setEditingSkillName(e.target.value)}
                                                        className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleSaveEdit();
                                                            } else if (e.key === 'Escape') {
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveEdit}
                                                        disabled={isSavingEdit}
                                                        className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelEdit}
                                                        className="p-1 text-zinc-500 hover:text-zinc-400 rounded transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-sm text-zinc-200">{skill.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEdit(skill)}
                                                        className="p-1 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 rounded transition-colors"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSkillToDelete(skill)}
                                                        className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 rounded transition-colors"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
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
                description={`¿Eliminar "${skillToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                loading={isDeletingSkill}
                variant="destructive"
            />
        </>
    );
}
