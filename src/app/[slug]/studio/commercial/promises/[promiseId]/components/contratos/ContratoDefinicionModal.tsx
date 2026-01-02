'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { FileText, Loader2, Eye } from 'lucide-react';
import { getContractTemplates } from '@/lib/actions/studio/business/contracts/templates.actions';
import { actualizarContratoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { toast } from 'sonner';

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

interface ContratoDefinicionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  cotizacionId: string;
  eventTypeId: string | null;
  selectedTemplateId?: string | null;
  onSuccess?: () => void;
}

export function ContratoDefinicionModal({
  isOpen,
  onClose,
  studioSlug,
  cotizacionId,
  eventTypeId,
  selectedTemplateId,
  onSuccess,
}: ContratoDefinicionModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedId, setSelectedId] = useState(selectedTemplateId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSelectedId(selectedTemplateId || '');
    }
  }, [isOpen, selectedTemplateId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug, {
        eventTypeId: eventTypeId || undefined,
        isActive: true,
      });
      if (result.success && result.data) {
        setTemplates(result.data);
        
        // Si no hay template seleccionado, seleccionar el default
        if (!selectedTemplateId && result.data.length > 0) {
          const defaultTemplate = result.data.find(t => t.is_default) || result.data[0];
          setSelectedId(defaultTemplate.id);
        }
      } else {
        toast.error('Error al cargar plantillas de contrato');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar plantillas de contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedId) {
      toast.error('Selecciona una plantilla de contrato');
      return;
    }

    setSaving(true);
    try {
      const result = await actualizarContratoCierre(
        studioSlug,
        cotizacionId,
        selectedId
      );

      if (result.success) {
        const templateNombre = templates.find(t => t.id === selectedId)?.name;
        toast.success(`Plantilla de contrato definida: ${templateNombre}`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al guardar plantilla de contrato');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar plantilla de contrato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Definir Contrato"
      description="Selecciona la plantilla de contrato que se generará para este evento."
      maxWidth="md"
      onSave={handleConfirm}
      onCancel={onClose}
      saveLabel={saving ? 'Guardando...' : 'Guardar'}
      cancelLabel="Cancelar"
      isLoading={saving}
      zIndex={10080}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 mb-2">
            No hay plantillas de contrato disponibles
          </p>
          <p className="text-xs text-zinc-500">
            Crea una plantilla desde la configuración del estudio
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <label
              key={template.id}
              className={`
                block p-4 border rounded-lg cursor-pointer transition-all
                ${selectedId === template.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  checked={selectedId === template.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-1 h-4 w-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-white">
                      {template.name}
                    </span>
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
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </ZenDialog>
  );
}

