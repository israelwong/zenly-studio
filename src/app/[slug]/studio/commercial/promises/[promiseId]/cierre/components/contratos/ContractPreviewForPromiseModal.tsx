'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Edit2 } from 'lucide-react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { ContractPreview } from '@/app/[slug]/studio/config/contratos/components';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractPreviewForPromiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
  template: ContractTemplate;
  customContent?: string | null;
  condicionesComerciales?: {
    id: string;
    name: string;
    description?: string | null;
    discount_percentage?: number | null;
    advance_percentage?: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
  };
  isContractSigned?: boolean; // Indica si el contrato ya fue firmado
  eventId?: string; // Si el evento ya existe, usar getEventContractData en lugar de getPromiseContractData (read-only)
}

export function ContractPreviewForPromiseModal({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  studioSlug,
  promiseId,
  cotizacionId,
  template,
  customContent,
  condicionesComerciales,
  isContractSigned = false,
  eventId,
}: ContractPreviewForPromiseModalProps) {
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadContractData();
    } else {
      setEventData(null);
    }
  }, [isOpen, promiseId, cotizacionId, studioSlug, eventId]);

  const loadContractData = async () => {
    setLoading(true);
    try {
      // Si el evento ya existe, usar getEventContractData (usa snapshots inmutables)
      // Si no existe, usar getPromiseContractData (para promesas sin evento)
      if (eventId) {
        const { getEventContractData } = await import('@/lib/actions/studio/business/contracts/renderer.actions');
        const result = await getEventContractData(studioSlug, eventId);
        
        if (result.success && result.data) {
          setEventData(result.data);
        } else {
          toast.error(result.error || 'Error al cargar datos del evento');
        }
      } else {
        const { getPromiseContractData } = await import('@/lib/actions/studio/business/contracts/renderer.actions');
        const result = await getPromiseContractData(
          studioSlug,
          promiseId,
          cotizacionId,
          condicionesComerciales
        );

        if (result.success && result.data) {
          setEventData(result.data);
        } else {
          toast.error(result.error || 'Error al cargar datos');
        }
      }
    } catch (error) {
      console.error('[ContractPreviewForPromiseModal] Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const contentToPreview = customContent || template.content;

  // Determinar si es modo read-only (evento creado o contrato firmado)
  const isReadOnly = isContractSigned || !!eventId;

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Vista Previa: ${template.name}`}
      description={
        isContractSigned 
          ? "Contrato firmado por el cliente" 
          : eventId 
          ? "Contrato inmutable del evento creado" 
          : "Revisa el contrato antes de confirmar"
      }
      maxWidth="4xl"
      onSave={isReadOnly ? undefined : onConfirm}
      onCancel={onClose}
      saveLabel={isReadOnly ? undefined : "Confirmar plantilla"}
      cancelLabel={isReadOnly ? "Cerrar" : "Cancelar"}
      closeOnClickOutside={false}
      zIndex={10080}
      footerLeftContent={
        !isReadOnly ? (
          <ZenButton
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Editar para este cliente
          </ZenButton>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="h-[calc(90vh-280px)] min-h-[500px]">
          <ContractPreview
            content={contentToPreview}
            eventData={eventData || undefined}
            cotizacionData={eventData?.cotizacionData}
            condicionesData={eventData?.condicionesData}
            className="h-full"
          />
        </div>
      )}
    </ZenDialog>
  );
}

