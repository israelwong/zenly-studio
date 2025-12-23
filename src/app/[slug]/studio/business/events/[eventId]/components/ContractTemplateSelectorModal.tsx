'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2, Settings } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton } from '@/components/ui/zen';
import { ContractTemplateCreateModal } from '@/components/shared/contracts/ContractTemplateCreateModal';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { ContractPreviewModal } from '@/components/shared/contracts/ContractPreviewModal';
import { ContractTemplateList } from '@/components/shared/contracts/ContractTemplateList';
import { getContractTemplates, getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractTemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  studioSlug: string;
  eventId: string;
  eventTypeId?: string;
  isLoading?: boolean;
}

export function ContractTemplateSelectorModal({
  isOpen,
  onClose,
  onSelect,
  studioSlug,
  eventId,
  eventTypeId,
  isLoading = false,
}: ContractTemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studioSlug, eventTypeId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug, {
        isActive: true,
        ...(eventTypeId && { eventTypeId }),
      });

      console.log('[ContractTemplateSelectorModal] Cargando plantillas:', {
        studioSlug,
        eventTypeId,
        filters: { isActive: true, eventTypeId },
        result: result.success ? { count: result.data?.length, templates: result.data } : { error: result.error },
      });

      if (result.success && result.data) {
        setTemplates(result.data);
        if (result.data.length === 0) {
          console.warn('[ContractTemplateSelectorModal] No se encontraron plantillas activas para el studio:', studioSlug);
        }
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

  const handleSelect = async () => {
    if (selectedTemplateId) {
      // Cargar plantilla para preview
      try {
        const result = await getContractTemplate(studioSlug, selectedTemplateId);
        if (result.success && result.data) {
          setPreviewTemplate(result.data);
          setShowPreviewModal(true);
        } else {
          toast.error(result.error || 'Error al cargar plantilla');
        }
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Error al cargar plantilla');
      }
    }
  };


  const handleClose = () => {
    setSelectedTemplateId(null);
    onClose();
  };

  const handleOpenCreate = () => {
    setShowCreateModal(true);
  };

  const handleCreateSelect = (templateId: string) => {
    setShowCreateModal(false);
    onSelect(templateId);
  };

  // Si no hay plantillas, mostrar opción para crear
  if (!loading && templates.length === 0) {
    return (
      <>
        <ZenDialog
          isOpen={isOpen}
          onClose={handleClose}
          title="Seleccionar Plantilla de Contrato"
          description="No hay plantillas disponibles. Crea tu primera plantilla para comenzar."
          maxWidth="2xl"
          onCancel={handleClose}
          cancelLabel="Cancelar"
          closeOnClickOutside={false}
        >
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">No hay plantillas disponibles</p>
            <p className="text-sm text-zinc-500 mb-6">
              Crea tu primera plantilla para generar contratos
            </p>
            <ZenButton
              variant="default"
              onClick={handleOpenCreate}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Crear Primera Plantilla
            </ZenButton>
          </div>
        </ZenDialog>

        <ContractTemplateCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSelect={handleCreateSelect}
          studioSlug={studioSlug}
          eventTypeId={eventTypeId}
        />
      </>
    );
  }

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Seleccionar Plantilla de Contrato"
        description="Elige una plantilla para generar el contrato del evento"
        maxWidth="2xl"
        onSave={handleSelect}
        onCancel={handleClose}
        saveLabel="Seleccionar plantilla"
        cancelLabel="Cancelar"
        isLoading={isLoading}
        saveVariant="primary"
        closeOnClickOutside={false}
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-4 rounded bg-zinc-700" />
                      <div className="h-5 w-32 rounded bg-zinc-700" />
                      <div className="h-5 w-20 rounded bg-zinc-700" />
                    </div>
                    <div className="h-4 w-48 rounded bg-zinc-700 mt-2" />
                  </div>
                  <div className="h-8 w-8 rounded bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <ContractTemplateList
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-4">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setShowManagerModal(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Gestionar Plantillas
              </ZenButton>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleOpenCreate}
              >
                <FileText className="h-4 w-4 mr-2" />
                Crear Nueva Plantilla
              </ZenButton>
            </div>
          </>
        )}
      </ZenDialog>

      <ContractTemplateCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSelect={handleCreateSelect}
        studioSlug={studioSlug}
        eventTypeId={eventTypeId}
      />

      <ContractTemplateManagerModal
        isOpen={showManagerModal}
        onClose={() => {
          setShowManagerModal(false);
          loadTemplates(); // Recargar plantillas después de gestionar
        }}
        studioSlug={studioSlug}
        eventTypeId={eventTypeId}
        onSelect={(templateId) => {
          setShowManagerModal(false);
          setSelectedTemplateId(templateId);
          loadTemplates();
        }}
      />

      {previewTemplate && (
        <ContractPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewTemplate(null);
          }}
          onConfirm={() => {
            setShowPreviewModal(false);
            setPreviewTemplate(null);
            onClose();
          }}
          studioSlug={studioSlug}
          eventId={eventId}
          templateId={previewTemplate.id}
          templateContent={previewTemplate.content}
          templateName={previewTemplate.name}
          onContractGenerated={() => {
            setShowPreviewModal(false);
            setPreviewTemplate(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
