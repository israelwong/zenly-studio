"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Loader2, Clock, Eye, CheckCircle2, X } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton, ZenBadge } from "@/components/ui/zen";
import { getEventContractData, renderContractContent, type EventContractDataWithConditions } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { generatePDFFromElement, generateContractFilename } from "@/lib/utils/pdf-generator";
import { CONTRACT_PREVIEW_STYLES } from "@/lib/utils/contract-styles";
import type { EventContract } from "@/types/contracts";
import { toast } from "sonner";

interface PromiseContractViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractUpdated?: () => void;
  studioSlug: string;
  eventId: string;
  contract: EventContract;
}

export function PromiseContractViewModal({
  isOpen,
  onClose,
  onContractUpdated,
  studioSlug,
  eventId,
  contract,
}: PromiseContractViewModalProps) {
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

  const getStatusDisplay = () => {
    const status = contract.status;
    if (status === 'CANCELLED') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Estado:</span>
          <ZenBadge variant="outline" className="text-red-400 border-red-500/30 bg-red-950/20 rounded-full text-xs px-2 py-0.5 h-5">
            <X className="h-3 w-3 mr-1" />
            Cancelado
          </ZenBadge>
        </div>
      );
    }
    if (status === 'SIGNED') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Estado:</span>
          <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20 rounded-full text-xs px-2 py-0.5 h-5">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Firmado
          </ZenBadge>
        </div>
      );
    }
    if (status === 'PUBLISHED') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Estado:</span>
          <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20 rounded-full text-xs px-2 py-0.5 h-5">
            <Eye className="h-3 w-3 mr-1" />
            Publicado
          </ZenBadge>
        </div>
      );
    }
    if (status === 'DRAFT') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Estado:</span>
          <ZenBadge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-950/20 rounded-full text-xs px-2 py-0.5 h-5">
            <Clock className="h-3 w-3 mr-1" />
            Borrador
          </ZenBadge>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Estado:</span>
        <span className="text-sm text-zinc-300">
          {status === 'CANCELLATION_REQUESTED_BY_STUDIO' ? 'Cancelación solicitada' : 
           status === 'CANCELLATION_REQUESTED_BY_CLIENT' ? 'Cliente solicita cancelar' : 
           'En proceso'}
        </span>
      </div>
    );
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title={`Contrato - Versión ${contract.version}`}
        description={getStatusDisplay()}
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
            <div className="h-[calc(90vh-200px)] min-h-[500px] overflow-y-auto p-4">
              <style dangerouslySetInnerHTML={{ __html: CONTRACT_PREVIEW_STYLES }} />
              <div
                className="contract-preview"
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

