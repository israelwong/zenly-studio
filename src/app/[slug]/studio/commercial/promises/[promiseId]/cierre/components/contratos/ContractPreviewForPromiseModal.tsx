'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Edit2 } from 'lucide-react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { ContractPreview } from '@/components/shared/contracts/ContractPreview';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractPreviewForPromiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
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
  /** Solo ver: muestra solo botón "Cerrar", sin Confirmar plantilla ni Editar */
  viewOnly?: boolean;
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
  viewOnly = false,
}: ContractPreviewForPromiseModalProps) {
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

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

  const isReadOnly = isContractSigned || !!eventId || viewOnly;

  // Mismo patrón que PublicContractView: si hay cotizacionData o condicionesData, priorizar
  // template.content (con @condiciones_comerciales y @cotizacion_autorizada) para que el Master
  // los re-renderice, incluso en modo read-only o autorizada.
  const contentToPreview = useMemo(() => {
    const hasBlockData = eventData?.cotizacionData || eventData?.condicionesData;
    if (hasBlockData) {
      return template.content;
    }
    return customContent || template.content;
  }, [customContent, template.content, eventData?.cotizacionData, eventData?.condicionesData]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Vista Previa: ${template.name}`}
      description={
        viewOnly
          ? "Vista previa del contrato"
          : isContractSigned
          ? "Contrato firmado por el cliente"
          : eventId
          ? "Contrato inmutable del evento creado"
          : "Revisa el contrato antes de confirmar"
      }
      maxWidth="4xl"
      onSave={isReadOnly ? undefined : handleConfirm}
      onCancel={onClose}
      saveLabel={isReadOnly ? undefined : (confirming ? "Confirmando plantilla" : "Confirmar plantilla")}
      isLoading={confirming}
      saveDisabled={!isReadOnly && (loading || confirming)}
      cancelLabel={isReadOnly ? "Cerrar" : "Cancelar"}
      cancelAlignRight={isReadOnly}
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
        <div className="flex flex-col max-h-[calc(90vh-180px)] min-h-[400px] overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ContractPreview
              content={contentToPreview}
              eventData={eventData || undefined}
              cotizacionData={eventData?.cotizacionData}
              condicionesData={eventData?.condicionesData}
              className="min-h-full"
            />
          </div>
        </div>
      )}
    </ZenDialog>
  );
}

