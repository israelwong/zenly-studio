"use client";

import React from "react";
import { EventContractData } from "@/types/contracts";
import { ZenCard, ZenCardContent } from "@/components/ui/zen";
import { useContractRenderer } from "@/app/[slug]/studio/config/contratos/components/hooks/useContractRenderer";
import { cn } from "@/lib/utils";
import type {
  CotizacionRenderData,
  CondicionesComercialesData,
} from "@/app/[slug]/studio/config/contratos/components/types";

interface ContractPreviewProps {
  content: string;
  eventData?: EventContractData;
  cotizacionData?: CotizacionRenderData;
  condicionesData?: CondicionesComercialesData;
  showVariables?: boolean;
  className?: string;
  /**
   * Si es true, no muestra el ZenCard wrapper, solo el contenido
   * Útil para integrar en otros componentes
   */
  noCard?: boolean;
}

export function ContractPreview({
  content,
  eventData,
  cotizacionData,
  condicionesData,
  showVariables = false,
  className = "",
  noCard = false,
}: ContractPreviewProps) {
  const { renderedContent } = useContractRenderer({
    content,
    eventData,
    cotizacionData,
    condicionesData,
    showVariables,
  });

  const contentElement = (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .contract-preview {
          color: rgb(161 161 170);
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .contract-preview br {
          display: block;
          margin: 0;
          padding: 0;
          line-height: 1.2;
          height: 0;
          content: "";
        }
        .contract-preview h1 {
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
        .contract-preview h1:first-child {
          margin-top: 0 !important;
        }
        .contract-preview h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: rgb(244 244 245);
        }
        .contract-preview h3 {
          font-size: 1.125rem;
          font-weight: 500;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: rgb(212 212 216);
        }
        .contract-preview p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.6;
          color: rgb(161 161 170);
        }
        .contract-preview ul,
        .contract-preview ol {
          list-style-position: outside;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          color: rgb(161 161 170);
        }
        .contract-preview ul {
          list-style-type: disc;
        }
        .contract-preview ol {
          list-style-type: decimal;
        }
        .contract-preview ul li,
        .contract-preview ol li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          padding-left: 0.5rem;
          line-height: 1.5;
          display: list-item;
        }
        .contract-preview strong {
          font-weight: 600;
          color: rgb(228 228 231);
        }
        .contract-preview em {
          font-style: italic;
          color: rgb(113 113 122);
        }
        .contract-preview blockquote {
          margin: 0.5rem 0;
          padding-left: 1rem;
          border-left: 2px solid rgb(63 63 70);
          color: rgb(161 161 170);
        }
        .contract-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          border: 1px solid rgba(63, 63, 70, 0.5);
          border-radius: 8px;
          overflow: hidden;
        }
        .contract-preview table thead {
          background: linear-gradient(to bottom, rgba(39, 39, 42, 0.8), rgba(39, 39, 42, 0.5));
          border-bottom: 2px solid rgba(63, 63, 70, 1);
        }
        .contract-preview table th {
          padding: 12px 16px;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(228, 228, 231, 1);
        }
        .contract-preview table td {
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid rgba(63, 63, 70, 0.3);
        }
        .contract-preview table tbody tr:last-child td {
          border-bottom: none;
        }
        .contract-preview [class*="copy"],
        .contract-preview [class*="Copy"],
        .contract-preview [class*="clipboard"],
        .contract-preview button[aria-label*="copiar"],
        .contract-preview button[aria-label*="Copiar"],
        .contract-preview button[title*="copiar"],
        .contract-preview button[title*="Copiar"],
        .contract-preview svg[class*="copy"],
        .contract-preview svg[class*="Copy"] {
          display: none !important;
        }
        .contract-preview .cotizacion-block .seccion {
          display: block !important;
          margin-bottom: 1.5rem !important;
        }
        .contract-preview .cotizacion-block .seccion h3 {
          display: block !important;
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          color: rgb(212 212 216) !important;
          margin-bottom: 0.75rem !important;
          margin-top: 0 !important;
        }
        .contract-preview .cotizacion-block .categoria {
          display: block !important;
          margin-bottom: 1rem !important;
          margin-left: 1rem !important;
        }
        .contract-preview .cotizacion-block .categoria h4 {
          display: block !important;
          font-size: 1rem !important;
          font-weight: 500 !important;
          color: rgb(212 212 216) !important;
          margin-bottom: 0.5rem !important;
        }
      `}} />
      <div
        className="contract-preview scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />

      {showVariables && (
        <div className="mt-6 p-4 bg-blue-950/20 border border-blue-800/30 rounded-lg">
          <p className="text-sm text-blue-400">
            <span className="font-semibold">Nota:</span> Las variables como{" "}
            <code className="bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-300">
              @nombre_cliente
            </code>{" "}
            serán reemplazadas automáticamente con los datos del evento.
          </p>
        </div>
      )}

      {eventData && !showVariables && (
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-600 text-center">
            {eventData.fecha_evento && eventData.fecha_evento !== 'Fecha por definir' ? (
              <>Documento generado para {eventData.nombre_cliente} para su evento del {eventData.fecha_evento}</>
            ) : (
              <>Documento generado para {eventData.nombre_cliente}</>
            )}
          </p>
        </div>
      )}
    </>
  );

  if (noCard) {
    return <div className={cn("h-full flex flex-col relative z-0", className)}>{contentElement}</div>;
  }

  return (
    <ZenCard variant="default" className={cn("h-full flex flex-col relative z-0", className)}>
      <ZenCardContent className="p-4 flex-1 overflow-y-auto relative z-0">
        {contentElement}
      </ZenCardContent>
    </ZenCard>
  );
}

