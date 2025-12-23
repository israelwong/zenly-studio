"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ContractPreview } from "@/app/[slug]/studio/config/contratos/components";
import { getEventContractData, type EventContractDataWithConditions } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { generateEventContract } from "@/lib/actions/studio/business/contracts/contracts.actions";
import type { EventContractData } from "@/types/contracts";
import { toast } from "sonner";

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  studioSlug: string;
  eventId: string;
  templateId: string;
  templateContent: string;
  templateName?: string;
  onContractGenerated?: () => void;
}

export function ContractPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  eventId,
  templateId,
  templateContent,
  templateName,
  onContractGenerated,
}: ContractPreviewModalProps) {
  const [eventData, setEventData] = useState<EventContractDataWithConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      loadEventData();
    }
  }, [isOpen, eventId, studioSlug]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      console.log('[ContractPreviewModal] Cargando datos del evento:', { studioSlug, eventId });
      const result = await getEventContractData(studioSlug, eventId);
      console.log('[ContractPreviewModal] Resultado:', {
        success: result.success,
        hasData: !!result.data,
        data: result.data ? {
          fecha_evento: result.data.fecha_evento,
          condiciones_pago: result.data.condiciones_pago,
          nombre_cliente: result.data.nombre_cliente,
          servicios_count: result.data.servicios_incluidos.length,
        } : null,
        error: result.error,
      });
      if (result.success && result.data) {
        setEventData(result.data);
      } else {
        toast.error(result.error || "Error al cargar datos del evento");
      }
    } catch (error) {
      console.error("Error loading event data:", error);
      toast.error("Error al cargar datos del evento");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      const result = await generateEventContract(studioSlug, {
        event_id: eventId,
        template_id: templateId,
      });

      if (result.success && result.data) {
        toast.success('Contrato generado correctamente');
        onContractGenerated?.();
        onConfirm?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al generar contrato');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error('Error al generar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={templateName ? `Vista Previa: ${templateName}` : "Vista Previa del Contrato"}
      description="Revisa cómo se verá el contrato con los datos del evento"
      maxWidth="4xl"
      onSave={handleConfirm}
      onCancel={onClose}
      saveLabel="Usar esta plantilla"
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      zIndex={10065}
      isLoading={isGenerating}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="h-[calc(90vh-200px)] min-h-[500px]">
          <ContractPreview
            content={templateContent}
            eventData={eventData || undefined}
            condicionesData={eventData?.condicionesData}
            className="h-full"
          />
        </div>
      )}
    </ZenDialog>
  );
}

