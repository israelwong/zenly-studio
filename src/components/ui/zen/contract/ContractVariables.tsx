"use client";

import React from "react";
import { CONTRACT_VARIABLES } from "@/types/contracts";
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent } from "@/components/ui/zen";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export interface ContractVariablesProps {
  onVariableClick?: (variable: string) => void;
  className?: string;
}

export function ContractVariables({ onVariableClick, className = "" }: ContractVariablesProps) {
  const [copiedVariable, setCopiedVariable] = React.useState<string | null>(null);

  const handleCopy = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    toast.success("Variable copiada al portapapeles");

    setTimeout(() => {
      setCopiedVariable(null);
    }, 2000);
  };

  const handleClick = (variable: string) => {
    if (onVariableClick) {
      onVariableClick(variable);
    } else {
      handleCopy(variable);
    }
  };

  return (
    <ZenCard variant="default" className={className}>
      <ZenCardHeader className="border-b border-zinc-800">
        <ZenCardTitle className="text-base">Variables Disponibles</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-6">
        {/* Datos del Cliente */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Datos del Cliente
          </h4>
          <div className="space-y-1">
            {CONTRACT_VARIABLES.filter((v) => v.key.includes("cliente")).map((variable) => (
              <VariableItem
                key={variable.key}
                variable={variable}
                isCopied={copiedVariable === variable.key}
                onClick={() => handleClick(variable.key)}
              />
            ))}
          </div>
        </div>

        {/* Datos del Evento */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Datos del Evento
          </h4>
          <div className="space-y-1">
            {CONTRACT_VARIABLES.filter(
              (v) => v.key.includes("evento") || v.key.includes("tipo")
            ).map((variable) => (
              <VariableItem
                key={variable.key}
                variable={variable}
                isCopied={copiedVariable === variable.key}
                onClick={() => handleClick(variable.key)}
              />
            ))}
          </div>
        </div>

        {/* Datos Comerciales */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Datos Comerciales
          </h4>
          <div className="space-y-1">
            {CONTRACT_VARIABLES.filter(
              (v) => v.key.includes("total") || v.key.includes("condiciones")
            ).map((variable) => (
              <VariableItem
                key={variable.key}
                variable={variable}
                isCopied={copiedVariable === variable.key}
                onClick={() => handleClick(variable.key)}
              />
            ))}
          </div>
        </div>

        {/* Datos del Studio */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Datos del Studio
          </h4>
          <div className="space-y-1">
            {CONTRACT_VARIABLES.filter((v) => v.key.includes("studio")).map((variable) => (
              <VariableItem
                key={variable.key}
                variable={variable}
                isCopied={copiedVariable === variable.key}
                onClick={() => handleClick(variable.key)}
              />
            ))}
          </div>
        </div>

        {/* Bloques Especiales */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Bloques Especiales
          </h4>
          <div className="space-y-1">
            {CONTRACT_VARIABLES.filter((v) => v.key.includes("[")).map((variable) => (
              <VariableItem
                key={variable.key}
                variable={variable}
                isCopied={copiedVariable === variable.key}
                onClick={() => handleClick(variable.key)}
                isBlock
              />
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            💡 Haz clic en una variable para copiarla o insertarla en el contrato
          </p>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

interface VariableItemProps {
  variable: { key: string; label: string; description: string; example: string };
  isCopied: boolean;
  onClick: () => void;
  isBlock?: boolean;
}

function VariableItem({ variable, isCopied, onClick, isBlock = false }: VariableItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded-md hover:bg-zinc-800/50 transition-colors group relative"
      title={variable.description}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <code
            className={`text-xs font-mono ${isBlock
                ? "text-purple-400 bg-purple-950/30"
                : "text-emerald-400 bg-emerald-950/30"
              } px-1.5 py-0.5 rounded`}
          >
            {variable.key}
          </code>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{variable.description}</p>
          <p className="text-xs text-zinc-600 mt-0.5 italic">
            Ej: {variable.example}
          </p>
        </div>
        <div className="flex-shrink-0">
          {isCopied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          )}
        </div>
      </div>
    </button>
  );
}
