"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Loader2 } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton } from "@/components/ui/zen";
import { getEventContractData, renderContractContent, type EventContractDataWithConditions } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { generatePDFFromElement, generateContractFilename } from "@/lib/utils/pdf-generator";
import type { EventContract } from "@/types/contracts";
import { toast } from "sonner";

interface EventContractViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractUpdated?: () => void;
  studioSlug: string;
  eventId: string;
  contract: EventContract;
}

export function EventContractViewModal({
  isOpen,
  onClose,
  onContractUpdated,
  studioSlug,
  eventId,
  contract,
}: EventContractViewModalProps) {
  const [eventData, setEventData] = useState<EventContractDataWithConditions | null>(null);
  const [renderedContent, setRenderedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && contract) {
      loadContractData();
    } else if (!isOpen) {
      // Resetear estados cuando se cierra el modal
      setRenderedContent('');
      setEventData(null);
    }
  }, [isOpen, contract, studioSlug, eventId]);

  // Función para limpiar y reconstruir el HTML
  const cleanHTMLContent = (html: string): string => {
    // Crear un contenedor temporal para procesar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Procesar todos los elementos
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const textContent = htmlEl.textContent?.trim() || '';
      const innerHTML = htmlEl.innerHTML.trim();
      const tagName = htmlEl.tagName.toLowerCase();

      // Si el elemento tiene textContent pero innerHTML está vacío o solo tiene espacios,
      // reconstruir el contenido
      if (textContent && (!innerHTML || /^\s*$/.test(innerHTML))) {
        // Verificar si hay nodos de texto directos
        const childNodes = Array.from(htmlEl.childNodes);
        const hasTextNodes = childNodes.some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );

        if (hasTextNodes) {
          // Reconstruir el contenido del elemento
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span', 'strong', 'b', 'em', 'i', 'blockquote'].includes(tagName)) {
            htmlEl.innerHTML = textContent;
          }
        }
      }
    });

    return tempDiv.innerHTML;
  };

  // Procesar el contenido del printable después de renderizar
  useEffect(() => {
    if (printableRef.current && renderedContent) {
      // Esperar un momento para que el DOM se actualice
      const timer = setTimeout(() => {
        if (printableRef.current) {
          const allElements = printableRef.current.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const textContent = htmlEl.textContent?.trim() || '';
            const innerHTML = htmlEl.innerHTML.trim();

            // Si tiene textContent pero innerHTML está vacío, reconstruir
            if (textContent && (!innerHTML || /^\s*$/.test(innerHTML))) {
              const tagName = htmlEl.tagName.toLowerCase();
              if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span', 'strong', 'b', 'em', 'i'].includes(tagName)) {
                htmlEl.innerHTML = textContent;
              }
            }
          });
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [renderedContent]);

  const loadContractData = async () => {
    setLoading(true);
    try {
      const dataResult = await getEventContractData(studioSlug, eventId);
      if (dataResult.success && dataResult.data) {
        setEventData(dataResult.data);

        // Renderizar contenido
        const renderResult = await renderContractContent(
          contract.content,
          dataResult.data,
          dataResult.data.condicionesData
        );
        if (renderResult.success && renderResult.data) {
          setRenderedContent(renderResult.data);
        } else {
          // Si falla el renderizado, usar el contenido del contrato como fallback
          const fallbackContent = contract.content.replace(/\n/g, '<br>');
          setRenderedContent(fallbackContent || contract.content);
        }
      } else {
        // Si no hay datos del evento, usar el contenido del contrato sin renderizar
        const fallbackContent = contract.content.replace(/\n/g, '<br>');
        setRenderedContent(fallbackContent || contract.content);
        toast.error(dataResult.error || "Error al cargar datos del evento");
      }
    } catch (error) {
      // En caso de error, usar el contenido del contrato como fallback
      const fallbackContent = contract.content.replace(/\n/g, '<br>');
      setRenderedContent(fallbackContent || contract.content);
      toast.error("Error al cargar datos del contrato");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!renderedContent || !printableRef.current) {
      toast.error("No hay contenido disponible para exportar");
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

      toast.success("Contrato exportado a PDF correctamente");
    } catch (error) {
      toast.error("Error al exportar PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title={`Contrato - Versión ${contract.version}`}
        description={`Estado: ${contract.status === 'draft' ? 'Borrador' : contract.status === 'published' ? 'Publicado' : 'Firmado'}`}
        maxWidth="5xl"
        onCancel={onClose}
        cancelLabel="Cerrar"
        closeOnClickOutside={false}
        footerLeftContent={
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
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            <div className="h-[calc(90vh-200px)] min-h-[500px] overflow-y-auto">
              <style dangerouslySetInnerHTML={{
                __html: `
              .contract-preview-modal {
                color: rgb(161 161 170);
                font-size: 0.875rem;
                line-height: 1.5;
                padding: 1rem;
              }
              .contract-preview-modal h1 {
                font-size: 1.5rem !important;
                font-weight: 700 !important;
                line-height: 1.2 !important;
                margin-top: 1.5rem !important;
                margin-bottom: 1rem !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                padding: 0 !important;
                color: rgb(244, 244, 245) !important;
                text-align: left !important;
                text-transform: uppercase;
              }
              .contract-preview-modal h1:first-child {
                margin-top: 0 !important;
              }
              .contract-preview-modal h2 {
                font-size: 1.25rem;
                font-weight: 600;
                margin-top: 1rem;
                margin-bottom: 0.5rem;
                color: rgb(244 244 245);
              }
              .contract-preview-modal h3 {
                font-size: 1.125rem;
                font-weight: 500;
                margin-top: 0.75rem;
                margin-bottom: 0.5rem;
                color: rgb(212 212 216);
              }
              .contract-preview-modal p {
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                line-height: 1.6;
                color: rgb(161 161 170);
              }
              .contract-preview-modal ul,
              .contract-preview-modal ol {
                list-style-position: outside;
                padding-left: 1.5rem;
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                color: rgb(161 161 170);
              }
              .contract-preview-modal ul {
                list-style-type: disc;
              }
              .contract-preview-modal ol {
                list-style-type: decimal;
              }
              .contract-preview-modal ul li,
              .contract-preview-modal ol li {
                margin-top: 0.25rem;
                margin-bottom: 0.25rem;
                padding-left: 0.5rem;
                line-height: 1.5;
                display: list-item;
              }
              .contract-preview-modal strong {
                font-weight: 600;
                color: rgb(228 228 231);
              }
              .contract-preview-modal em {
                font-style: italic;
                color: rgb(113 113 122);
              }
              .contract-preview-modal blockquote {
                margin: 0.5rem 0;
                padding-left: 1rem;
                border-left: 2px solid rgb(63 63 70);
                color: rgb(161 161 170);
              }
            `}} />
              <div
                className="contract-preview-modal"
                dangerouslySetInnerHTML={{ __html: renderedContent || contract.content }}
              />
            </div>
          </>
        )}
      </ZenDialog>

      {/* Hidden Printable Version - Fuera del dialog para asegurar renderizado */}
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

