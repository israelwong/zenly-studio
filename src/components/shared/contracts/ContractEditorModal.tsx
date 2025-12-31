"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Code } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton, ZenInput, ZenLabel, ZenSwitch } from "@/components/ui/zen";
import {
  ContractEditor,
  ContractEditorRef,
  type ContractVariable,
} from "@/app/[slug]/studio/config/contratos/components";
import { ContractVariables } from "@/components/ui/zen";
import { CONTRACT_VARIABLES } from "@/types/contracts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ContractEditorModalMode =
  | "create-template"
  | "edit-template"
  | "create-event-contract"
  | "edit-event-contract";

interface ContractEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ContractEditorModalMode;
  studioSlug: string;

  // Contenido
  initialContent?: string;
  templateContent?: string; // Para modo event-contract

  // Metadata (solo para templates)
  initialName?: string;
  initialDescription?: string;
  initialIsDefault?: boolean;

  // Evento (solo para event-contract)
  eventId?: string;

  // Callbacks
  onSave: (data: {
    content: string;
    name?: string;
    description?: string;
    is_default?: boolean;
  }) => Promise<void>;

  // UI
  title?: string;
  description?: string;
  saveLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  zIndex?: number;
}

export function ContractEditorModal({
  isOpen,
  onClose,
  mode,
  studioSlug,
  initialContent = "",
  templateContent,
  initialName = "",
  initialDescription = "",
  initialIsDefault = false,
  eventId,
  onSave,
  title,
  description,
  saveLabel,
  cancelLabel = "Cancelar",
  isLoading = false,
  zIndex = 10090,
}: ContractEditorModalProps) {
  const [content, setContent] = useState(initialContent || templateContent || "");
  const [name, setName] = useState(initialName);
  const [templateDescription, setTemplateDescription] = useState(initialDescription);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [loadingEventData, setLoadingEventData] = useState(false);
  const editorRef = useRef<ContractEditorRef>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Anular el overflow del ZenCardContent para que los scrolls funcionen en las columnas
  React.useEffect(() => {
    if (isOpen) {
      // Buscar el ZenCardContent padre usando un timeout para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        if (modalContentRef.current) {
          let parent = modalContentRef.current.parentElement;
          // Buscar el ZenCardContent (puede estar a varios niveles)
          while (parent && parent !== document.body) {
            const hasOverflow = window.getComputedStyle(parent).overflowY === 'auto' ||
              window.getComputedStyle(parent).overflowY === 'scroll';
            if (hasOverflow && parent.classList.toString().includes('flex')) {
              (parent as HTMLElement).style.overflow = 'hidden';
              break;
            }
            parent = parent.parentElement;
          }
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Ya no cargamos datos del evento para preview (solo mostramos variables)

  // Resetear estados cuando se abre/cierra o cuando cambian los props iniciales
  React.useEffect(() => {
    if (isOpen) {
      const newContent = initialContent || templateContent || "";
      console.log('[ContractEditorModal] Inicializando editor:', {
        mode,
        initialContentLength: initialContent?.length || 0,
        templateContentLength: templateContent?.length || 0,
        newContentLength: newContent.length,
        newContentPreview: newContent.substring(0, 200),
        hasFechaEvento: newContent.includes('@fecha_evento') || newContent.includes('fecha_evento'),
      });
      setContent(newContent);
      setName(initialName);
      setTemplateDescription(initialDescription);
      setIsDefault(initialIsDefault);

      // Si el editor ya está montado, forzar actualización del contenido
      // Usar un timeout más largo para asegurar que el DOM esté listo
      if (editorRef.current && newContent) {
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setContent(newContent);
          }
        }, 200);
      }
    }
  }, [
    isOpen,
    initialContent,
    templateContent,
    initialName,
    initialDescription,
    initialIsDefault,
    mode,
  ]);

  // Generar key única basada en el contenido inicial y el modo para forzar re-mount
  // Solo remontar cuando realmente cambia el contenido o el modo
  const editorKey = React.useMemo(() => {
    const currentContent = initialContent || templateContent || "";
    // Usar hash simple del contenido en lugar de Date.now() para evitar remontar innecesario
    const contentHash = currentContent.length > 0
      ? currentContent.substring(0, 50).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : 0;
    return `editor-${mode}-${isOpen}-${contentHash}-${initialName || 'new'}`;
  }, [mode, isOpen, initialContent, templateContent, initialName]);

  const handleVariableClick = useCallback(
    (variable: string) => {
      if (editorRef.current) {
        editorRef.current.insertVariableAtCursor(variable);
      }
    },
    []
  );

  const handleSave = async () => {
    // Obtener el contenido actual del editor directamente usando el método getContent
    let currentContent = content;
    if (editorRef.current && editorRef.current.getContent) {
      currentContent = editorRef.current.getContent();
    }

    console.log('[ContractEditorModal] Guardando:', {
      mode,
      contentLength: currentContent.length,
      contentPreview: currentContent.substring(0, 200),
      hasFechaEvento: currentContent.includes('@fecha_evento') || currentContent.includes('fecha_evento'),
      contentEnd: currentContent.substring(Math.max(0, currentContent.length - 200)),
    });

    const data: {
      content: string;
      name?: string;
      description?: string;
      is_default?: boolean;
    } = {
      content: currentContent,
    };

    if (mode === "create-template" || mode === "edit-template") {
      data.name = name;
      data.description = templateDescription;
      data.is_default = isDefault;
    }

    await onSave(data);
  };

  const variables: ContractVariable[] = CONTRACT_VARIABLES.map((v) => {
    let category: "cliente" | "evento" | "comercial" | "studio" | "bloque" = "studio";

    if (v.key.includes("cotizacion") || v.key.includes("condiciones") || v.key.includes("[")) {
      category = "bloque";
    } else if (
      v.key.includes("cliente") ||
      v.key.includes("email") ||
      v.key.includes("telefono")
    ) {
      category = "cliente";
    } else if (v.key.includes("evento") || v.key.includes("fecha") || v.key.includes("tipo")) {
      category = "evento";
    } else if (v.key.includes("total") || v.key.includes("pago")) {
      category = "comercial";
    }

    return {
      key: v.key,
      label: v.label,
      description: v.description,
      category,
      example: v.example,
    };
  });

  const getDefaultTitle = () => {
    switch (mode) {
      case "create-template":
        return "Nueva Plantilla de Contrato";
      case "edit-template":
        return "Editar Plantilla de Contrato";
      case "create-event-contract":
        return "Crear Contrato de Evento";
      case "edit-event-contract":
        return "Editar Contrato de Evento";
      default:
        return "Editor de Contrato";
    }
  };

  const getDefaultDescription = () => {
    switch (mode) {
      case "create-template":
        return "Crea una plantilla maestra para generar contratos";
      case "edit-template":
        return "Edita la plantilla de contrato";
      case "create-event-contract":
        return "Edita el contenido del contrato antes de generarlo";
      case "edit-event-contract":
        return "Edita el contrato del evento";
      default:
        return "";
    }
  };

  const getDefaultSaveLabel = () => {
    switch (mode) {
      case "create-template":
        return "Crear Plantilla";
      case "edit-template":
        return "Guardar Cambios";
      case "create-event-contract":
      case "edit-event-contract":
        return "Generar Contrato";
      default:
        return "Guardar";
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title || getDefaultTitle()}
      description={description || getDefaultDescription()}
      maxWidth="7xl"
      onSave={handleSave}
      onCancel={onClose}
      saveLabel={saveLabel || getDefaultSaveLabel()}
      cancelLabel={cancelLabel}
      isLoading={isLoading}
      closeOnClickOutside={false}
      zIndex={zIndex}
    >
      {/* Wrapper para anular el overflow del ZenCardContent y crear scrolls independientes */}
      <div
        ref={modalContentRef}
        className="flex h-full min-h-0 -m-6"
        style={{
          height: 'calc(90vh - 140px)',
          maxHeight: 'calc(90vh - 140px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Columna Izquierda: Editor con su propio scroll */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800 overflow-hidden h-full">
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto h-full relative pb-4" id="editor-scroll-container">
            <ContractEditor
              key={editorKey}
              ref={editorRef}
              content={content}
              onChange={setContent}
              variables={variables}
              showToolbar={true}
              className="h-full"
            />
          </div>
        </div>

        {/* Columna Derecha: Form + Variables con su propio scroll */}
        <div className="w-[400px] shrink-0 flex flex-col min-h-0 overflow-hidden bg-zinc-900/30 border-l border-zinc-800 h-full">
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto h-full">
            {/* Metadata para templates */}
            {(mode === "create-template" || mode === "edit-template") && (
              <div className="p-6 border-b border-zinc-800 space-y-4 shrink-0 bg-zinc-900/30">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Información de la Plantilla</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <ZenLabel htmlFor="modal-name">Nombre de la Plantilla *</ZenLabel>
                    <ZenInput
                      id="modal-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Contrato General"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <ZenLabel htmlFor="modal-description">Descripción</ZenLabel>
                    <ZenInput
                      id="modal-description"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Descripción breve de la plantilla"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Variables para event-contract (sin tabs, sin preview) */}
            {(mode === "create-event-contract" || mode === "edit-event-contract") ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="sticky top-0 z-10 p-6 pb-4 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 shrink-0">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-1">Variables Disponibles</h3>
                  <p className="text-xs text-zinc-500">Selecciona una variable para insertar en el editor</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 pt-4">
                    <ContractVariables showCard={false} onVariableClick={handleVariableClick} />
                  </div>
                </div>
              </div>
            ) : (
              /* Variables Panel con header sticky para templates */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="sticky top-0 z-10 p-6 pb-4 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 shrink-0">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-1">Variables Disponibles</h3>
                  <p className="text-xs text-zinc-500">Selecciona una variable para insertar en el editor</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 pt-4">
                    <ContractVariables showCard={false} onVariableClick={handleVariableClick} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}

