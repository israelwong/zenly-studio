'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Plus, Edit, Save, RefreshCw, Loader2, Eye, Code, Download } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenConfirmModal,
  ContractEditor,
  ContractPreview,
} from '@/components/ui/zen';
import {
  getEventContract,
  generateEventContract,
  updateEventContract,
  regenerateEventContract,
  getEventContractData,
  renderContractContent,
} from '@/lib/actions/studio/business/contracts';
import type { EventContract, EventContractData } from '@/types/contracts';
import { toast } from 'sonner';
import { generatePDF, generateContractFilename } from '@/lib/utils/pdf-generator';

export default function EventoContratoPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;

  const [contract, setContract] = useState<EventContract | null>(null);
  const [eventData, setEventData] = useState<EventContractData | null>(null);
  const [renderedContent, setRenderedContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showUpdateTemplateModal, setShowUpdateTemplateModal] = useState(false);
  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    loadContract();
  }, [eventId]);

  const loadContract = async () => {
    setLoading(true);
    try {
      // Intentar cargar contrato existente
      const contractResult = await getEventContract(studioSlug, eventId);

      if (contractResult.success && contractResult.data) {
        setContract(contractResult.data);
        setEditedContent(contractResult.data.content);
        
        // Cargar datos del evento para el preview
        const dataResult = await getEventContractData(studioSlug, eventId);
        if (dataResult.success && dataResult.data) {
          setEventData(dataResult.data);
          
          // Renderizar contenido
          const renderResult = await renderContractContent(
            contractResult.data.content,
            dataResult.data
          );
          if (renderResult.success && renderResult.data) {
            setRenderedContent(renderResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateEventContract(studioSlug, {
        event_id: eventId,
      });

      if (result.success) {
        toast.success('Contrato generado correctamente');
        loadContract();
      } else {
        toast.error(result.error || 'Error al generar contrato');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error('Error al generar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!contract) return;

    // Si hay cambios, mostrar modal para preguntar si actualizar plantilla
    if (contract.template_id) {
      setShowUpdateTemplateModal(true);
    } else {
      await saveContract(false);
    }
  };

  const saveContract = async (shouldUpdateTemplate: boolean) => {
    if (!contract) return;

    setIsSaving(true);
    try {
      const result = await updateEventContract(
        studioSlug,
        contract.id,
        {
          content: editedContent,
          update_template: shouldUpdateTemplate,
        }
      );

      if (result.success) {
        toast.success(
          shouldUpdateTemplate
            ? 'Contrato y plantilla actualizados'
            : 'Contrato actualizado correctamente'
        );
        setIsEditing(false);
        setShowUpdateTemplateModal(false);
        loadContract();
      } else {
        toast.error(result.error || 'Error al actualizar contrato');
      }
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Error al actualizar contrato');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateEventContract(studioSlug, eventId);

      if (result.success) {
        toast.success('Contrato regenerado con datos actualizados');
        loadContract();
      } else {
        toast.error(result.error || 'Error al regenerar contrato');
      }
    } catch (error) {
      console.error('Error regenerating contract:', error);
      toast.error('Error al regenerar contrato');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!eventData) {
      toast.error('No hay datos del evento disponibles');
      return;
    }

    setIsExportingPDF(true);
    try {
      const filename = generateContractFilename(
        eventData.nombre_evento,
        eventData.nombre_cliente
      );

      await generatePDF(renderedContent, {
        filename,
        margin: 0.75,
      });

      toast.success('Contrato exportado a PDF correctamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>Contrato del Evento</ZenCardTitle>
                <ZenCardDescription>Cargando...</ZenCardDescription>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  // Si no hay contrato, mostrar pantalla de generar
  if (!contract) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </ZenButton>
                <div>
                  <ZenCardTitle>Contrato del Evento</ZenCardTitle>
                  <ZenCardDescription>
                    No hay contrato generado para este evento
                  </ZenCardDescription>
                </div>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                No hay contrato generado
              </h3>
              <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                Genera el contrato para este evento usando la plantilla por defecto. Podrás editarlo después de generarlo.
              </p>
              <ZenButton
                variant="default"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando contrato...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generar Contrato
                  </>
                )}
              </ZenButton>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  // Vista del contrato existente
  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventId}`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>Contrato del Evento</ZenCardTitle>
                <ZenCardDescription>
                  Versión {contract.version} • Estado: {contract.status === 'draft' ? 'Borrador' : contract.status === 'published' ? 'Publicado' : 'Firmado'}
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? <Code className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showPreview ? 'Ver Código' : 'Vista Previa'}
                  </ZenButton>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                  >
                    {isExportingPDF ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Descargar PDF
                  </ZenButton>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerar
                  </ZenButton>
                  <ZenButton
                    variant="default"
                    size="sm"
                    onClick={() => setIsEditing(true)}
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
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(contract.content);
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </ZenButton>
                  <ZenButton
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar
                  </ZenButton>
                </>
              )}
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          {isEditing ? (
            <ContractEditor
              content={editedContent}
              onChange={setEditedContent}
            />
          ) : showPreview ? (
            <ContractPreview
              content={renderedContent}
              eventData={eventData || undefined}
            />
          ) : (
            <ContractEditor
              content={contract.content}
              onChange={() => {}}
              readonly
            />
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal: Actualizar plantilla maestra */}
      <ZenConfirmModal
        isOpen={showUpdateTemplateModal}
        onClose={() => {
          if (!isSaving) {
            setShowUpdateTemplateModal(false);
            setUpdateTemplate(false);
          }
        }}
        onConfirm={() => saveContract(updateTemplate)}
        title="Guardar Cambios"
        description={
          <div className="space-y-4">
            <p>¿Cómo deseas guardar los cambios realizados?</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
                <input
                  type="radio"
                  name="update-option"
                  checked={!updateTemplate}
                  onChange={() => setUpdateTemplate(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-zinc-200">Solo este contrato</p>
                  <p className="text-sm text-zinc-500">
                    Los cambios solo se aplicarán a este evento
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
                <input
                  type="radio"
                  name="update-option"
                  checked={updateTemplate}
                  onChange={() => setUpdateTemplate(true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-zinc-200">Actualizar plantilla maestra</p>
                  <p className="text-sm text-zinc-500">
                    Los cambios se aplicarán también a la plantilla para futuros contratos
                  </p>
                </div>
              </label>
            </div>
          </div>
        }
        confirmText="Guardar"
        cancelText="Cancelar"
        variant="default"
        loading={isSaving}
      />
    </div>
  );
}
