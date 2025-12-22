'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { createContractTemplate } from '@/lib/actions/studio/business/contracts';
import { DEFAULT_CONTRACT_TEMPLATE } from '@/lib/constants/contract-template';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenConfirmModal,
  ContractTemplateCard,
} from '@/components/ui/zen';
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <ContractTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEdit(template.id)}
                  onDuplicate={() => handleDuplicate(template.id)}
                  onToggle={() => handleToggle(template.id)}
                  onDelete={() => handleDeleteClick(template.id)}
                />
              ))}
            </div>
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
