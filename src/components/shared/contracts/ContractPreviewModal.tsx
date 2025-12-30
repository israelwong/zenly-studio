"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Download, Edit2 } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton } from "@/components/ui/zen";
import { ContractPreview } from "@/app/[slug]/studio/config/contratos/components";
import { getEventContractData, renderContractContent, type EventContractDataWithConditions } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { generateEventContract, getEventContract, updateEventContractTemplate } from "@/lib/actions/studio/business/contracts/contracts.actions";
import { generatePDFFromElement, generateContractFilename } from "@/lib/utils/pdf-generator";
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
  // Modo preview-only (para autorización de cotización)
  previewOnly?: boolean;
  onEdit?: () => void;
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
  previewOnly = false,
  onEdit,
}: ContractPreviewModalProps) {
  const [eventData, setEventData] = useState<EventContractDataWithConditions | null>(null);
  const [renderedContent, setRenderedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && eventId) {
      loadEventData();
    } else if (!isOpen) {
      // Resetear estados cuando se cierra el modal
      setRenderedContent('');
      setEventData(null);
    }
  }, [isOpen, eventId, studioSlug]);

  const loadEventData = async () => {
    setLoading(true);
    setRenderedContent(''); // Resetear antes de cargar
    try {
      const result = await getEventContractData(studioSlug, eventId);
      if (result.success && result.data) {
        setEventData(result.data);

        // Renderizar contenido para PDF
        const renderResult = await renderContractContent(
          templateContent,
          result.data,
          result.data.condicionesData
        );
        if (renderResult.success && renderResult.data) {
          setRenderedContent(renderResult.data);
        } else {
          // Si falla el renderizado, usar el contenido del template como fallback
          // Convertir saltos de línea a <br> para el fallback
          const fallbackContent = templateContent.replace(/\n/g, '<br>');
          setRenderedContent(fallbackContent || templateContent);
        }
      } else {
        // Si no hay datos del evento, usar el template sin renderizar
        const fallbackContent = templateContent.replace(/\n/g, '<br>');
        setRenderedContent(fallbackContent || templateContent);
        toast.error(result.error || "Error al cargar datos del evento");
      }
    } catch (error) {
      // En caso de error, usar el template como fallback
      const fallbackContent = templateContent.replace(/\n/g, '<br>');
      setRenderedContent(fallbackContent || templateContent);
      toast.error("Error al cargar datos del evento");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      // Verificar si ya existe un contrato para este evento
      const existingContractResult = await getEventContract(studioSlug, eventId);

      if (existingContractResult.success && existingContractResult.data) {
        // Actualizar contrato existente con nueva plantilla
        const updateResult = await updateEventContractTemplate(studioSlug, existingContractResult.data.id, {
          template_id: templateId,
          change_reason: `Plantilla cambiada a: ${templateName || 'Nueva plantilla'}`,
        });

        if (updateResult.success && updateResult.data) {
          toast.success('Plantilla actualizada correctamente');
          onContractGenerated?.();
          onConfirm?.();
          onClose();
        } else {
          toast.error(updateResult.error || 'Error al actualizar plantilla');
        }
      } else {
        // Crear nuevo contrato
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
      }
    } catch (error) {
      console.error('Error en handleConfirm:', error);
      toast.error('Error al procesar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!renderedContent || !printableRef.current) {
      toast.error('No hay contenido disponible para exportar');
      return;
    }

    setIsExportingPDF(true);
    try {
      const filename = generateContractFilename(
        eventData?.nombre_evento || 'Contrato',
        eventData?.nombre_cliente || 'Cliente'
      );

      await generatePDFFromElement(printableRef.current, {
        filename,
        margin: 0.75,
      });

      toast.success('Contrato exportado a PDF correctamente');
    } catch (error) {
      toast.error('Error al exportar PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title={templateName ? `Vista Previa: ${templateName}` : "Vista Previa del Contrato"}
        description={previewOnly ? "Revisa el contrato antes de confirmar" : "Revisa cómo se verá el contrato con los datos del evento"}
        maxWidth="4xl"
        onSave={previewOnly ? onConfirm : handleConfirm}
        onCancel={onClose}
        saveLabel={previewOnly ? "Confirmar plantilla" : "Usar esta plantilla"}
        cancelLabel="Cancelar"
        closeOnClickOutside={false}
        zIndex={10080}
        isLoading={isGenerating}
        footerLeftContent={
          previewOnly && onEdit ? (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar para este cliente
            </ZenButton>
          ) : (
            <ZenButton
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF || loading || !renderedContent}
              title={
                loading
                  ? "Cargando datos..."
                  : !renderedContent
                    ? "No hay contenido disponible"
                    : isExportingPDF
                      ? "Generando PDF..."
                      : "Descargar PDF"
              }
            >
              {isExportingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar PDF
            </ZenButton>
          )
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="h-[calc(90vh-280px)] min-h-[500px]">
            <ContractPreview
              content={templateContent}
              eventData={eventData || undefined}
              condicionesData={eventData?.condicionesData}
              className="h-full"
            />
          </div>
        )}
      </ZenDialog>

      {/* Hidden Printable Version - Renderizar solo cuando el modal está abierto */}
      {isOpen && renderedContent && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <div
            ref={printableRef}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '32px',
              width: '210mm',
              minHeight: '297mm',
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      )}
    </>
  );
}

