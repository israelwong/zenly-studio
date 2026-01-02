'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Trash2, Loader2, FileText, Share2, ExternalLink, Settings, Copy, ChevronDown, Check } from 'lucide-react';
import { PromiseNotesButton } from './components/PromiseNotesButton';
import { PromiseShareOptionsModal } from './components/PromiseShareOptionsModal';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator, ZenConfirmModal, ZenBadge } from '@/components/ui/zen';
import { PromiseCardView } from './components/PromiseCardView';
import { ContactEventFormModal } from '@/components/shared/contact-info';
import dynamic from 'next/dynamic';

const ContractTemplateManagerModal = dynamic(
  () => import('@/components/shared/contracts/ContractTemplateManagerModal').then(mod => mod.ContractTemplateManagerModal),
  { ssr: false }
);
import { getPromiseById, archivePromise, unarchivePromise, deletePromise, getPipelineStages, movePromise } from '@/lib/actions/studio/commercial/promises';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useContactUpdateListener } from '@/hooks/useContactRefresh';

export default function EditarPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;

  useEffect(() => {
    document.title = 'ZEN Studio - Promesa';
  }, []);
  const [loading, setLoading] = useState(true);
  const [isArchived, setIsArchived] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [currentPipelineStageId, setCurrentPipelineStageId] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [promiseData, setPromiseData] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_type_id: string | null;
    event_type_name: string | null;
    event_location: string | null;
    event_name: string | null;
    event_date: Date | null;
    interested_dates: string[] | null;
    acquisition_channel_id?: string | null;
    acquisition_channel_name?: string | null;
    social_network_id?: string | null;
    social_network_name?: string | null;
    referrer_contact_id?: string | null;
    referrer_name?: string | null;
    referrer_contact_name?: string | null;
    referrer_contact_email?: string | null;
    promiseId?: string | null;
    has_event?: boolean;
    evento_id?: string | null;
  } | null>(null);
  const [contactData, setContactData] = useState<{
    contactId: string;
    contactName: string;
    phone: string;
    email: string | null;
    promiseId: string;
  } | null>(null);

  useEffect(() => {
    const loadPromise = async () => {
      try {
        setLoading(true);
        // Obtener promesa directamente por promiseId
        const result = await getPromiseById(promiseId);

        if (result.success && result.data) {
          setPromiseData({
            id: result.data.contact_id,
            name: result.data.contact_name,
            phone: result.data.contact_phone,
            email: result.data.contact_email,
            address: result.data.contact_address,
            event_type_id: result.data.event_type_id || null,
            event_type_name: result.data.event_type_name || null,
            event_location: result.data.event_location || null,
            event_name: result.data.event_name || null,
            event_date: result.data.event_date || null,
            interested_dates: result.data.interested_dates,
            acquisition_channel_id: result.data.acquisition_channel_id ?? null,
            acquisition_channel_name: result.data.acquisition_channel_name ?? null,
            social_network_id: result.data.social_network_id ?? null,
            social_network_name: result.data.social_network_name ?? null,
            referrer_contact_id: result.data.referrer_contact_id ?? null,
            referrer_name: result.data.referrer_name ?? null,
            referrer_contact_name: result.data.referrer_contact_name ?? null,
            referrer_contact_email: result.data.referrer_contact_email ?? null,
            promiseId: result.data.promise_id,
            has_event: result.data.has_event,
            evento_id: result.data.evento_id ?? null,
          });
          setContactData({
            contactId: result.data.contact_id,
            contactName: result.data.contact_name,
            phone: result.data.contact_phone,
            email: result.data.contact_email,
            promiseId: result.data.promise_id,
          });
          // Verificar si está archivada y guardar pipeline stage id
          setIsArchived(result.data.pipeline_stage_slug === 'archived');
          setCurrentPipelineStageId(result.data.pipeline_stage_id);
        } else {
          toast.error(result.error || 'Promesa no encontrada');
          router.push(`/${studioSlug}/studio/commercial/promises`);
        }
      } catch (error) {
        console.error('Error loading promise:', error);
        toast.error('Error al cargar la promesa');
        router.push(`/${studioSlug}/studio/commercial/promises`);
      } finally {
        setLoading(false);
      }
    };

    if (promiseId) {
      loadPromise();
    }
  }, [promiseId, studioSlug, router]);

  // Cargar pipeline stages
  useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        const result = await getPipelineStages(studioSlug);
        if (result.success && result.data) {
          setPipelineStages(result.data);
        }
      } catch (error) {
        console.error('Error cargando pipeline stages:', error);
      }
    };
    loadPipelineStages();
  }, [studioSlug]);

  // Callback para manejar actualizaciones de contacto
  const handleContactUpdate = useCallback((updatedContact: {
    id: string;
    name?: string;
    phone?: string;
    email?: string | null;
    address?: string | null;
    acquisition_channel_id?: string | null;
    social_network_id?: string | null;
    referrer_contact_id?: string | null;
    referrer_name?: string | null;
  } | undefined) => {
    if (updatedContact && promiseData) {
      // Actualizar datos locales con la información del contacto actualizado
      setPromiseData(prev => prev ? {
        ...prev,
        name: updatedContact.name !== undefined ? updatedContact.name : prev.name,
        phone: updatedContact.phone !== undefined ? updatedContact.phone : prev.phone,
        email: updatedContact.email !== undefined ? updatedContact.email : prev.email,
        address: updatedContact.address !== undefined ? updatedContact.address : prev.address,
        acquisition_channel_id: updatedContact.acquisition_channel_id !== undefined ? updatedContact.acquisition_channel_id : prev.acquisition_channel_id,
        social_network_id: updatedContact.social_network_id !== undefined ? updatedContact.social_network_id : prev.social_network_id,
        referrer_contact_id: updatedContact.referrer_contact_id !== undefined ? updatedContact.referrer_contact_id : prev.referrer_contact_id,
        referrer_name: updatedContact.referrer_name !== undefined ? updatedContact.referrer_name : prev.referrer_name,
      } : null);
      setContactData(prev => prev ? {
        ...prev,
        contactName: updatedContact.name !== undefined ? updatedContact.name : prev.contactName,
        phone: updatedContact.phone !== undefined ? updatedContact.phone : prev.phone,
        email: updatedContact.email !== undefined ? updatedContact.email : prev.email,
      } : null);
    } else if (promiseData?.id) {
      // Si no viene el contacto completo, recargar desde el servidor
      const reloadPromise = async () => {
        try {
          const result = await getPromiseById(promiseId);
          if (result.success && result.data) {
            setPromiseData({
              id: result.data.contact_id,
              name: result.data.contact_name,
              phone: result.data.contact_phone,
              email: result.data.contact_email,
              address: result.data.contact_address,
              event_type_id: result.data.event_type_id || null,
              event_type_name: result.data.event_type_name || null,
              event_location: result.data.event_location || null,
              event_name: result.data.event_name || null,
              event_date: result.data.event_date || null,
              interested_dates: result.data.interested_dates,
              acquisition_channel_id: result.data.acquisition_channel_id ?? null,
              acquisition_channel_name: result.data.acquisition_channel_name ?? null,
              social_network_id: result.data.social_network_id ?? null,
              social_network_name: result.data.social_network_name ?? null,
              referrer_contact_id: result.data.referrer_contact_id ?? null,
              referrer_name: result.data.referrer_name ?? null,
              referrer_contact_name: result.data.referrer_contact_name ?? null,
              referrer_contact_email: result.data.referrer_contact_email ?? null,
              promiseId: result.data.promise_id,
              has_event: result.data.has_event,
              evento_id: result.data.evento_id ?? null,
            });
            setContactData({
              contactId: result.data.contact_id,
              contactName: result.data.contact_name,
              phone: result.data.contact_phone,
              email: result.data.contact_email,
              promiseId: result.data.promise_id,
            });
          }
        } catch (error) {
          console.error('Error reloading promise after contact update:', error);
        }
      };
      reloadPromise();
    }
  }, [promiseData, promiseId]);

  // Escuchar actualizaciones de contacto para sincronizar datos
  useContactUpdateListener(promiseData?.id || null, handleContactUpdate);

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!promiseId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const result = await movePromise(studioSlug, {
        promise_id: promiseId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        setCurrentPipelineStageId(newStageId);
        const newStage = pipelineStages.find((s) => s.id === newStageId);
        setIsArchived(newStage?.slug === 'archived');

        // Disparar confetti si cambió a "aprobado"
        const isApprovedStage = newStage?.slug === 'approved' || newStage?.slug === 'aprobado' ||
          newStage?.name.toLowerCase().includes('aprobado');

        if (isApprovedStage) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 1 }, // Desde abajo de la ventana
          });
        }

        toast.success('Etapa actualizada correctamente');
      } else {
        toast.error(result.error || 'Error al cambiar etapa');
      }
    } catch (error) {
      console.error('Error cambiando etapa:', error);
      toast.error('Error al cambiar etapa');
    } finally {
      setIsChangingStage(false);
    }
  };


  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await archivePromise(studioSlug, promiseId);
      if (result.success) {
        setIsArchived(true);
        // Actualizar pipeline stage id al stage archivado
        const archivedStage = pipelineStages.find((s) => s.slug === 'archived');
        if (archivedStage) {
          setCurrentPipelineStageId(archivedStage.id);
        }
        toast.success('Promesa archivada correctamente');
        setShowArchiveModal(false);
      } else {
        toast.error(result.error || 'Error al archivar promesa');
      }
    } catch (error) {
      console.error('Error archivando promesa:', error);
      toast.error('Error al archivar promesa');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setIsUnarchiving(true);
    try {
      const result = await unarchivePromise(studioSlug, promiseId);
      if (result.success) {
        setIsArchived(false);
        // Actualizar pipeline stage id a la primera etapa activa
        const firstActiveStage = pipelineStages
          .filter((s) => s.slug !== 'archived')
          .sort((a, b) => a.order - b.order)[0];
        if (firstActiveStage) {
          setCurrentPipelineStageId(firstActiveStage.id);
        }
        toast.success('Promesa desarchivada correctamente');
      } else {
        toast.error(result.error || 'Error al desarchivar promesa');
      }
    } catch (error) {
      console.error('Error desarchivando promesa:', error);
      toast.error('Error al desarchivar promesa');
    } finally {
      setIsUnarchiving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePromise(studioSlug, promiseId);
      if (result.success) {
        toast.success('Promesa eliminada correctamente');
        setShowDeleteModal(false);
        // Navegar solo después de que la eliminación sea exitosa
        router.push(`/${studioSlug}/studio/commercial/promises`);
      } else {
        toast.error(result.error || 'Error al eliminar promesa');
        setIsDeleting(false); // Permitir cerrar el modal si hay error
      }
    } catch (error) {
      console.error('Error eliminando promesa:', error);
      toast.error('Error al eliminar promesa');
      setIsDeleting(false); // Permitir cerrar el modal si hay error
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Skeleton del select */}
                <div className="h-8 w-32 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex items-center gap-2">
                  {/* Skeleton de QuickActions */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                  </div>
                  {/* Skeleton del menú modal */}
                  <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-32 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  const handleEditSuccess = async () => {
    // Recargar datos después de editar
    try {
      const result = await getPromiseById(promiseId);
      if (result.success && result.data) {
        setPromiseData({
          id: result.data.contact_id,
          name: result.data.contact_name,
          phone: result.data.contact_phone,
          email: result.data.contact_email,
          address: result.data.contact_address,
          event_type_id: result.data.event_type_id || null,
          event_type_name: result.data.event_type_name || null,
          event_location: result.data.event_location || null,
          event_name: result.data.event_name || null,
          event_date: result.data.event_date || null,
          interested_dates: result.data.interested_dates,
          acquisition_channel_id: result.data.acquisition_channel_id ?? null,
          acquisition_channel_name: result.data.acquisition_channel_name ?? null,
          social_network_id: result.data.social_network_id ?? null,
          social_network_name: result.data.social_network_name ?? null,
          referrer_contact_id: result.data.referrer_contact_id ?? null,
          referrer_name: result.data.referrer_name ?? null,
          referrer_contact_name: result.data.referrer_contact_name ?? null,
          referrer_contact_email: result.data.referrer_contact_email ?? null,
          promiseId: result.data.promise_id,
          has_event: result.data.has_event,
          evento_id: result.data.evento_id ?? null,
        });
        setContactData({
          contactId: result.data.contact_id,
          contactName: result.data.contact_name,
          phone: result.data.contact_phone,
          email: result.data.contact_email,
          promiseId: result.data.promise_id,
        });
      }
    } catch (error) {
      console.error('Error reloading promise:', error);
    }
  };

  if (!promiseData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard
        variant="default"
        padding="none"
      >
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/commercial/promises`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div className="flex items-baseline gap-2">
                <ZenCardTitle>Promesa</ZenCardTitle>
                {(() => {
                  // Verificar estado del evento primero
                  if (loading || !pipelineStages.length || !currentPipelineStageId || !promiseData) {
                    return (
                      <div className="flex items-center gap-1.5 pb-0.5">
                        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                        <span className="text-xs text-zinc-500">Cargando...</span>
                      </div>
                    );
                  }

                  const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
                  const isApprovedStage = currentStage?.slug === 'approved' || currentStage?.slug === 'aprobado' ||
                    currentStage?.name.toLowerCase().includes('aprobado');
                  const hasEvent = promiseData.has_event || false;
                  const isRestricted = isApprovedStage && hasEvent;
                  const eventoId = promiseData.evento_id || null;

                  // Filtrar etapas: si está restringido, solo mostrar "archived" además de la actual
                  const availableStages = isRestricted
                    ? pipelineStages.filter((s) => s.slug === 'archived' || s.id === currentPipelineStageId)
                    : pipelineStages;

                  // Determinar variante del badge
                  const badgeVariant = isArchived ? 'warning' : isApprovedStage ? 'success' : 'default';

                  return (
                    <ZenDropdownMenu>
                      <ZenDropdownMenuTrigger asChild>
                        <button
                          disabled={isChangingStage}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        >
                          {isChangingStage ? (
                            <>
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              <span>Actualizando...</span>
                            </>
                          ) : (
                            <>
                              <span>{currentStage?.name}</span>
                              <ChevronDown className="h-2.5 w-2.5" />
                            </>
                          )}
                        </button>
                      </ZenDropdownMenuTrigger>
                      <ZenDropdownMenuContent align="start">
                        {availableStages.map((stage) => (
                          <ZenDropdownMenuItem
                            key={stage.id}
                            onClick={() => handlePipelineStageChange(stage.id)}
                            disabled={stage.id === currentPipelineStageId}
                          >
                            <span className="flex-1">{stage.name}</span>
                            {stage.id === currentPipelineStageId && (
                              <Check className="h-4 w-4 text-emerald-500 ml-2" />
                            )}
                          </ZenDropdownMenuItem>
                        ))}
                      </ZenDropdownMenuContent>
                    </ZenDropdownMenu>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                // Mostrar botón de gestionar evento si está aprobado y tiene evento
                if (loading || !pipelineStages.length || !currentPipelineStageId || !promiseData) {
                  return null;
                }

                const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
                const isApprovedStage = currentStage?.slug === 'approved' || currentStage?.slug === 'aprobado' ||
                  currentStage?.name.toLowerCase().includes('aprobado');
                const hasEvent = promiseData.has_event || false;
                const isRestricted = isApprovedStage && hasEvent;
                const eventoId = promiseData.evento_id || null;

                if (isRestricted && eventoId) {
                  return (
                    <ZenButton
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventoId}`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Gestionar Evento
                    </ZenButton>
                  );
                }

                return null;
              })()}
              <div className="flex items-center gap-2">
                {/* Botón de plantillas de contrato */}
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatesModalOpen(true)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Plantillas de contrato</span>
                </ZenButton>
                {promiseId && (
                  <PromiseNotesButton
                    studioSlug={studioSlug}
                    promiseId={promiseId}
                    contactId={contactData?.contactId}
                  />
                )}
                {/* Botón Compartir */}
                {promiseId && contactData && (
                  <ZenDropdownMenu>
                    <ZenDropdownMenuTrigger asChild>
                      <ZenButton
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Compartir</span>
                      </ZenButton>
                    </ZenDropdownMenuTrigger>
                    <ZenDropdownMenuContent align="end">
                      <ZenDropdownMenuItem
                        onClick={async () => {
                          const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;
                          try {
                            await navigator.clipboard.writeText(previewUrl);
                            toast.success('Link copiado al portapapeles');
                          } catch (error) {
                            toast.error('Error al copiar link');
                          }
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar link
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuItem
                        onClick={() => {
                          const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;
                          window.open(previewUrl, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir vista previa
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem
                        onClick={() => setIsShareModalOpen(true)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar compartir
                      </ZenDropdownMenuItem>
                    </ZenDropdownMenuContent>
                  </ZenDropdownMenu>
                )}
                <ZenDropdownMenu>
                  <ZenDropdownMenuTrigger asChild>
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={isArchiving || isUnarchiving || isDeleting}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </ZenButton>
                  </ZenDropdownMenuTrigger>
                  <ZenDropdownMenuContent align="end">
                    {isArchived ? (
                      <ZenDropdownMenuItem
                        onClick={() => handleUnarchive()}
                        disabled={isUnarchiving}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        {isUnarchiving ? 'Desarchivando...' : 'Desarchivar'}
                      </ZenDropdownMenuItem>
                    ) : (
                      <ZenDropdownMenuItem
                        onClick={() => setShowArchiveModal(true)}
                        disabled={isArchiving}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {isArchiving ? 'Archivando...' : 'Archivar'}
                      </ZenDropdownMenuItem>
                    )}
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isDeleting}
                      className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </ZenDropdownMenuItem>
                  </ZenDropdownMenuContent>
                </ZenDropdownMenu>
              </div>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <PromiseCardView
            studioSlug={studioSlug}
            promiseId={promiseId}
            contactId={promiseData.id}
            data={{
              name: promiseData.name,
              phone: promiseData.phone,
              email: promiseData.email,
              address: promiseData.address,
              event_type_id: promiseData.event_type_id,
              event_type_name: promiseData.event_type_name || undefined,
              event_location: promiseData.event_location || undefined,
              event_name: promiseData.event_name || undefined,
              event_date: promiseData.event_date || undefined,
              interested_dates: promiseData.interested_dates,
              acquisition_channel_id: promiseData.acquisition_channel_id || undefined,
              acquisition_channel_name: promiseData.acquisition_channel_name || undefined,
              social_network_id: promiseData.social_network_id || undefined,
              social_network_name: promiseData.social_network_name || undefined,
              referrer_contact_id: promiseData.referrer_contact_id || undefined,
              referrer_name: promiseData.referrer_name || undefined,
              referrer_contact_name: promiseData.referrer_contact_name || undefined,
            }}
            onEdit={() => setShowEditModal(true)}
            isSaved={true}
          />
        </ZenCardContent>
      </ZenCard>

      {/* Modal de edición */}
      <ContactEventFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        studioSlug={studioSlug}
        context="promise"
        initialData={{
          id: promiseData.id,
          name: promiseData.name,
          phone: promiseData.phone,
          email: promiseData.email || undefined,
          address: promiseData.address || undefined,
          event_type_id: promiseData.event_type_id || undefined,
          event_location: promiseData.event_location || undefined,
          event_name: promiseData.event_name || undefined,
          event_date: promiseData.event_date || undefined,
          interested_dates: promiseData.interested_dates || undefined,
          acquisition_channel_id: promiseData.acquisition_channel_id || undefined,
          social_network_id: promiseData.social_network_id || undefined,
          referrer_contact_id: promiseData.referrer_contact_id || undefined,
          referrer_name: promiseData.referrer_contact_name || promiseData.referrer_name || undefined,
        }}
        onSuccess={handleEditSuccess}
      />

      {/* Modal de Compartir */}
      {promiseId && (
        <PromiseShareOptionsModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          studioSlug={studioSlug}
          promiseId={promiseId}
        />
      )}

      {/* Modales de confirmación */}
      <ZenConfirmModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
        title="¿Archivar esta promesa?"
        description="La promesa será archivada y no aparecerá en la lista principal. Podrás restaurarla más tarde si es necesario."
        confirmText="Sí, archivar"
        cancelText="Cancelar"
        variant="default"
        loading={isArchiving}
      />

      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="¿Eliminar esta promesa?"
        description="Esta acción no se puede deshacer. La promesa y todos sus datos asociados serán eliminados permanentemente."
        confirmText={isDeleting ? "Eliminando..." : "Sí, eliminar"}
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
        disabled={isDeleting}
      />

      {/* Modal de plantillas de contrato */}
      <ContractTemplateManagerModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        studioSlug={studioSlug}
        eventTypeId={promiseData?.event_type_id || undefined}
      />
    </div>
  );
}

