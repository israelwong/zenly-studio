'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Plus, Loader2 } from 'lucide-react';
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

  const handleEdit = (templateId: string) => {
    router.push(`/${studioSlug}/studio/contratos/${templateId}/editar`);
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const result = await duplicateContractTemplate(studioSlug, {
        template_id: templateId,
      });

      if (result.success) {
        toast.success('Plantilla duplicada correctamente');
        loadTemplates();
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

      if (result.success) {
        toast.success('Estado actualizado correctamente');
        loadTemplates();
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
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
        loadTemplates();
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
              variant="default"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/contratos/nuevo`)}
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
                variant="default"
                onClick={() => router.push(`/${studioSlug}/studio/contratos/nuevo`)}
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
    </div>
  );
}
