'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { ZenInput, ZenButton, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
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
    const [editingSkillColor, setEditingSkillColor] = useState<string>('#6366F1');
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
        setEditingSkillColor(skill.color || '#6366F1');
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
                color: editingSkillColor || null,
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
    }, [studioSlug, editingSkillId, editingSkillName, editingSkillColor, skills, isSavingEdit]);

    const handleCancelEdit = () => {
        setEditingSkillId(null);
        setEditingSkillName('');
        setEditingSkillColor('#6366F1');
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
            <ZenDialog
                isOpen={isOpen}
                onClose={onClose}
                title="Gestionar Habilidades"
                description="Crea y administra las habilidades y roles de tu equipo"
                maxWidth="lg"
                showCloseButton={true}
                closeOnClickOutside={false}
                zIndex={10052}
            >
                <div className="space-y-6">
                    {/* Crear nuevas habilidades */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-zinc-200 mb-2">
                                Crear Habilidades
                            </label>
                            <div className="space-y-2">
                                <ZenInput
                                    value={newSkillInput}
                                    onChange={(e) => setNewSkillInput(e.target.value)}
                                    placeholder="Ej: Fotografía, Edición, Retoque"
                                    disabled={isCreatingSkills}
                                    className="w-full"
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
                                    size="md"
                                    className="w-full"
                                >
                                    Crear Habilidad(es)
                                </ZenButton>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                                Separa múltiples habilidades con comas
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-zinc-700" />

                    {/* Lista de habilidades */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-zinc-200">
                                Habilidades Existentes
                            </label>
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                                {skills.filter((s) => !s.isPending).length}
                            </span>
                        </div>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800/30"
                                    >
                                        <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" />
                                        <Skeleton className="h-4 flex-1 max-w-[200px]" />
                                        <div className="flex items-center gap-1 ml-auto">
                                            <Skeleton className="h-8 w-8 rounded" />
                                            <Skeleton className="h-8 w-8 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : skills.filter((s) => !s.isPending).length === 0 ? (
                            <div className="py-8 text-center border border-zinc-700 rounded-lg bg-zinc-800/30">
                                <p className="text-sm text-zinc-400">No hay habilidades aún</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Crea tu primera habilidad arriba
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {skills.map((skill) => {
                                    const isEditing = editingSkillId === skill.id;
                                    const isPending = skill.isPending;

                                    if (isPending) {
                                        return (
                                            <div
                                                key={skill.id}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800/20 opacity-60"
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm animate-pulse"
                                                    style={{ backgroundColor: skill.color || '#6366F1' }}
                                                />
                                                <span className="flex-1 text-sm font-medium text-zinc-400">
                                                    {skill.name}
                                                </span>
                                                <span className="text-xs text-zinc-500 italic">
                                                    Creando...
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={skill.id}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-zinc-600 group transition-all"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(skill)}
                                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm hover:scale-110 transition-transform cursor-pointer"
                                                style={{ backgroundColor: skill.color || '#6366F1' }}
                                                title="Click para editar color y nombre"
                                            />

                                            {isEditing ? (
                                                <>
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm ring-2 ring-emerald-400/50"
                                                        style={{ backgroundColor: editingSkillColor }}
                                                    />
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="color"
                                                            value={editingSkillColor}
                                                            onChange={(e) => setEditingSkillColor(e.target.value)}
                                                            className="w-8 h-8 rounded border border-zinc-600 bg-zinc-800 cursor-pointer flex-shrink-0"
                                                            title="Cambiar color"
                                                        />
                                                        <ZenInput
                                                            value={editingSkillName}
                                                            onChange={(e) => setEditingSkillName(e.target.value)}
                                                            className="flex-1"
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
                                                    </div>
                                                    <ZenButton
                                                        type="button"
                                                        onClick={handleSaveEdit}
                                                        disabled={isSavingEdit}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </ZenButton>
                                                    <ZenButton
                                                        type="button"
                                                        onClick={handleCancelEdit}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-zinc-500 hover:text-zinc-400"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </ZenButton>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-sm font-medium text-zinc-200">
                                                        {skill.name}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <ZenButton
                                                            type="button"
                                                            onClick={() => handleStartEdit(skill)}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-300"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </ZenButton>
                                                        <ZenButton
                                                            type="button"
                                                            onClick={() => setSkillToDelete(skill)}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </ZenButton>
                                                    </div>
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
