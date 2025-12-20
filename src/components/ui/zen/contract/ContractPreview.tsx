"use client";

import React from "react";
import { EventContractData } from "@/types/contracts";
import { ZenCard, ZenCardContent } from "@/components/ui/zen";

export interface ContractPreviewProps {
  content: string;
  eventData?: EventContractData;
  showVariables?: boolean;
  className?: string;
}

export function ContractPreview({
  content,
  eventData,
  showVariables = false,
  className = "",
}: ContractPreviewProps) {
  // Si showVariables es true, mostrar las variables sin reemplazar
  const displayContent = showVariables ? content : content;

  return (
    <ZenCard variant="default" className={className}>
      <ZenCardContent className="p-8 max-w-4xl mx-auto">
        <div
          className="contract-preview prose prose-invert prose-zinc max-w-none
            prose-headings:text-zinc-100
            prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-6 prose-h1:uppercase
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-8 prose-h2:flex prose-h2:items-center
            prose-h3:text-lg prose-h3:font-medium prose-h3:text-zinc-300 prose-h3:mb-2
            prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:mb-4
            prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2 prose-ul:text-zinc-400
            prose-ol:list-decimal prose-ol:list-inside prose-ol:space-y-3 prose-ol:text-zinc-400
            prose-li:mb-3
            prose-strong:text-zinc-200 prose-strong:font-semibold
            prose-em:text-zinc-500 prose-em:italic"
          dangerouslySetInnerHTML={{ __html: displayContent }}
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
              Documento generado para {eventData.nombre_cliente} • {eventData.fecha_evento}
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
