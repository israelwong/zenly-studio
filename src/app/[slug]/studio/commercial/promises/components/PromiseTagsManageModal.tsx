'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { ZenInput, ZenButton, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { toast } from 'sonner';
import {
  getPromiseTags,
  createPromiseTag,
  updatePromiseTag,
  deletePromiseTag,
} from '@/lib/actions/studio/commercial/promises';
import type { PromiseTag, UpdatePromiseTagData } from '@/lib/actions/studio/commercial/promises/promise-tags.actions';

interface PromiseTagsManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onTagsUpdated?: () => void;
  onTagUpdated?: (tag: PromiseTag) => void;
  onTagDeleted?: (tagId: string) => void;
}

export function PromiseTagsManageModal({
  isOpen,
  onClose,
  studioSlug,
  onTagsUpdated,
  onTagUpdated,
  onTagDeleted,
}: PromiseTagsManageModalProps) {
  const [tags, setTags] = useState<(PromiseTag & { isPending?: boolean; tempId?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<PromiseTag | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isCreatingTags, setIsCreatingTags] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string; usageCount: number } | null>(null);
  const [isDeletingTag, setIsDeletingTag] = useState(false);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPromiseTags(studioSlug);
      if (result.success && result.data) {
        setTags(result.data);
      }
    } catch (error) {
      console.error('Error cargando tags:', error);
      toast.error('Error al cargar etiquetas');
    } finally {
      setIsLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen, loadTags]);

  // Procesar input: separar por coma
  const processInput = useCallback((value: string): string[] => {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }, []);

  const handleCreateTags = useCallback(async () => {
    if (!newTagInput.trim() || isCreatingTags) return;

    const tagNames = processInput(newTagInput);
    if (tagNames.length === 0) {
      toast.error('Ingresa al menos una etiqueta');
      return;
    }

    // Verificar duplicados
    const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
    const newTagNames = tagNames.filter((name) => !existingNames.has(name.toLowerCase()));

    if (newTagNames.length === 0) {
      toast.info('Todas las etiquetas ya existen');
      setNewTagInput('');
      return;
    }

    setIsCreatingTags(true);
    const inputToClear = newTagInput;
    setNewTagInput('');

    // Crear tags temporales inmediatamente (actualización optimista)
    const tempTags = newTagNames.map((name, index) => ({
      id: `temp-${Date.now()}-${index}`,
      tempId: `temp-${Date.now()}-${index}`,
      studio_id: '',
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      color: newTagColor,
      description: null,
      order: 0,
      is_active: true,
      isPending: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    // Agregar tags temporales inmediatamente
    setTags((prev) => [...prev, ...tempTags]);

    try {
      const results = await Promise.all(
        newTagNames.map((tagName) =>
          createPromiseTag(studioSlug, {
            name: tagName,
            color: newTagColor,
            order: 0,
          })
        )
      );

      const successfulTags: PromiseTag[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.success && result.data) {
          successfulTags.push(result.data);
        } else {
          console.error(`Error creando tag "${newTagNames[index]}":`, result.error);
          errors.push(newTagNames[index]);
        }
      });

      // Reemplazar tags temporales con los reales
      setTags((prev) => {
        // Remover todos los tags temporales
        const withoutTemp = prev.filter((t) => !t.isPending);

        // Agregar tags reales exitosos
        const existingIds = new Set(withoutTemp.map((t) => t.id));
        const newRealTags = successfulTags.filter((t) => !existingIds.has(t.id));

        return [...withoutTemp, ...newRealTags];
      });

      if (errors.length > 0) {
        toast.error(`${errors.length} etiqueta(s) no se pudieron crear`);
      } else if (successfulTags.length > 0) {
        toast.success(`${successfulTags.length} etiqueta(s) creada(s)`);
        onTagsUpdated?.();
      }
    } catch (error) {
      console.error('Error creando tags:', error);
      // Remover todos los tags temporales en caso de error
      setTags((prev) => prev.filter((t) => !t.isPending));
      toast.error('Error al crear etiquetas');
      setNewTagInput(inputToClear);
    } finally {
      setIsCreatingTags(false);
    }
  }, [newTagInput, newTagColor, tags, processInput, studioSlug, onTagsUpdated, isCreatingTags]);

  // Manejar Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (newTagInput.trim()) {
          handleCreateTags();
        }
      }
    },
    [newTagInput, handleCreateTags]
  );

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    const tagToUpdate = { ...editingTag };
    setEditingTag(null);

    // Actualización optimista local
    setTags((prev) =>
      prev.map((tag) =>
        tag.id === tagToUpdate.id ? { ...tag, name: tagToUpdate.name, color: tagToUpdate.color } : tag
      )
    );

    try {
      const data: UpdatePromiseTagData = {
        id: tagToUpdate.id,
        name: tagToUpdate.name,
        color: tagToUpdate.color,
      };

      const result = await updatePromiseTag(studioSlug, data);
      if (result.success && result.data) {
        toast.success('Etiqueta actualizada');
        // Actualizar con datos del servidor
        setTags((prev) =>
          prev.map((tag) => (tag.id === result.data!.id ? result.data! : tag))
        );
        // Notificar al componente principal
        if (onTagUpdated) {
          onTagUpdated(result.data);
        }
        onTagsUpdated?.();
      } else {
        // Rollback en caso de error
        setTags((prev) =>
          prev.map((tag) => (tag.id === tagToUpdate.id ? tagToUpdate : tag))
        );
        toast.error(result.error || 'Error al actualizar etiqueta');
      }
    } catch (error) {
      console.error('Error actualizando tag:', error);
      // Rollback
      setTags((prev) =>
        prev.map((tag) => (tag.id === tagToUpdate.id ? tagToUpdate : tag))
      );
      toast.error('Error al actualizar etiqueta');
    }
  };

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    const usageCount = tag.usage_count || 0;

    // Si no hay uso, eliminar directamente sin confirmación
    if (usageCount === 0) {
      performDeleteTag(tagId, tag);
      return;
    }

    // Si hay uso, mostrar confirmación
    setTagToDelete({
      id: tagId,
      name: tag.name,
      usageCount,
    });
  };

  const performDeleteTag = async (tagId: string, tagToDelete: PromiseTag & { isPending?: boolean; tempId?: string }) => {
    setIsDeletingTag(true);

    // Actualización optimista local
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));

    try {
      const result = await deletePromiseTag(studioSlug, tagId);
      if (result.success) {
        toast.success('Etiqueta eliminada');
        // Notificar al componente principal
        if (onTagDeleted) {
          onTagDeleted(tagId);
        }
        onTagsUpdated?.();
        setTagToDelete(null);
      } else {
        // Rollback en caso de error
        setTags((prev) => [...prev, tagToDelete].sort((a, b) => a.name.localeCompare(b.name)));
        toast.error(result.error || 'Error al eliminar etiqueta');
        setTagToDelete(null);
      }
    } catch (error) {
      console.error('Error eliminando tag:', error);
      // Rollback
      setTags((prev) => [...prev, tagToDelete].sort((a, b) => a.name.localeCompare(b.name)));
      toast.error('Error al eliminar etiqueta');
      setTagToDelete(null);
    } finally {
      setIsDeletingTag(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!tagToDelete || isDeletingTag) return;
    const tag = tags.find((t) => t.id === tagToDelete.id);
    if (!tag) return;
    performDeleteTag(tagToDelete.id, tag);
  };

  const handleCloseDeleteModal = () => {
    if (!isDeletingTag) {
      setTagToDelete(null);
    }
  };

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ];

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Gestionar Etiquetas"
      description="Crea, edita y elimina etiquetas globales reutilizables"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Crear nuevas etiquetas */}
        <div className="space-y-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300">Crear etiquetas</h3>
          <div className="flex gap-2">
            <ZenInput
              placeholder="Agregar etiquetas separadas por coma (Enter para agregar)"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreatingTags}
              className="flex-1"
            />
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${newTagColor === color ? 'border-white scale-110' : 'border-zinc-600'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lista de etiquetas */}
        {isLoading ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...Array(4)].map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 animate-pulse"
              >
                <div className="w-4 h-4 rounded-full bg-zinc-700 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-4 bg-zinc-700 rounded w-24" />
                  <div className="h-5 bg-zinc-700 rounded-full w-16" />
                </div>
                <div className="h-8 w-16 bg-zinc-700 rounded" />
                <div className="h-8 w-16 bg-zinc-700 rounded" />
              </div>
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No hay etiquetas creadas
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tags
              .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
              .map((tag) => {
                const isPending = tag.isPending || tag.id.startsWith('temp-');
                return (
                  <div
                    key={tag.tempId || tag.id}
                    className={`flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 transition-opacity ${isPending ? 'opacity-70' : ''
                      }`}
                  >
                    {isPending && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent flex-shrink-0" />
                    )}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {editingTag?.id === tag.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <ZenInput
                          value={editingTag.name}
                          onChange={(e) =>
                            setEditingTag({ ...editingTag, name: e.target.value })
                          }
                          className="flex-1"
                        />
                        <div className="flex gap-1">
                          {colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingTag({ ...editingTag, color })}
                              className={`w-6 h-6 rounded-full border transition-all ${editingTag.color === color ? 'border-white scale-110' : 'border-zinc-600'
                                }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <ZenButton
                          size="sm"
                          onClick={handleUpdateTag}
                        >
                          Guardar
                        </ZenButton>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTag(null)}
                        >
                          Cancelar
                        </ZenButton>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm text-zinc-300">{tag.name}</span>
                          {tag.usage_count !== undefined && tag.usage_count > 0 && (
                            <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">
                              {tag.usage_count} {tag.usage_count === 1 ? 'promesa' : 'promesas'}
                            </span>
                          )}
                        </div>
                        {!isPending && (
                          <>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTag(tag)}
                              disabled={isCreatingTags}
                            >
                              Editar
                            </ZenButton>
                            <ZenButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTag(tag.id)}
                              className="text-red-400 hover:text-red-300"
                              disabled={isCreatingTags}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ZenButton>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={!!tagToDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar etiqueta"
        description={
          tagToDelete
            ? `¿Estás seguro de eliminar la etiqueta "${tagToDelete.name}"? Se eliminará de ${tagToDelete.usageCount} ${tagToDelete.usageCount === 1 ? 'promesa' : 'promesas'}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeletingTag}
        disabled={isDeletingTag}
      />
    </ZenDialog>
  );
}

