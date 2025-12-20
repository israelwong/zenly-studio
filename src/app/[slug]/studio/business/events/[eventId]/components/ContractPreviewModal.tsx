'use client';

import React, { useState, useEffect } from 'react';
import { Edit, Eye, Code, Loader2 } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton } from '@/components/ui/zen';
import { ContractEditor, ContractPreview } from '@/components/ui/zen';
import { getEventContractData, renderContractContent } from '@/lib/actions/studio/business/contracts/renderer.actions';
import type { EventContractData } from '@/types/contracts';

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (content: string) => Promise<void>;
  studioSlug: string;
  eventId: string;
  templateContent: string;
  isLoading?: boolean;
}

export function ContractPreviewModal({
  isOpen,
  onClose,
  onGenerate,
  studioSlug,
  eventId,
  templateContent,
  isLoading = false,
}: ContractPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [editedContent, setEditedContent] = useState(templateContent);
  const [renderedContent, setRenderedContent] = useState('');
  const [eventData, setEventData] = useState<EventContractData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && templateContent) {
      setEditedContent(templateContent);
      loadEventData();
    }
  }, [isOpen, templateContent, studioSlug, eventId]);

  const loadEventData = async () => {
    setLoadingData(true);
    try {
      const dataResult = await getEventContractData(studioSlug, eventId);
      if (dataResult.success && dataResult.data) {
        setEventData(dataResult.data);

        const renderResult = await renderContractContent(templateContent, dataResult.data);
        if (renderResult.success && renderResult.data) {
          setRenderedContent(renderResult.data);
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowPreview(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowPreview(true);
    setEditedContent(templateContent);
    // Re-renderizar con contenido original
    if (eventData) {
      renderContractContent(templateContent, eventData).then((result) => {
        if (result.success && result.data) {
          setRenderedContent(result.data);
        }
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!eventData) return;

    setIsEditing(false);
    setShowPreview(true);

    // Re-renderizar con contenido editado
    const renderResult = await renderContractContent(editedContent, eventData);
    if (renderResult.success && renderResult.data) {
      setRenderedContent(renderResult.data);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(editedContent);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setShowPreview(true);
    setEditedContent(templateContent);
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Vista Previa del Contrato"
      description="Revisa y edita el contrato antes de generarlo"
      maxWidth="6xl"
      onCancel={handleClose}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <Code className="h-4 w-4 mr-2" />
                      Ver Código
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Vista Previa
                    </>
                  )}
                </ZenButton>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </ZenButton>
              </>
            )}
            {isEditing && (
              <>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  Guardar Cambios
                </ZenButton>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : isEditing ? (
          <ContractEditor
            content={editedContent}
            onChange={setEditedContent}
          />
        ) : showPreview ? (
          <div className="max-h-[60vh] overflow-y-auto">
            <ContractPreview
              content={renderedContent}
              eventData={eventData || undefined}
            />
          </div>
        ) : (
          <ContractEditor
            content={editedContent}
            onChange={() => { }}
            readonly
          />
        )}
      </div>

      {/* Footer con botón Generar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 mt-4">
        <ZenButton
          variant="default"
          onClick={handleGenerate}
          disabled={isGenerating || isLoading}
          loading={isGenerating || isLoading}
        >
          {isGenerating || isLoading ? 'Generando...' : 'Generar Contrato'}
        </ZenButton>
      </div>
    </ZenDialog>
  );
}
