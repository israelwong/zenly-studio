'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Eye, Edit, Loader2, CheckCircle2, Clock, Trash2, MoreVertical, Send, Info, X, GitBranch } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createRealtimeChannel, subscribeToChannel, setupRealtimeAuth } from '@/lib/realtime/core';
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
  ZenInput,
  ZenTextarea,
} from '@/components/ui/zen';
import type { EventContract } from '@/types/contracts';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { ContractTemplateSelectorModal } from './ContractTemplateSelectorModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { EventContractViewModal } from './EventContractViewModal';
import { ContractVersionsModal } from './ContractVersionsModal';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { getEventContract, getAllEventContracts, generateEventContract, updateEventContract, deleteEventContract, publishEventContract, requestContractCancellationByStudio, confirmContractCancellationByStudio, rejectContractCancellationByStudio, getContractCancellationLogs, getContractVersions } from '@/lib/actions/studio/business/contracts/contracts.actions';

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
  const [allContracts, setAllContracts] = useState<EventContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showCancellationConfirmModal, setShowCancellationConfirmModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedTemplateContent, setSelectedTemplateContent] = useState<string>('');
  const supabase = createClient();
  const contractsChannelRef = useRef<any>(null);

  useEffect(() => {
    loadContract();
  }, [eventId, studioSlug]);

  // Configurar realtime para escuchar cambios en contratos
  useEffect(() => {
    if (!studioSlug || !contract?.id) return;

    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          return;
        }

        const contractsChannel = createRealtimeChannel(supabase, {
          channelName: `studio:${studioSlug}:contracts`,
          isPrivate: false,
          requiresAuth: false,
          self: true,
          ack: true,
        });

        contractsChannel
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const contractNew = p.record || p.new || p.payload?.record || p.payload?.new;

            // Verificar si es el contrato del evento actual
            if (contractNew && contractNew.id === contract.id) {
              // Recargar contrato para obtener la versión actualizada
              loadContract();
              onContractUpdated?.();
            }
          })
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'UPDATE') {
              const contractNew = p.record || p.new || p.payload?.record || p.payload?.new;
              if (contractNew && contractNew.id === contract.id) {
                loadContract();
                onContractUpdated?.();
              }
            }
          });

        await subscribeToChannel(contractsChannel);
        contractsChannelRef.current = contractsChannel;
      } catch (error) {
        console.error('[EventContractCard] Error configurando realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (contractsChannelRef.current) {
        supabase.removeChannel(contractsChannelRef.current);
        contractsChannelRef.current = null;
      }
    };
  }, [studioSlug, contract?.id, supabase, onContractUpdated]);


  const loadContract = async () => {
    setLoading(true);
    try {
      // Cargar todos los contratos (activos y cancelados)
      const allResult = await getAllEventContracts(studioSlug, eventId);
      if (allResult.success && allResult.data) {
        setAllContracts(allResult.data);
        // El contrato activo es el primero (no cancelado) o null
        const activeContract = allResult.data.find(c => c.status !== 'CANCELLED') || null;
        setContract(activeContract);
      } else {
        setAllContracts([]);
        setContract(null);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      setAllContracts([]);
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

  const handleEditContent = async () => {
    if (contract?.status === 'SIGNED' || contract?.status === 'CANCELLED') {
      toast.error('Este contrato está firmado o cancelado y no puede ser modificado');
      return;
    }
    if (contract) {
      // Si no tiene plantilla, mostrar error
      if (!contract.template_id) {
        toast.error('Este contrato no tiene una plantilla asociada. No se puede editar el contenido.');
        return;
      }

      // Prioridad: usar contenido personalizado editado si existe, sino usar la plantilla original
      let contentToEdit: string | null = null;

      if (contract.custom_template_content) {
        // Usar el contenido personalizado editado (con variables)
        contentToEdit = contract.custom_template_content;
      } else {
        // Cargar la plantilla original asociada
        try {
          const templateResult = await getContractTemplate(studioSlug, contract.template_id);
          if (templateResult.success && templateResult.data) {
            contentToEdit = templateResult.data.content;
          } else {
            toast.error(templateResult.error || 'Error al cargar la plantilla del contrato');
            return;
          }
        } catch (error) {
          console.error('Error loading template:', error);
          toast.error('Error al cargar la plantilla del contrato');
          return;
        }
      }

      if (contentToEdit) {
        setSelectedTemplateContent(contentToEdit);
        setIsEditing(true);
        setShowEditorModal(true);
      }
    }
  };

  const handleChangeTemplate = () => {
    if (contract?.status === 'SIGNED' || contract?.status === 'CANCELLED') {
      toast.error('Este contrato está firmado o cancelado y no puede ser modificado');
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

  const handleRequestCancellation = () => {
    if (!contract || contract.status !== 'SIGNED') {
      toast.error('Solo se puede solicitar cancelación de contratos firmados');
      return;
    }
    setCancellationReason('');
    setShowCancellationModal(true);
  };

  const handleCancellationConfirm = async () => {
    if (!contract || !cancellationReason.trim() || cancellationReason.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setIsCancelling(true);
    try {
      const result = await requestContractCancellationByStudio(studioSlug, contract.id, {
        reason: cancellationReason.trim(),
      });

      if (result.success) {
        toast.success('Solicitud de cancelación enviada al cliente');
        setShowCancellationModal(false);
        setCancellationReason('');
        await loadContract();
        onContractUpdated?.();
      } else {
        toast.error(result.error || 'Error al solicitar cancelación');
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast.error('Error al solicitar cancelación');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!contract) return;

    setIsCancelling(true);
    try {
      const result = await confirmContractCancellationByStudio(studioSlug, contract.id);

      if (result.success) {
        toast.success('Contrato cancelado correctamente');
        setShowCancellationConfirmModal(false);
        await loadContract();
        onContractUpdated?.();
      } else {
        toast.error(result.error || 'Error al confirmar cancelación');
      }
    } catch (error) {
      console.error('Error confirming cancellation:', error);
      toast.error('Error al confirmar cancelación');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!contract) return;

    setIsCancelling(true);
    try {
      const result = await rejectContractCancellationByStudio(studioSlug, contract.id);

      if (result.success) {
        toast.success('Solicitud de cancelación rechazada');
        await loadContract();
        onContractUpdated?.();
      } else {
        toast.error(result.error || 'Error al rechazar cancelación');
      }
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast.error('Error al rechazar cancelación');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <ZenBadge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Borrador
          </ZenBadge>
        );
      case 'PUBLISHED':
        return (
          <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <Eye className="h-2.5 w-2.5 mr-0.5" />
            Publicado
          </ZenBadge>
        );
      case 'SIGNED':
        return (
          <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
            Firmado
          </ZenBadge>
        );
      case 'CANCELLATION_REQUESTED_BY_STUDIO':
        return (
          <ZenBadge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Cancelación solicitada
          </ZenBadge>
        );
      case 'CANCELLATION_REQUESTED_BY_CLIENT':
        return (
          <ZenBadge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Cliente solicita cancelar
          </ZenBadge>
        );
      case 'CANCELLED':
        return (
          <ZenBadge variant="outline" className="text-red-400 border-red-500/30 bg-red-950/20 rounded-full text-[10px] px-1.5 py-0 h-4">
            <X className="h-2.5 w-2.5 mr-0.5" />
            Cancelado
          </ZenBadge>
        );
      default:
        return null;
    }
  };

  const renderContractItem = (contractItem: EventContract, isActive: boolean) => {
    const isCancelled = contractItem.status === 'CANCELLED';
    const setCurrentContract = () => setContract(contractItem);
    const handleViewThisContract = () => {
      setContract(contractItem);
      setShowViewModal(true);
    };
    const handleEditThisContent = () => {
      setContract(contractItem);
      handleEditContent();
    };
    const handleChangeThisTemplate = () => {
      setContract(contractItem);
      handleChangeTemplate();
    };
    const handleDeleteThisContract = () => {
      setContract(contractItem);
      handleDeleteClick();
    };
    const handlePublishThisContract = () => {
      setContract(contractItem);
      handlePublishClick();
    };
    const handleRequestThisCancellation = () => {
      setContract(contractItem);
      handleRequestCancellation();
    };
    const handleConfirmThisCancellation = () => {
      setContract(contractItem);
      setShowCancellationConfirmModal(true);
    };
    const handleRejectThisCancellation = () => {
      setContract(contractItem);
      handleRejectCancellation();
    };
    const handleViewThisVersions = () => {
      setContract(contractItem);
      setShowVersionsModal(true);
    };

    return (
      <div
        key={contractItem.id}
        className={`p-3 rounded border relative group transition-colors ${
          isCancelled
            ? 'bg-zinc-900/50 border-zinc-800/50 opacity-75'
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium mb-1 ${isCancelled ? 'text-zinc-500' : 'text-zinc-100'}`}>
              {isCancelled ? 'Contrato Cancelado' : 'Contrato'}
            </p>

            {/* Estado */}
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
                  {getStatusBadge(contractItem.status)}
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Versión:</span>
                  <span className={isCancelled ? 'text-zinc-500' : 'text-zinc-300'}>{contractItem.version}</span>
                </div>
                {!isCancelled && (
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewThisVersions();
                    }}
                    className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-300"
                  >
                    <GitBranch className="h-3 w-3 mr-1" />
                    Historial
                  </ZenButton>
                )}
              </div>
              {contractItem.created_at && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Creado:</span>
                  <span className={isCancelled ? 'text-zinc-500' : 'text-zinc-300'}>{formatDate(contractItem.created_at)}</span>
                </div>
              )}
              {contractItem.signed_at && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Firmado:</span>
                  <span className={isCancelled ? 'text-zinc-500' : 'text-zinc-300'}>{formatDate(contractItem.signed_at)}</span>
                </div>
              )}
              {isCancelled && contractItem.cancelled_at && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Cancelado:</span>
                  <span className="text-zinc-500">{formatDate(contractItem.cancelled_at)}</span>
                </div>
              )}
            </div>

            {/* Botón Publicar visible cuando es draft y activo */}
            {!isCancelled && contractItem.status === 'DRAFT' && (
              <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
                <ZenButton
                  variant="ghost"
                  onClick={handlePublishThisContract}
                  className="bg-transparent focus-visible:ring-zinc-500/50 px-3 py-1.5 h-8 rounded-md w-full gap-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                >
                  <Send className="h-4 w-4" />
                  Publicar para revisión del cliente
                </ZenButton>
              </div>
            )}
          </div>

            {/* Botones de acción - solo para contratos activos */}
          {!isCancelled && (
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {/* Botón Ver */}
              <ZenButton
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewThisContract();
                }}
                className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                title="Ver contrato"
              >
                <Eye className="h-4 w-4" />
              </ZenButton>
              {/* Menú dropdown */}
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
                  {contractItem.status === 'DRAFT' && (
                    <>
                      <ZenDropdownMenuItem onClick={handleEditThisContent}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar contenido
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuItem onClick={handleChangeThisTemplate}>
                        <FileText className="mr-2 h-4 w-4" />
                        Cambiar plantilla
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem onClick={handlePublishThisContract}>
                        <Send className="mr-2 h-4 w-4" />
                        Publicar
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem
                        onClick={handleDeleteThisContract}
                        className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </ZenDropdownMenuItem>
                    </>
                  )}
                  {contractItem.status === 'PUBLISHED' && (
                    <>
                      <ZenDropdownMenuItem onClick={handleEditThisContent}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar contenido
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuItem onClick={handleChangeThisTemplate}>
                        <FileText className="mr-2 h-4 w-4" />
                        Cambiar plantilla
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem
                        onClick={handleDeleteThisContract}
                        className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </ZenDropdownMenuItem>
                    </>
                  )}
                  {contractItem.status === 'SIGNED' && (
                    <>
                      <ZenDropdownMenuItem onClick={handleRequestThisCancellation}>
                        <X className="mr-2 h-4 w-4" />
                        Solicitar cancelación
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem disabled className="text-zinc-500 cursor-not-allowed">
                        <FileText className="mr-2 h-4 w-4" />
                        Contrato firmado (solo lectura)
                      </ZenDropdownMenuItem>
                    </>
                  )}
                  {contractItem.status === 'CANCELLATION_REQUESTED_BY_STUDIO' && (
                    <ZenDropdownMenuItem disabled className="text-zinc-500 cursor-not-allowed">
                      <Clock className="mr-2 h-4 w-4" />
                      Esperando confirmación del cliente
                    </ZenDropdownMenuItem>
                  )}
                  {contractItem.status === 'CANCELLATION_REQUESTED_BY_CLIENT' && (
                    <>
                      <ZenDropdownMenuItem onClick={handleConfirmThisCancellation}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                        Confirmar cancelación
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem onClick={handleRejectThisCancellation}>
                        <X className="mr-2 h-4 w-4 text-red-400" />
                        Rechazar cancelación
                      </ZenDropdownMenuItem>
                    </>
                  )}
                  <ZenDropdownMenuSeparator />
                  <ZenDropdownMenuItem onClick={handleViewThisVersions}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    Historial de Versiones
                  </ZenDropdownMenuItem>
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
            </div>
          )}

          {/* Botón Ver para contratos cancelados */}
          {isCancelled && (
            <div className="absolute top-2 right-2">
              <ZenButton
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewThisContract();
                }}
                className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                title="Ver contrato cancelado"
              >
                <Eye className="h-4 w-4" />
              </ZenButton>
            </div>
          )}
        </div>
      </div>
    );
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

  // Determinar si mostrar botón "Anexar" en el header
  const hasActiveContract = allContracts.some(c => c.status !== 'CANCELLED');
  const showAddButton = !hasActiveContract; // Mostrar si no hay contrato activo (sin contratos o solo cancelados)

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center gap-2 pt-1">
            Contrato
          </ZenCardTitle>
          {showAddButton && (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
            >
              <Plus className="h-3 w-3 mr-1" />
              Anexar
            </ZenButton>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {allContracts.length > 0 ? (
          <div className="space-y-3">
            {/* Contratos activos primero */}
            {allContracts
              .filter(c => c.status !== 'CANCELLED')
              .map((contractItem) => renderContractItem(contractItem, true))}
            
            {/* Separador si hay contratos cancelados */}
            {allContracts.some(c => c.status === 'CANCELLED') && allContracts.some(c => c.status !== 'CANCELLED') && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Historial</p>
              </div>
            )}
            
            {/* Contratos cancelados después */}
            {allContracts
              .filter(c => c.status === 'CANCELLED')
              .map((contractItem) => renderContractItem(contractItem, false))}
            
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-zinc-500">
              No hay contrato generado para este evento
            </p>
            <ZenButton
              variant="outline"
              size="sm"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Anexar contrato
            </ZenButton>
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
        initialContent={isEditing ? selectedTemplateContent : undefined}
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
              <div className="space-y-3 text-sm">
                <p>Una vez publicado, el cliente podrá visualizar el contrato en su portal para autorizarlo.</p>
                
                <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg space-y-2">
                  <p className="text-amber-400 font-medium flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    Restricciones después de firmar
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-zinc-300 ml-5">
                    <li>El contrato no podrá ser eliminado ni editado</li>
                    <li>Se convierte en un documento legal vinculante</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg space-y-2">
                  <p className="text-blue-400 font-medium flex items-center gap-2">
                    <span className="text-base">ℹ️</span>
                    Cancelación mutua
                  </p>
                  <p className="text-zinc-300 text-xs">
                    Si es necesario cancelar un contrato firmado, cualquiera de las partes puede solicitar la cancelación. 
                    Ambas partes (estudio y cliente) deben estar de acuerdo para que la cancelación se complete. 
                    Todas las acciones de cancelación quedan registradas en el historial.
                  </p>
                </div>

                <p className="text-zinc-400 text-xs pt-2">¿Deseas continuar con la publicación?</p>
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

              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-start gap-3">
                  <ZenBadge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-950/20 rounded-full text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    Cancelación solicitada
                  </ZenBadge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200 mb-1">Cancelación Solicitada</p>
                    <p className="text-xs text-zinc-400">
                      Una de las partes ha solicitado cancelar el contrato. Esperando confirmación de la otra parte para completar la cancelación.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-start gap-3">
                  <ZenBadge variant="outline" className="text-red-400 border-red-500/30 bg-red-950/20 rounded-full text-[10px] px-1.5 py-0 h-4 shrink-0 mt-0.5">
                    <X className="h-2.5 w-2.5 mr-0.5" />
                    Cancelado
                  </ZenBadge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200 mb-1">Cancelado</p>
                    <p className="text-xs text-zinc-400">
                      El contrato ha sido cancelado por mutuo acuerdo. Es un documento legal y no puede ser modificado ni eliminado. Solo puedes verlo y descargarlo como PDF.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ZenDialog>

          {/* Modal de solicitud de cancelación */}
          <ZenDialog
            isOpen={showCancellationModal}
            onClose={() => {
              if (!isCancelling) {
                setShowCancellationModal(false);
                setCancellationReason('');
              }
            }}
            title="Solicitar Cancelación de Contrato"
            description="Ingresa el motivo de la cancelación. El cliente deberá confirmar para completar la cancelación."
            maxWidth="md"
            onCancel={() => {
              if (!isCancelling) {
                setShowCancellationModal(false);
                setCancellationReason('');
              }
            }}
            cancelLabel="Cancelar"
            onSave={handleCancellationConfirm}
            saveLabel="Enviar Solicitud"
            isLoading={isCancelling}
          >
            <div className="space-y-4">
              <ZenTextarea
                label="Motivo de cancelación"
                required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Describe el motivo de la cancelación (mínimo 10 caracteres)"
                minRows={4}
                maxLength={1000}
                disabled={isCancelling}
                error={cancellationReason.length > 0 && cancellationReason.length < 10 ? 'El motivo debe tener al menos 10 caracteres' : undefined}
                hint="El cliente recibirá una notificación y deberá confirmar la cancelación"
              />
              <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg">
                <p className="text-xs text-amber-300">
                  ⚠️ El cliente recibirá una notificación y deberá confirmar la cancelación para que se complete.
                </p>
              </div>
            </div>
          </ZenDialog>

          {/* Modal de confirmación de cancelación (cuando el cliente solicita) */}
          <ZenConfirmModal
            isOpen={showCancellationConfirmModal}
            onClose={() => {
              if (!isCancelling) {
                setShowCancellationConfirmModal(false);
              }
            }}
            onConfirm={handleConfirmCancellation}
            title="Confirmar Cancelación"
            description={
              <div className="space-y-2">
                <p>El cliente ha solicitado cancelar el contrato.</p>
                {contract?.cancellation_reason && (
                  <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 mt-3">
                    <p className="text-sm font-medium text-zinc-300 mb-1">Motivo:</p>
                    <p className="text-sm text-zinc-400">{contract.cancellation_reason}</p>
                  </div>
                )}
                <p className="text-amber-400 font-medium mt-3">
                  ⚠️ Esta acción no se puede deshacer. El contrato quedará cancelado por mutuo acuerdo.
                </p>
                <p>¿Deseas confirmar la cancelación?</p>
              </div>
            }
            confirmText="Sí, confirmar cancelación"
            cancelText="Cancelar"
            variant="destructive"
            loading={isCancelling}
          />

          {/* Modal de historial de versiones */}
          {contract && (
            <>
              <ContractVersionsModal
                isOpen={showVersionsModal}
                onClose={() => setShowVersionsModal(false)}
                studioSlug={studioSlug}
                contractId={contract.id}
              />
            </>
          )}
        </>
      )}
    </ZenCard>
  );
}
