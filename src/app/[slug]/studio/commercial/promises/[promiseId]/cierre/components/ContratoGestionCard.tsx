'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import { ZenButton, ZenDialog } from '@/components/ui/zen';
import { FileText, Eye, Edit2, Trash2, Loader2, Settings, GitBranch, RefreshCw } from 'lucide-react';
import { ContractTemplateSimpleSelectorModal } from './contratos/ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from './contratos/ContractPreviewForPromiseModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { updateContractTemplate, getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { actualizarContratoCierre, regenerarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { ContractCierreVersionsModal } from './ContractCierreVersionsModal';
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
  contractContent?: string | null; // Contenido del contrato desde el padre
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
  onSuccess?: () => Promise<void> | void;
  showOptionsModal?: boolean;
  onCloseOptionsModal?: () => void;
  isContractSigned?: boolean; // Indica si el contrato ya fue firmado
}

export const ContratoGestionCard = memo(function ContratoGestionCard({
  studioSlug,
  promiseId,
  isContractSigned = false,
  cotizacionId,
  eventTypeId,
  selectedTemplateId,
  contractContent,
  condicionesComerciales,
  promiseData,
  onSuccess,
  showOptionsModal: externalShowOptionsModal,
  onCloseOptionsModal,
}: ContratoGestionCardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [showContractEditor, setShowContractEditor] = useState(false);
  const [hasViewedPreview, setHasViewedPreview] = useState(false);
  const [isContractCustomized, setIsContractCustomized] = useState(false);
  const [customizedContent, setCustomizedContent] = useState<string | null>(null);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Cargar plantilla si ya está seleccionada
  useEffect(() => {
    if (selectedTemplateId) {
      // Si no hay plantilla cargada o la plantilla cargada es diferente, cargar
      if (!selectedTemplate || selectedTemplate.id !== selectedTemplateId) {
        loadTemplate(selectedTemplateId);
      }
    } else if (!selectedTemplateId && selectedTemplate) {
      // Si se perdió el selectedTemplateId pero hay plantilla cargada, mantenerla
      // No limpiar la plantilla para evitar pérdida de estado durante actualizaciones
    }
  }, [selectedTemplateId]);

  // Sincronizar customizedContent con contractContent del padre
  // ✅ CORRECCIÓN: Solo usar contractContent si es diferente de la plantilla (personalizado)
  useEffect(() => {
    if (contractContent !== undefined && selectedTemplate) {
      // Si hay contenido desde el padre y es diferente a la plantilla, es personalizado
      if (contractContent !== null && contractContent !== selectedTemplate.content) {
        setCustomizedContent(contractContent);
        setIsContractCustomized(true);
      } else if (contractContent === null || contractContent === selectedTemplate.content) {
        // Si el contenido es null o igual a la plantilla, no está personalizado
        setCustomizedContent(null);
        setIsContractCustomized(false);
      }
    } else if (contractContent === null && customizedContent !== null && !selectedTemplateId) {
      // Solo limpiar si realmente no hay template seleccionado
      setCustomizedContent(null);
      setIsContractCustomized(false);
    }
  }, [contractContent, selectedTemplate]);


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
    onCloseOptionsModal?.();
    setShowContractPreview(false);
    setShowContractEditor(true);
  };

  const handleManageTemplates = () => {
    onCloseOptionsModal?.();
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

  const handleSaveCustomContract = async (data: { content: string }) => {
    const content = typeof data === 'string' ? data : data.content;
    setShowContractEditor(false);
    
    // Guardar contenido personalizado en studio_cotizaciones_cierre
    const result = await actualizarContratoCierre(
      studioSlug,
      cotizacionId,
      selectedTemplate!.id,
      content
    );

    if (result.success) {
      // Actualizar estado local después de guardar exitosamente
      setCustomizedContent(content);
      setIsContractCustomized(true);
      
      toast.success('Contrato personalizado guardado');
      
      // Notificar al padre para que actualice su estado local y esperar a que termine
      // El padre actualizará contractContent y luego se sincronizará aquí
      if (onSuccess) {
        const successResult = onSuccess();
        // Si onSuccess retorna una promesa, esperar a que termine
        if (successResult instanceof Promise) {
          await successResult;
        }
      }
      
      // Esperar un momento adicional para asegurar que el estado del padre se haya actualizado
      // Esto asegura que el preview use el contenido actualizado desde el padre
      setTimeout(() => {
        setShowContractPreview(true);
      }, 200);
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

  const handleRegenerarContrato = async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerarContratoCierre(studioSlug, cotizacionId, promiseId);
      
      if (result.success) {
        toast.success('Contrato regenerado con los datos actualizados');
        onCloseOptionsModal?.();
        
        // Actualizar estado local y notificar al padre
        if (onSuccess) {
          const successResult = onSuccess();
          if (successResult instanceof Promise) {
            await successResult;
          }
        }
        
        // Abrir preview del contrato regenerado
        setTimeout(() => {
          setShowContractPreview(true);
        }, 200);
      } else {
        toast.error(result.error || 'Error al regenerar contrato');
      }
    } catch (error) {
      console.error('[handleRegenerarContrato] Error:', error);
      toast.error('Error al regenerar contrato');
    } finally {
      setIsRegenerating(false);
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
          customContent={contractContent || customizedContent}
          condicionesComerciales={condicionesComerciales}
          isContractSigned={isContractSigned}
        />
      )}

      {/* Modal Editor de Contrato (Personalizar para cliente) */}
      {selectedTemplate && (
        <ContractEditorModal
          isOpen={showContractEditor}
          onClose={() => setShowContractEditor(false)}
          initialContent={customizedContent || selectedTemplate?.content || ''}
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
          isOpen={externalShowOptionsModal || false}
          onClose={() => onCloseOptionsModal?.()}
          title="Opciones de Contrato"
          maxWidth="sm"
          onCancel={() => onCloseOptionsModal?.()}
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
              onClick={handleRegenerarContrato}
              disabled={isRegenerating}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 text-purple-500 shrink-0 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 text-purple-500 shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium text-white">Regenerar contrato</div>
                <div className="text-xs text-zinc-400">Volver a generar con los datos actualizados de la cotización y contacto</div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowTemplateSelector(true);
                onCloseOptionsModal?.();
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
                setShowVersionsModal(true);
                onCloseOptionsModal?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left"
            >
              <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Ver historial de versiones</div>
                <div className="text-xs text-zinc-400">Revisa todas las versiones del contrato</div>
              </div>
            </button>

            <button
              onClick={() => {
                handleRemoveTemplate();
                onCloseOptionsModal?.();
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
        zIndex={10080} // ✅ Mayor que el modal de opciones (10070) para aparecer encima
      />

      {/* Modal de Historial de Versiones */}
      <ContractCierreVersionsModal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        studioSlug={studioSlug}
        cotizacionId={cotizacionId}
        promiseId={promiseId}
        promiseData={promiseData}
      />

    </>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian estas props específicas
  // Ignorar onSuccess y onCloseOptionsModal ya que son funciones memoizadas
  return (
    prevProps.studioSlug === nextProps.studioSlug &&
    prevProps.promiseId === nextProps.promiseId &&
    prevProps.cotizacionId === nextProps.cotizacionId &&
    prevProps.eventTypeId === nextProps.eventTypeId &&
    prevProps.selectedTemplateId === nextProps.selectedTemplateId &&
    prevProps.contractContent === nextProps.contractContent &&
    prevProps.showOptionsModal === nextProps.showOptionsModal &&
    JSON.stringify(prevProps.condicionesComerciales) === JSON.stringify(nextProps.condicionesComerciales) &&
    JSON.stringify(prevProps.promiseData) === JSON.stringify(nextProps.promiseData)
    // onSuccess y onCloseOptionsModal se ignoran porque son funciones memoizadas
  );
});

