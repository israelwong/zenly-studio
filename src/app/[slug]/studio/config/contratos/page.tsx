'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { createContractTemplate } from '@/lib/actions/studio/business/contracts';
import { DEFAULT_CONTRACT_TEMPLATE } from '@/lib/constants/contract-template';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenConfirmModal,
} from '@/components/ui/zen';
import { ContractTemplatesTable } from './components';
import {
  getContractTemplates,
  deleteContractTemplate,
  toggleContractTemplate,
  duplicateContractTemplate,
} from '@/lib/actions/studio/business/contracts';
import {
  getContractTemplate,
  updateContractTemplate,
} from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

export default function ContratosPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    document.title = 'ZEN Studio - Contratos';
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [studioSlug]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug);
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        toast.error(result.error || 'Error al cargar plantillas');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (templateId: string) => {
    try {
      const result = await getContractTemplate(studioSlug, templateId);

      if (result.success && result.data) {
        setEditingTemplate(result.data);
        setEditModalOpen(true);
      } else {
        toast.error(result.error || 'Error al cargar plantilla');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar plantilla');
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const result = await duplicateContractTemplate(studioSlug, {
        template_id: templateId,
      });

      if (result.success && result.data) {
        toast.success('Plantilla duplicada correctamente');
        // Agregar el nuevo template al array local
        setTemplates((prev) => [...prev, result.data!]);
      } else {
        toast.error(result.error || 'Error al duplicar plantilla');
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Error al duplicar plantilla');
    }
  };

  const handleToggle = async (templateId: string) => {
    try {
      const result = await toggleContractTemplate(studioSlug, templateId);

      if (result.success && result.data) {
        toast.success('Estado actualizado correctamente');
        // Actualizar el template en el array local
        setTemplates((prev) =>
          prev.map((template) =>
            template.id === templateId ? result.data! : template
          )
        );
      } else {
        toast.error(result.error || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteModalOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (isReordering || !over || active.id === over.id) {
      return;
    }

    const oldIndex = templates.findIndex((template) => template.id === active.id);
    const newIndex = templates.findIndex((template) => template.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newTemplates = arrayMove(templates, oldIndex, newIndex);

    try {
      setIsReordering(true);
      setTemplates(newTemplates);

      // TODO: Implementar acción para persistir el orden en la base de datos
      // const templateIds = newTemplates.map((template) => template.id);
      // const result = await reorderContractTemplates(studioSlug, templateIds);
      // if (!result.success) {
      //   toast.error(result.error || 'Error al reordenar las plantillas');
      //   await loadTemplates();
      // }
    } catch (error) {
      console.error('Error reordenando plantillas:', error);
      toast.error('Error al reordenar las plantillas');
      await loadTemplates();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteContractTemplate(studioSlug, templateToDelete);

      if (result.success) {
        toast.success('Plantilla eliminada correctamente');
        // Remover el template del array local
        setTemplates((prev) => prev.filter((template) => template.id !== templateToDelete));
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
      } else {
        toast.error(result.error || 'Error al eliminar plantilla');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar plantilla');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600/20 rounded-lg">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <ZenCardTitle>Plantillas de Contratos</ZenCardTitle>
                  <ZenCardDescription>
                    Gestiona las plantillas maestras de contratos
                  </ZenCardDescription>
                </div>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="relative rounded-lg border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="w-8 py-3 px-4"></th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase w-[200px] min-w-[200px]">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Descripción
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Estado
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Versión
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="py-4 px-4">
                          <div className="h-5 w-5 rounded bg-zinc-700 animate-pulse" />
                        </td>
                        <td className="py-4 px-4 w-[200px] min-w-[200px]">
                          <div className="h-5 w-32 rounded bg-zinc-700 animate-pulse" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-48 rounded bg-zinc-700 animate-pulse" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-6 w-16 rounded bg-zinc-700 animate-pulse" />
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-4 w-8 rounded bg-zinc-700 animate-pulse mx-auto" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end">
                            <div className="h-8 w-8 rounded bg-zinc-700 animate-pulse" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <FileText className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <ZenCardTitle>Plantillas de Contratos</ZenCardTitle>
                <ZenCardDescription>
                  Gestiona las plantillas maestras de contratos para tus eventos
                </ZenCardDescription>
              </div>
            </div>
            <ZenButton
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">
                No hay plantillas de contratos
              </h3>
              <p className="text-zinc-600 mb-6">
                Crea tu primera plantilla para comenzar a generar contratos
              </p>
              <ZenButton
                variant="secondary"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Plantilla
              </ZenButton>
            </div>
          ) : (
            <ContractTemplatesTable
              templates={templates}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onToggle={handleToggle}
              onDelete={handleDeleteClick}
              onDragEnd={handleDragEnd}
              isReordering={isReordering}
            />
          )}
        </ZenCardContent>
      </ZenCard>

      <ZenConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setTemplateToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Plantilla"
        description="¿Estás seguro de eliminar esta plantilla? Esta acción desactivará la plantilla pero los contratos generados con ella no se verán afectados."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />

      <ContractEditorModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="create-template"
        studioSlug={studioSlug}
        initialContent={DEFAULT_CONTRACT_TEMPLATE}
        onSave={async (data) => {
          setIsCreating(true);
          try {
            const result = await createContractTemplate(studioSlug, {
              name: data.name || '',
              description: data.description || '',
              content: data.content,
              is_default: data.is_default || false,
            });

            if (result.success && result.data) {
              toast.success('Plantilla creada correctamente');
              // Agregar el nuevo template al array local
              setTemplates((prev) => [...prev, result.data!]);
              setCreateModalOpen(false);
            } else {
              toast.error(result.error || 'Error al crear plantilla');
            }
          } catch (error) {
            console.error('Error creating template:', error);
            toast.error('Error al crear plantilla');
          } finally {
            setIsCreating(false);
          }
        }}
        isLoading={isCreating}
      />

      {editingTemplate && (
        <ContractEditorModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTemplate(null);
          }}
          mode="edit-template"
          studioSlug={studioSlug}
          initialContent={editingTemplate.content}
          initialName={editingTemplate.name}
          initialDescription={editingTemplate.description || ''}
          initialIsDefault={editingTemplate.is_default}
          onSave={async (data) => {
            setIsUpdating(true);
            try {
              const result = await updateContractTemplate(
                studioSlug,
                editingTemplate.id,
                {
                  name: data.name || '',
                  description: data.description || '',
                  content: data.content,
                  is_default: data.is_default || false,
                }
              );

              if (result.success && result.data) {
                toast.success('Plantilla actualizada correctamente');
                // Actualizar el template en el array local
                setTemplates((prev) =>
                  prev.map((template) =>
                    template.id === editingTemplate.id ? result.data! : template
                  )
                );
                setEditModalOpen(false);
                setEditingTemplate(null);
              } else {
                toast.error(result.error || 'Error al actualizar plantilla');
              }
            } catch (error) {
              console.error('Error updating template:', error);
              toast.error('Error al actualizar plantilla');
            } finally {
              setIsUpdating(false);
            }
          }}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
}
