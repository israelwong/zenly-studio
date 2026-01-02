'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ZenButton, ZenDialog } from '@/components/ui/zen';
import { FileText, Eye, Edit2, Trash2, Loader2, Settings } from 'lucide-react';
import { ContractTemplateSimpleSelectorModal } from './ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from './ContractPreviewForPromiseModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { updateContractTemplate, getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { actualizarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  advance_percentage?: number | null;
  discount_percentage?: number | null;
  advance_type?: string;
  advance_amount?: number | null;
}

interface ContratoGestionCardProps {
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
  eventTypeId: string | null;
  selectedTemplateId?: string | null;
  condicionesComerciales?: CondicionComercial | null;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
  };
  onSuccess?: () => void;
  onOpenDropdown?: () => void;
}

export function ContratoGestionCard({
  studioSlug,
  promiseId,
  cotizacionId,
  eventTypeId,
  selectedTemplateId,
  condicionesComerciales,
  promiseData,
  onSuccess,
  onOpenDropdown,
}: ContratoGestionCardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [showContractEditor, setShowContractEditor] = useState(false);
  const [hasViewedPreview, setHasViewedPreview] = useState(false);
  const [isContractCustomized, setIsContractCustomized] = useState(false);
  const [customizedContent, setCustomizedContent] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Cargar plantilla si ya está seleccionada
  useEffect(() => {
    if (selectedTemplateId && !selectedTemplate) {
      loadTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  // Exponer función para abrir modal desde el padre
  useEffect(() => {
    // Guardar referencia a la función
    (window as any).__openContratoDropdown = () => {
      setShowOptionsModal(true);
    };
    return () => {
      delete (window as any).__openContratoDropdown;
    };
  }, []);

  const loadTemplate = async (templateId: string) => {
    setLoadingTemplate(true);
    try {
      const result = await getContractTemplate(studioSlug, templateId);
      if (result.success && result.data) {
        setSelectedTemplate(result.data);
      }
    } catch (error) {
      console.error('[loadTemplate] Error:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleTemplateSelected = async (template: ContractTemplate) => {
    setSelectedTemplate(template);
    
    // Guardar en studio_cotizaciones_cierre
    const result = await actualizarContratoCierre(
      studioSlug,
      cotizacionId,
      template.id
    );

    if (result.success) {
      toast.success('Plantilla de contrato seleccionada');
      onSuccess?.();
      
      // Abrir preview
      setShowContractPreview(true);
      setTimeout(() => {
        setShowTemplateSelector(false);
      }, 150);
    } else {
      toast.error(result.error || 'Error al guardar plantilla');
    }
  };

  const handlePreviewConfirm = () => {
    setShowContractPreview(false);
    setHasViewedPreview(true);
  };

  const handleEditContract = () => {
    setShowOptionsModal(false);
    setShowContractPreview(false);
    setShowContractEditor(true);
  };

  const handleManageTemplates = () => {
    setShowOptionsModal(false);
    setShowManagerModal(true);
  };

  const handleManagerModalClose = () => {
    setShowManagerModal(false);
    // Recargar plantilla si fue modificada
    if (selectedTemplate) {
      loadTemplate(selectedTemplate.id);
    }
    // Abrir automáticamente el selector de plantillas después de gestionar
    setTimeout(() => {
      setShowTemplateSelector(true);
    }, 150);
  };

  const handleSaveCustomContract = async (content: string) => {
    setCustomizedContent(content);
    setIsContractCustomized(true);
    setShowContractEditor(false);
    
    // Guardar contenido personalizado en studio_cotizaciones_cierre
    const result = await actualizarContratoCierre(
      studioSlug,
      cotizacionId,
      selectedTemplate!.id,
      content
    );

    if (result.success) {
      toast.success('Contrato personalizado guardado');
      onSuccess?.();
      
      // Volver a abrir preview con contenido actualizado
      setTimeout(() => {
        setShowContractPreview(true);
      }, 100);
    } else {
      toast.error(result.error || 'Error al guardar contrato personalizado');
    }
  };

  const handleOpenPreviewFromCard = () => {
    setShowContractPreview(true);
  };

  const handleRemoveTemplate = async () => {
    // Limpiar de studio_cotizaciones_cierre
    const result = await actualizarContratoCierre(
      studioSlug,
      cotizacionId,
      '', // ID vacío para limpiar
      null
    );

    if (result.success) {
      // Limpiar estado local
      setSelectedTemplate(null);
      setIsContractCustomized(false);
      setCustomizedContent(null);
      setHasViewedPreview(false);
      
      toast.success('Plantilla de contrato removida');
      onSuccess?.();
    } else {
      toast.error(result.error || 'Error al eliminar plantilla');
    }
  };


  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {selectedTemplate && (
        <div className="space-y-2">
          {/* Nombre de la plantilla con badges */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{selectedTemplate.name}</span>
            {selectedTemplate.is_default && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                Default
              </span>
            )}
            {isContractCustomized && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                Personalizado
              </span>
            )}
          </div>

          {/* Botón de preview si no lo ha visto */}
          {!hasViewedPreview && (
            <button
              onClick={handleOpenPreviewFromCard}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver preview del contrato</span>
            </button>
          )}
        </div>
      )}

      {/* Modal Selector de Plantilla */}
      <ContractTemplateSimpleSelectorModal
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelected}
        studioSlug={studioSlug}
        eventTypeId={eventTypeId}
      />

      {/* Modal Preview de Contrato */}
      {selectedTemplate && promiseData && (
        <ContractPreviewForPromiseModal
          isOpen={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          onConfirm={handlePreviewConfirm}
          onEdit={handleEditContract}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacionId}
          template={selectedTemplate}
          customContent={customizedContent}
          condicionesComerciales={condicionesComerciales}
        />
      )}

      {/* Modal Editor de Contrato (Personalizar para cliente) */}
      {selectedTemplate && (
        <ContractEditorModal
          isOpen={showContractEditor}
          onClose={() => setShowContractEditor(false)}
          initialContent={customizedContent || selectedTemplate.content}
          onSave={handleSaveCustomContract}
          title="Personalizar Contrato"
          description="Personaliza el contrato para este cliente. Los cambios solo aplicarán a esta promesa."
          saveLabel="Guardar y volver a preview"
          zIndex={10090}
        />
      )}

      {/* Modal de Opciones */}
      {selectedTemplate && (
        <ZenDialog
          isOpen={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          title="Opciones de Contrato"
          maxWidth="sm"
          onCancel={() => setShowOptionsModal(false)}
          cancelLabel="Cerrar"
          zIndex={10070}
        >
          <div className="space-y-2">
            <button
              onClick={() => {
                handleEditContract();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
            >
              <Edit2 className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Personalizar para este cliente</div>
                <div className="text-xs text-zinc-400">Únicamente se actualizará la información para este cliente</div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowTemplateSelector(true);
                setShowOptionsModal(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Seleccionar otra plantilla</div>
                <div className="text-xs text-zinc-400">Cambiar la plantilla asociada</div>
              </div>
            </button>

            <button
              onClick={handleManageTemplates}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Gestionar plantillas</div>
                <div className="text-xs text-zinc-400">Crear, editar o eliminar plantillas</div>
              </div>
            </button>

            <button
              onClick={() => {
                handleRemoveTemplate();
                setShowOptionsModal(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-700/50 hover:border-red-600 hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-400">Desasociar plantilla</div>
                <div className="text-xs text-red-400/70">Se eliminará la asociación de la plantilla para este cliente</div>
              </div>
            </button>
          </div>
        </ZenDialog>
      )}

      {/* Modal Gestor de Plantillas */}
      <ContractTemplateManagerModal
        isOpen={showManagerModal}
        onClose={handleManagerModalClose}
        studioSlug={studioSlug}
        eventTypeId={eventTypeId}
      />

    </>
  );
}

