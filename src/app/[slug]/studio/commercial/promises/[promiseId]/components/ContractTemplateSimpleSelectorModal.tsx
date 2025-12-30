'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { getContractTemplates } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractTemplateSimpleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ContractTemplate) => void;
  studioSlug: string;
  eventTypeId?: string;
  selectedTemplateId?: string | null;
}

export function ContractTemplateSimpleSelectorModal({
  isOpen,
  onClose,
  onSelect,
  studioSlug,
  eventTypeId,
  selectedTemplateId,
}: ContractTemplateSimpleSelectorModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedTemplateId || null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, studioSlug, eventTypeId]);

  useEffect(() => {
    setLocalSelectedId(selectedTemplateId || null);
  }, [selectedTemplateId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug, {
        isActive: true,
        ...(eventTypeId && { eventTypeId }),
      });

      if (result.success && result.data) {
        setTemplates(result.data);
        
        // Si hay plantilla default y no hay selección, seleccionarla automáticamente
        if (!localSelectedId && result.data.length > 0) {
          const defaultTemplate = result.data.find(t => t.is_default);
          if (defaultTemplate) {
            setLocalSelectedId(defaultTemplate.id);
          }
        }
      } else {
        toast.error(result.error || 'Error al cargar plantillas');
      }
    } catch (error) {
      console.error('[ContractTemplateSimpleSelectorModal] Error:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!localSelectedId) {
      toast.error('Selecciona una plantilla');
      return;
    }

    const selectedTemplate = templates.find(t => t.id === localSelectedId);
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      // No cerramos aquí, el padre manejará el cierre después del preview
    }
  };

  const handleClose = () => {
    setLocalSelectedId(selectedTemplateId || null);
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Seleccionar Plantilla de Contrato"
      description="Elige la plantilla que se usará para generar el contrato"
      maxWidth="lg"
      onSave={handleConfirm}
      onCancel={handleClose}
      saveLabel="Confirmar"
      cancelLabel="Cancelar"
      saveVariant="primary"
      zIndex={10070}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No hay plantillas disponibles</p>
          <p className="text-sm text-zinc-500">
            Crea plantillas de contrato en la sección de configuración
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setLocalSelectedId(template.id)}
              className={`w-full p-4 rounded-lg border transition-all text-left ${
                localSelectedId === template.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${localSelectedId === template.id ? 'text-emerald-500' : 'text-zinc-500'}`}>
                  {localSelectedId === template.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white">
                      {template.name}
                    </h4>
                    {template.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Default
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  {template.event_types && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {template.event_types.name}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ZenDialog>
  );
}

