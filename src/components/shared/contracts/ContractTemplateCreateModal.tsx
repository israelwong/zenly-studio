'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton } from '@/components/ui/zen';
import { ContractTemplateForm } from './ContractTemplateForm';
import { createContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
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
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (data: Parameters<typeof createContractTemplate>[1]) => {
    setIsCreating(true);
    try {
      const result = await createContractTemplate(studioSlug, data);

      if (result.success && result.data) {
        toast.success('Plantilla creada correctamente');

        // Si hay callback onSelect, seleccionar automáticamente y cerrar
        if (onSelect && result.data.id) {
          onSelect(result.data.id);
          onClose();
        } else {
          // Cerrar modal
          onClose();
        }
      } else {
        toast.error(result.error || 'Error al crear plantilla');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error al crear plantilla');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManageComplete = () => {
    router.push(`/${studioSlug}/studio/contratos/nuevo`);
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Plantilla de Contrato"
      description="Crea una plantilla rápida para generar contratos"
      maxWidth="7xl"
      onCancel={onClose}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      fullScreen={true}
    >
      <ContractTemplateForm
        mode="modal"
        onSave={handleCreate}
        onCancel={onClose}
        onManageComplete={handleManageComplete}
        simplified={true}
        isLoading={isCreating}
      />
    </ZenDialog>
  );
}
