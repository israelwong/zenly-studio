'use client';

import React, { useState } from 'react';
import { ContractEditorModal } from './ContractEditorModal';
import { createContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { DEFAULT_CONTRACT_TEMPLATE } from '@/lib/constants/contract-template';
import { toast } from 'sonner';

interface ContractTemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (templateId: string) => void;
  studioSlug: string;
  eventTypeId?: string;
}

export function ContractTemplateCreateModal({
  isOpen,
  onClose,
  onSelect,
  studioSlug,
  eventTypeId,
}: ContractTemplateCreateModalProps) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <ContractEditorModal
      isOpen={isOpen}
      onClose={onClose}
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
            ...(eventTypeId && { event_type_id: eventTypeId }),
          });

          if (result.success && result.data) {
            toast.success('Plantilla creada correctamente');

            // Si hay callback onSelect, seleccionar automáticamente y cerrar
            if (onSelect && result.data.id) {
              onSelect(result.data.id);
            }
            onClose();
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
  );
}
