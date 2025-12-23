'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Edit, Loader2, CheckCircle2, Clock, Trash2, MoreVertical, Send, Info } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenBadge,
  ZenConfirmModal,
  ZenDialog,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import type { EventContract } from '@/types/contracts';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { ContractTemplateSelectorModal } from './ContractTemplateSelectorModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { EventContractViewModal } from './EventContractViewModal';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { getEventContract, generateEventContract, updateEventContract, deleteEventContract, publishEventContract } from '@/lib/actions/studio/business/contracts/contracts.actions';

interface EventContractCardProps {
  studioSlug: string;
  eventId: string;
  eventTypeId?: string;
  onContractUpdated?: () => void;
}

export function EventContractCard({
  studioSlug,
  eventId,
  eventTypeId,
  onContractUpdated,
}: EventContractCardProps) {
  const [contract, setContract] = useState<EventContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplateContent, setSelectedTemplateContent] = useState<string>('');

  useEffect(() => {
    loadContract();
  }, [eventId, studioSlug]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const result = await getEventContract(studioSlug, eventId);
      if (result.success && result.data) {
        setContract(result.data);
      } else {
        setContract(null);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    setShowTemplateModal(true);
  };

  const handleTemplateSelect = async (templateId: string) => {
    setShowTemplateModal(false);

    try {
      // Obtener contenido de la plantilla
      const templateResult = await getContractTemplate(studioSlug, templateId);

      if (templateResult.success && templateResult.data) {
        setSelectedTemplateContent(templateResult.data.content);
        setShowEditorModal(true);
      } else {
        toast.error(templateResult.error || 'Error al cargar plantilla');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar plantilla');
    }
  };

  const handleGenerateContract = async (data: {
    content: string;
    name?: string;
    description?: string;
    is_default?: boolean;
  }) => {
    setIsGenerating(true);
    try {
      if (isEditing && contract) {
        // Actualizar contrato existente
        const updateResult = await updateEventContract(studioSlug, contract.id, {
          content: data.content,
        });

        if (updateResult.success) {
          toast.success('Contrato actualizado correctamente');
          setShowEditorModal(false);
          setSelectedTemplateContent('');
          setIsEditing(false);
          await loadContract();
          onContractUpdated?.();
        } else {
          toast.error(updateResult.error || 'Error al actualizar contrato');
        }
      } else {
        // Generar nuevo contrato
        const result = await generateEventContract(studioSlug, {
          event_id: eventId,
        });

        if (result.success && result.data) {
          // Actualizar el contenido del contrato generado con el editado
          const updateResult = await updateEventContract(studioSlug, result.data.id, {
            content: data.content,
          });

          if (updateResult.success) {
            toast.success('Contrato generado correctamente');
            setShowEditorModal(false);
            setSelectedTemplateContent('');
            await loadContract();
            onContractUpdated?.();
          } else {
            toast.error(updateResult.error || 'Error al actualizar contrato');
          }
        } else {
          toast.error(result.error || 'Error al generar contrato');
        }
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error('Error al generar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewContract = () => {
    setShowViewModal(true);
  };

  const handleEditContract = () => {
    setShowViewModal(false);
    if (contract) {
      setSelectedTemplateContent(contract.content);
      setIsEditing(true);
      setShowEditorModal(true);
    }
  };

  const handleEditClick = () => {
    if (contract?.status === 'signed') {
      toast.error('Este contrato está firmado y no puede ser modificado');
      return;
    }
    setShowTemplateModal(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contract) return;

    setIsDeleting(true);
    try {
      const result = await deleteEventContract(studioSlug, contract.id);

      if (result.success) {
        toast.success('Contrato eliminado correctamente');
        setShowDeleteModal(false);
        await loadContract();
        onContractUpdated?.();
      } else {
        toast.error(result.error || 'Error al eliminar contrato');
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Error al eliminar contrato');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublishClick = () => {
    setShowPublishModal(true);
  };

  const handlePublishConfirm = async () => {
    if (!contract) return;

    setIsPublishing(true);
    try {
      const result = await publishEventContract(studioSlug, contract.id);

      if (result.success) {
        toast.success('Contrato publicado correctamente. El cliente ya puede verlo y firmarlo.');
        setShowPublishModal(false);
        await loadContract();
        onContractUpdated?.();
      } else {
        toast.error(result.error || 'Error al publicar contrato');
      }
    } catch (error) {
      console.error('Error publishing contract:', error);
      toast.error('Error al publicar contrato');
    } finally {
      setIsPublishing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <ZenBadge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Borrador
          </ZenBadge>
        );
      case 'published':
        return (
          <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <Eye className="h-2.5 w-2.5 mr-0.5" />
            Publicado
          </ZenBadge>
        );
      case 'signed':
        return (
          <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
            Firmado
          </ZenBadge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-4 w-16 bg-zinc-800 rounded" />
            <div className="h-6 w-16 bg-zinc-800 rounded" />
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="h-20 w-full bg-zinc-800 rounded animate-pulse" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Contrato
          </ZenCardTitle>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={contract ? handleViewContract : handleGenerateClick}
            disabled={isGenerating}
            className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
          >
            {contract ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Ver contrato
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Anexar
              </>
            )}
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {contract ? (
          <div className="space-y-3">
            <div
              className="p-3 bg-zinc-900 rounded border border-zinc-800 relative group hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 mb-1">
                    Contrato
                  </p>

                  {/* Estado en línea dedicada */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">Estado:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHelpModal(true);
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {getStatusBadge(contract.status)}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHelpModal(true);
                        }}
                        className="text-zinc-500 hover:text-zinc-400 transition-colors"
                        title="Información sobre estados"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Información compacta */}
                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Versión:</span>
                      <span className="text-zinc-300">{contract.version}</span>
                    </div>
                    {contract.created_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Creado:</span>
                        <span className="text-zinc-300">{formatDate(contract.created_at)}</span>
                      </div>
                    )}
                    {contract.signed_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Firmado:</span>
                        <span className="text-zinc-300">{formatDate(contract.signed_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Botón Publicar visible cuando es draft */}
                  {contract.status === 'draft' && (
                    <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
                      <ZenButton
                        variant="ghost"
                        onClick={handlePublishClick}
                        className="bg-transparent focus-visible:ring-zinc-500/50 px-3 py-1.5 h-8 rounded-md w-full gap-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                      >
                        <Send className="h-4 w-4" />
                        Publicar para revisión del cliente
                      </ZenButton>
                    </div>
                  )}
                </div>

                {/* Menú dropdown */}
                <div className="absolute top-2 right-2">
                  <ZenDropdownMenu>
                    <ZenDropdownMenuTrigger asChild>
                      <ZenButton
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </ZenButton>
                    </ZenDropdownMenuTrigger>
                    <ZenDropdownMenuContent align="end">
                      {contract.status === 'draft' && (
                        <>
                          <ZenDropdownMenuItem onClick={handleEditClick}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </ZenDropdownMenuItem>
                          <ZenDropdownMenuSeparator />
                          <ZenDropdownMenuItem onClick={handlePublishClick}>
                            <Send className="mr-2 h-4 w-4" />
                            Publicar
                          </ZenDropdownMenuItem>
                          <ZenDropdownMenuSeparator />
                          <ZenDropdownMenuItem
                            onClick={handleDeleteClick}
                            className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </ZenDropdownMenuItem>
                        </>
                      )}
                      {contract.status === 'published' && (
                        <>
                          <ZenDropdownMenuItem onClick={handleEditClick}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </ZenDropdownMenuItem>
                          <ZenDropdownMenuSeparator />
                          <ZenDropdownMenuItem
                            onClick={handleDeleteClick}
                            className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </ZenDropdownMenuItem>
                        </>
                      )}
                      {contract.status === 'signed' && (
                        <ZenDropdownMenuItem disabled className="text-zinc-500 cursor-not-allowed">
                          <FileText className="mr-2 h-4 w-4" />
                          Contrato firmado (solo lectura)
                        </ZenDropdownMenuItem>
                      )}
                    </ZenDropdownMenuContent>
                  </ZenDropdownMenu>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-500">
              No hay contrato generado para este evento
            </p>
          </div>
        )}
      </ZenCardContent>

      <ContractTemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={async () => {
          setShowTemplateModal(false);
          await loadContract();
          onContractUpdated?.();
        }}
        onSelect={handleTemplateSelect}
        studioSlug={studioSlug}
        eventId={eventId}
        eventTypeId={eventTypeId}
        isLoading={false}
      />

      <ContractEditorModal
        isOpen={showEditorModal}
        onClose={() => {
          setShowEditorModal(false);
          setSelectedTemplateContent('');
          setIsEditing(false);
        }}
        mode={isEditing ? "edit-event-contract" : "create-event-contract"}
        studioSlug={studioSlug}
        eventId={eventId}
        initialContent={isEditing ? contract?.content : undefined}
        templateContent={!isEditing ? selectedTemplateContent : undefined}
        onSave={handleGenerateContract}
        isLoading={isGenerating}
      />

      {contract && (
        <>
          <EventContractViewModal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            onContractUpdated={async () => {
              await loadContract();
              onContractUpdated?.();
            }}
            studioSlug={studioSlug}
            eventId={eventId}
            contract={contract}
          />

          <ZenConfirmModal
            isOpen={showDeleteModal}
            onClose={() => {
              if (!isDeleting) {
                setShowDeleteModal(false);
              }
            }}
            onConfirm={handleDeleteConfirm}
            title="Eliminar Contrato"
            description="¿Estás seguro de eliminar este contrato? Esta acción no se puede deshacer."
            confirmText="Eliminar"
            cancelText="Cancelar"
            variant="destructive"
            loading={isDeleting}
          />

          <ZenConfirmModal
            isOpen={showPublishModal}
            onClose={() => {
              if (!isPublishing) {
                setShowPublishModal(false);
              }
            }}
            onConfirm={handlePublishConfirm}
            title="Publicar Contrato"
            description={
              <div className="space-y-2 text-sm">
                <p>Una vez publicado, el cliente podrá visualizar el contrato en su portal para autorizarlo.</p>
                <p className="text-amber-400 font-medium">
                  ⚠️ Una vez autorizado (firmado), el contrato no podrá ser eliminado ni editado, ya que se convierte en un documento legal.
                </p>
                <p>¿Deseas continuar con la publicación?</p>
              </div>
            }
            confirmText="Sí, publicar"
            cancelText="Cancelar"
            loading={isPublishing}
          />

          <ZenDialog
            isOpen={showHelpModal}
            onClose={() => setShowHelpModal(false)}
            title="Estados del Contrato"
            description="Información sobre los diferentes estados y sus significados"
            maxWidth="md"
            onCancel={() => setShowHelpModal(false)}
            cancelLabel="Cerrar"
          >
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-start gap-3">
                  <ZenBadge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-950/20 rounded-full text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    Borrador
                  </ZenBadge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200 mb-1">Borrador</p>
                    <p className="text-xs text-zinc-400">
                      El contrato está en borrador y solo es visible para el estudio. Puede editarse, regenerarse o eliminarse antes de ser publicado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-start gap-3">
                  <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20 rounded-full text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5">
                    <Eye className="h-2.5 w-2.5 mr-0.5" />
                    Publicado
                  </ZenBadge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200 mb-1">Publicado</p>
                    <p className="text-xs text-zinc-400">
                      El contrato ha sido publicado y es visible para el cliente en su portal. El cliente puede revisarlo y firmarlo. Si necesitas hacer cambios, puedes editarlo (esto creará una nueva versión en borrador).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-start gap-3">
                  <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20 rounded-full text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                    Firmado
                  </ZenBadge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200 mb-1">Firmado</p>
                    <p className="text-xs text-zinc-400">
                      El contrato ha sido firmado por el cliente. Es un documento legal y no puede ser modificado ni eliminado. Solo puedes verlo y descargarlo como PDF.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ZenDialog>
        </>
      )}
    </ZenCard>
  );
}
