'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenTabs, ZenTab } from '@/components/ui/zen';
import { ContractTemplateForm } from './ContractTemplateForm';
import { ContractTemplateList } from './ContractTemplateList';
import { getContractTemplates, createContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import { toast } from 'sonner';

interface ContractTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (templateId: string) => void;
  studioSlug: string;
  eventTypeId?: string;
  initialTab?: 'select' | 'create';
}

export function ContractTemplateManagerModal({
  isOpen,
  onClose,
  onSelect,
  studioSlug,
  eventTypeId,
  initialTab = 'select',
}: ContractTemplateManagerModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'select' | 'create'>(initialTab);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setActiveTab(initialTab);
    }
  }, [isOpen, studioSlug, eventTypeId, initialTab]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug, {
        isActive: true,
        ...(eventTypeId && { eventTypeId }),
      });

      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        toast.error(result.error || 'Error al cargar plantillas');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Parameters<typeof createContractTemplate>[1]) => {
    setIsCreating(true);
    try {
      const result = await createContractTemplate(studioSlug, data);

      if (result.success && result.data) {
        toast.success('Plantilla creada correctamente');
        await loadTemplates();

        // Si hay callback onSelect, seleccionar automáticamente y cerrar
        if (onSelect && result.data.id) {
          onSelect(result.data.id);
          onClose();
        } else {
          // Cambiar a tab de selección y seleccionar la nueva plantilla
          setActiveTab('select');
          setSelectedTemplateId(result.data.id);
        }
      } else {
        toast.error(result.error || 'Error al crear plantilla');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error al crear plantilla');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = () => {
    if (selectedTemplateId && onSelect) {
      onSelect(selectedTemplateId);
      onClose();
    }
  };

  const handleManageComplete = () => {
    router.push(`/${studioSlug}/studio/contratos/nuevo`);
    onClose();
  };

  const handleClose = () => {
    setSelectedTemplateId(null);
    setActiveTab('select');
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Gestionar Plantillas de Contrato"
      description={
        activeTab === 'select'
          ? 'Selecciona una plantilla o crea una nueva'
          : 'Crea una plantilla rápida o gestiona plantillas completas'
      }
      maxWidth="4xl"
      onCancel={handleClose}
      cancelLabel="Cerrar"
      closeOnClickOutside={false}
    >
      <div className="space-y-4">
        {/* Tabs */}
        <ZenTabs
          tabs={[
            { id: 'select', label: 'Seleccionar' },
            { id: 'create', label: 'Crear Rápida' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'select' | 'create')}
        />

        {/* Content */}
        {activeTab === 'select' ? (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <>
                <ContractTemplateList
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelect={setSelectedTemplateId}
                />
                {templates.length > 0 && onSelect && selectedTemplateId && (
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800 mt-4">
                    <ZenButton
                      variant="default"
                      onClick={handleSelect}
                    >
                      Usar esta plantilla
                    </ZenButton>
                  </div>
                )}
                {templates.length === 0 && (
                  <div className="pt-4 border-t border-zinc-800 mt-4">
                    <ZenButton
                      variant="default"
                      onClick={() => setActiveTab('create')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Plantilla
                    </ZenButton>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <ContractTemplateForm
              mode="modal"
              onSave={handleCreate}
              onCancel={() => setActiveTab('select')}
              onManageComplete={handleManageComplete}
              simplified={true}
              isLoading={isCreating}
            />
          </div>
        )}
      </div>
    </ZenDialog>
  );
}
