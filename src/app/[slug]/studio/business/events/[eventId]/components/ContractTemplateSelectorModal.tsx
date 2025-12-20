'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton } from '@/components/ui/zen';
import { ContractTemplateCreateModal } from '@/components/shared/contracts/ContractTemplateCreateModal';
import { ContractTemplateList } from '@/components/shared/contracts/ContractTemplateList';
import { getContractTemplates } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractTemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  studioSlug: string;
  eventTypeId?: string;
  isLoading?: boolean;
}

export function ContractTemplateSelectorModal({
  isOpen,
  onClose,
  onSelect,
  studioSlug,
  eventTypeId,
  isLoading = false,
}: ContractTemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleSelect = () => {
    if (selectedTemplateId) {
      onSelect(selectedTemplateId);
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
        saveLabel="Usar esta plantilla"
        cancelLabel="Cancelar"
        isLoading={isLoading}
        saveVariant="primary"
        closeOnClickOutside={false}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            <ContractTemplateList
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
            <div className="flex items-center justify-end pt-4 border-t border-zinc-800 mt-4">
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
    </>
  );
}
