"use client";

import React from "react";
import { CONTRACT_VARIABLES } from "@/types/contracts";
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenTabs } from "@/components/ui/zen";
import { Copy, Check, Plus, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ContractVariablesProps {
  onVariableClick?: (variable: string) => void;
  className?: string;
  showCard?: boolean;
}

export function ContractVariables({ onVariableClick, className = "", showCard = true }: ContractVariablesProps) {
  const [copiedVariable, setCopiedVariable] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"cliente" | "studio">("cliente");

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

  const tabs = [
    {
      id: "cliente",
      label: "Cliente",
      icon: <User className="w-4 h-4" />,
    },
    {
      id: "studio",
      label: "Studio",
      icon: <Building2 className="w-4 h-4" />,
    },
  ];

  const renderVariables = () => {
    // Agrupar por categorías según el tab activo
    const clienteVars = CONTRACT_VARIABLES.filter(
      (v) =>
        v.key.includes("cliente") ||
        (v.key.includes("email") && v.key.includes("cliente")) ||
        (v.key.includes("telefono") && v.key.includes("cliente")) ||
        (v.key.includes("direccion") && v.key.includes("cliente")) ||
        v.key.includes("fecha_firma_cliente")
    );
    const eventoVars = CONTRACT_VARIABLES.filter(
      (v) => v.key.includes("evento") || (v.key.includes("fecha") && !v.key.includes("firma")) || v.key.includes("tipo")
    );
    const comercialesVars = CONTRACT_VARIABLES.filter(
      (v) => v.key.includes("total") || v.key.includes("condiciones") || v.key.includes("cotizacion")
    );
    const bloquesVars = CONTRACT_VARIABLES.filter((v) => v.key.includes("["));
    const studioVars = CONTRACT_VARIABLES.filter(
      (v) =>
        v.key.includes("studio") ||
        v.key.includes("representante") ||
        (v.key.includes("correo") && v.key.includes("studio")) ||
        (v.key.includes("telefono") && v.key.includes("studio")) ||
        (v.key.includes("direccion") && v.key.includes("studio"))
    );

    return (
      <div className="space-y-5">
        {/* Tab Cliente: Datos del Cliente, Evento, Comerciales y Bloques */}
        {activeTab === "cliente" && (
          <>
            {clienteVars.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-1">
                  Datos del Cliente
                </h4>
                <div className="space-y-0.5">
                  {clienteVars.map((variable) => (
                    <VariableItem
                      key={variable.key}
                      variable={variable}
                      isCopied={copiedVariable === variable.key}
                      onClick={() => handleClick(variable.key)}
                      hasInsertHandler={!!onVariableClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {eventoVars.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-1">
                  Datos del Evento
                </h4>
                <div className="space-y-0.5">
                  {eventoVars.map((variable) => (
                    <VariableItem
                      key={variable.key}
                      variable={variable}
                      isCopied={copiedVariable === variable.key}
                      onClick={() => handleClick(variable.key)}
                      hasInsertHandler={!!onVariableClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {comercialesVars.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-1">
                  Datos Comerciales
                </h4>
                <div className="space-y-0.5">
                  {comercialesVars.map((variable) => (
                    <VariableItem
                      key={variable.key}
                      variable={variable}
                      isCopied={copiedVariable === variable.key}
                      onClick={() => handleClick(variable.key)}
                      hasInsertHandler={!!onVariableClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {bloquesVars.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-1">
                  Bloques Especiales
                </h4>
                <div className="space-y-0.5">
                  {bloquesVars.map((variable) => (
                    <VariableItem
                      key={variable.key}
                      variable={variable}
                      isCopied={copiedVariable === variable.key}
                      onClick={() => handleClick(variable.key)}
                      isBlock
                      hasInsertHandler={!!onVariableClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab Studio: Datos del Studio */}
        {activeTab === "studio" && studioVars.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-1">
              Datos del Studio
            </h4>
            <div className="space-y-0.5">
              {studioVars.map((variable) => (
                <VariableItem
                  key={variable.key}
                  variable={variable}
                  isCopied={copiedVariable === variable.key}
                  onClick={() => handleClick(variable.key)}
                  isStudio={true}
                  hasInsertHandler={!!onVariableClick}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            {onVariableClick
              ? "💡 Haz clic en una variable para insertarla en el editor"
              : "💡 Haz clic en una variable para copiarla al portapapeles"
            }
          </p>
        </div>
      </div>
    );
  };

  const content = (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tabs */}
      <div className={cn("shrink-0", showCard && "px-4 pt-4")}>
        <ZenTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as "cliente" | "studio")}
        />
      </div>

      {/* Contenido de variables con scroll */}
      <div className={cn("flex-1 overflow-y-auto", showCard ? "px-4 pb-4 pt-4" : "pt-4")}>
        {renderVariables()}
      </div>
    </div>
  );

  if (!showCard) {
    return <div className={cn("flex flex-col h-full", className)}>{content}</div>;
  }

  return (
    <ZenCard variant="default" className={cn("relative z-0 flex flex-col h-full", className)}>
      <ZenCardHeader className="border-b border-zinc-800 shrink-0">
        <ZenCardTitle className="text-base">Variables Disponibles</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-0 flex-1 flex flex-col min-h-0 relative z-0">
        {content}
      </ZenCardContent>
    </ZenCard>
  );
}

interface VariableItemProps {
  variable: { key: string; label: string; description: string };
  isCopied: boolean;
  onClick: () => void;
  isBlock?: boolean;
  isStudio?: boolean;
  hasInsertHandler?: boolean;
}

function VariableItem({ variable, isCopied, onClick, isBlock = false, isStudio = false, hasInsertHandler = false }: VariableItemProps) {
  // Determinar el color según el tipo de variable
  const getVariableColor = () => {
    if (isBlock) {
      return "text-purple-400 bg-purple-950/30";
    }
    if (isStudio) {
      return "text-amber-400 bg-amber-950/30";
    }
    return "text-emerald-400 bg-emerald-950/30";
  };

  const getIconColor = () => {
    if (isStudio) {
      return hasInsertHandler 
        ? "text-amber-400 group-hover:text-amber-300" 
        : isCopied 
        ? "text-amber-400" 
        : "text-zinc-600 group-hover:text-zinc-400";
    }
    return hasInsertHandler 
      ? "text-emerald-400 group-hover:text-emerald-300" 
      : isCopied 
      ? "text-emerald-400" 
      : "text-zinc-600 group-hover:text-zinc-400";
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-1.5 rounded-md hover:bg-zinc-800/50 transition-colors group relative z-0"
      title={variable.description}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <code className={`text-xs font-mono ${getVariableColor()} px-1.5 py-0.5 rounded`}>
            {variable.key}
          </code>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{variable.description}</p>
        </div>
        <div className="shrink-0">
          {hasInsertHandler ? (
            <Plus className={`w-4 h-4 ${getIconColor()} transition-colors`} />
          ) : isCopied ? (
            <Check className={`w-4 h-4 ${getIconColor()}`} />
          ) : (
            <Copy className={`w-4 h-4 ${getIconColor()} transition-colors`} />
          )}
        </div>
      </div>
    </button>
  );
}
