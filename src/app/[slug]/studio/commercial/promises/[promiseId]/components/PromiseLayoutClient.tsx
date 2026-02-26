'use client';

import React, { useState, useCallback, useEffect, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PromiseDetailHeader } from './PromiseDetailHeader';
import { PromiseDetailToolbar } from './PromiseDetailToolbar';
import { PromiseShareOptionsModal } from './PromiseShareOptionsModal';
import { PromiseProvider } from '../context/PromiseContext';
import { PromiseFocusModeProvider } from '../context/PromiseFocusModeContext';
import { usePromisesConfig } from '../../context/PromisesConfigContext';
import { BitacoraSheet } from '@/components/shared/bitacora';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { ArchivePromiseModal } from '../../components/ArchivePromiseModal';
import { toast } from 'sonner';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { useContactUpdateListener } from '@/hooks/useContactRefresh';
import type { PromiseStateData } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { PromiseContentSkeleton } from './PromiseLayoutSkeleton';

interface PromiseLayoutClientProps {
  studioSlug: string;
  promiseId: string;
  stateData: PromiseStateData;
  pipelineStages: PipelineStage[];
  initialCotizacionEnCierre?: CotizacionListItem | null;
}

export function PromiseLayoutClient({
  studioSlug,
  promiseId,
  stateData,
  pipelineStages,
  initialCotizacionEnCierre = null,
  children,
}: PromiseLayoutClientProps & { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const promisesConfig = usePromisesConfig();

  /** Modo foco: edición de cotización o negociación; ocultar toolbar y regresar global */
  const isFocusMode = pathname?.includes('/cotizacion/') === true;
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalMode, setShareModalMode] = useState<'default' | 'publish'>('default');
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const isArchived = stateData.promiseData.pipeline_stage_slug === 'archived';

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
    // El contexto se actualizar? autom?ticamente cuando el layout se recargue
    // Por ahora solo recargamos la p?gina para sincronizar
    if (updatedContact) {
      router.refresh();
    }
  }, [router]);

  useContactUpdateListener(stateData.promiseData.contact_id, handleContactUpdate);

  // Cerrar overlays al montar el componente de detalle
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('close-overlays'));
  }, []);

  // Abrir modal de automatización desde la card "Lo que el prospecto ve"
  useEffect(() => {
    const handler = () => setIsShareModalOpen(true);
    window.addEventListener('open-share-options-modal', handler);
    return () => window.removeEventListener('open-share-options-modal', handler);
  }, []);

  // Abrir bitácora desde QuickNoteCard
  useEffect(() => {
    const handler = () => setLogsSheetOpen(true);
    window.addEventListener('open-bitacora-sheet', handler);
    return () => window.removeEventListener('open-bitacora-sheet', handler);
  }, []);

  const handlePipelineStageChange = async (newStageId: string, stageName?: string) => {
    if (!promiseId || newStageId === stateData.promiseData.pipeline_stage_id) return;

    if (!newStageId || typeof newStageId !== 'string' || newStageId.trim().length === 0) {
      const stageInfo = stageName ? ` (${stageName})` : '';
      toast.error(`Error: El ID de la etapa seleccionada${stageInfo} est? vac?o o no es v?lido. Por favor, recarga la p?gina e intenta nuevamente.`);
      return;
    }

    setIsChangingStage(true);
    try {
      const { movePromise } = await import('@/lib/actions/studio/commercial/promises');
      
      // Asegurar que newStageId sea un string limpio
      const cleanStageId = String(newStageId).trim();
      const result = await movePromise(studioSlug, {
        promise_id: promiseId,
        new_stage_id: cleanStageId,
      });

      if (result.success) {
        toast.success('Etapa actualizada correctamente');
        router.refresh();
      } else {
        // El error ya viene con un mensaje descriptivo del servidor
        // Si el mensaje menciona restricciones de negocio, mantenerlo; si es de validaci?n, mejorarlo
        const errorMessage = result.error || 'Error al cambiar etapa';
        if (errorMessage.includes('evento asociado') || errorMessage.includes('desactivada') || errorMessage.includes('no pertenece')) {
          // Es una restricci?n de l?gica de negocio
          toast.error(errorMessage);
        } else if (errorMessage.includes('validaci?n') || errorMessage.includes('inv?lido') || errorMessage.includes('no existe')) {
          // Es un error de validaci?n
          toast.error(errorMessage);
        } else {
          // Error gen?rico
          toast.error(`Error: ${errorMessage}`);
        }
      }
    } catch (error) {
      // Si es un error de Zod, mostrar mensaje m?s espec?fico
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> };
        const issue = zodError.issues[0];
        if (issue?.path.includes('new_stage_id')) {
          toast.error('Error de validaci?n: La etapa seleccionada no es v?lida. Por favor, selecciona otra etapa.');
        } else {
          toast.error(`Error de validaci?n: ${issue?.message || 'Datos inv?lidos'}`);
        }
      } else {
        toast.error('Error del sistema al cambiar etapa. Por favor, intenta nuevamente o contacta al soporte.');
      }
    } finally {
      setIsChangingStage(false);
    }
  };

  const handleArchive = async (archiveReason?: string) => {
    setIsArchiving(true);
    try {
      const { archivePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await archivePromise(studioSlug, promiseId, {
        archiveReason: archiveReason?.trim() || undefined,
      });
      if (result.success) {
        toast.success('Promesa archivada correctamente');
        router.push(`/${studioSlug}/studio/commercial/promises`);
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
    try {
      const { unarchivePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await unarchivePromise(studioSlug, promiseId);
      if (result.success) {
        toast.success('Promesa desarchivada correctamente');
        router.refresh();
      } else {
        toast.error(result.error || 'Error al desarchivar promesa');
      }
    } catch (error) {
      console.error('Error desarchivando promesa:', error);
      toast.error('Error al desarchivar promesa');
    }
  };

  const handleDelete = async () => {
    try {
      const { deletePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await deletePromise(studioSlug, promiseId);
      if (result.success) {
        toast.success('Promesa eliminada correctamente');
        router.push(`/${studioSlug}/studio/commercial/promises`);
      } else {
        toast.error(result.error || 'Error al eliminar promesa');
      }
    } catch (error) {
      console.error('Error eliminando promesa:', error);
      toast.error('Error al eliminar promesa');
    }
  };

  // Preparar datos para el contexto
  const contextPromiseData = {
    id: stateData.promiseData.contact_id,
    name: stateData.promiseData.contact_name,
    phone: stateData.promiseData.contact_phone,
    email: stateData.promiseData.contact_email,
    address: stateData.promiseData.contact_address,
    event_type_id: stateData.promiseData.event_type_id,
    event_type_name: stateData.promiseData.event_type_name,
    event_location: stateData.promiseData.event_location,
    event_location_id: stateData.promiseData.event_location_id ?? undefined,
    event_name: stateData.promiseData.event_name,
    duration_hours: stateData.promiseData.duration_hours,
    event_date: stateData.promiseData.event_date,
    interested_dates: stateData.promiseData.interested_dates,
    acquisition_channel_id: stateData.promiseData.acquisition_channel_id,
    acquisition_channel_name: stateData.promiseData.acquisition_channel_name,
    social_network_id: stateData.promiseData.social_network_id,
    social_network_name: stateData.promiseData.social_network_name,
    referrer_contact_id: stateData.promiseData.referrer_contact_id,
    referrer_name: stateData.promiseData.referrer_name,
    referrer_contact_name: stateData.promiseData.referrer_contact_name,
    referrer_contact_email: stateData.promiseData.referrer_contact_email,
    referrer_id: stateData.promiseData.referrer_id ?? undefined,
    referrer_type: stateData.promiseData.referrer_type ?? undefined,
    contact_id: stateData.promiseData.contact_id,
    evento_id: stateData.promiseData.evento_id,
    promise_id: stateData.promiseData.id,
  };

  const promiseDataForHeader = {
    id: stateData.promiseData.contact_id,
    name: stateData.promiseData.contact_name,
    phone: stateData.promiseData.contact_phone,
    email: stateData.promiseData.contact_email,
    address: stateData.promiseData.contact_address,
    event_type_id: stateData.promiseData.event_type_id,
    event_type_name: stateData.promiseData.event_type_name,
    event_location: stateData.promiseData.event_location,
    event_location_id: stateData.promiseData.event_location_id ?? undefined,
    event_name: stateData.promiseData.event_name,
    duration_hours: stateData.promiseData.duration_hours,
    event_date: stateData.promiseData.event_date,
    interested_dates: stateData.promiseData.interested_dates,
    acquisition_channel_id: stateData.promiseData.acquisition_channel_id,
    acquisition_channel_name: stateData.promiseData.acquisition_channel_name,
    social_network_id: stateData.promiseData.social_network_id,
    social_network_name: stateData.promiseData.social_network_name,
    referrer_contact_id: stateData.promiseData.referrer_contact_id,
    referrer_name: stateData.promiseData.referrer_name,
    referrer_contact_name: stateData.promiseData.referrer_contact_name,
    referrer_contact_email: stateData.promiseData.referrer_contact_email,
    referrer_id: stateData.promiseData.referrer_id ?? undefined,
    referrer_type: stateData.promiseData.referrer_type ?? undefined,
    promiseId: stateData.promiseData.id,
    has_event: stateData.promiseData.has_event,
    evento_id: stateData.promiseData.evento_id,
  };

  const contactDataForHeader = {
    contactId: stateData.promiseData.contact_id,
    contactName: stateData.promiseData.contact_name,
    phone: stateData.promiseData.contact_phone,
    email: stateData.promiseData.contact_email,
    promiseId: stateData.promiseData.id,
  };

  return (
    <PromiseProvider
      promiseData={contextPromiseData}
      isLoading={false}
      promiseState={stateData.state}
      cotizacionEnCierre={initialCotizacionEnCierre}
    >
      <div
        className={
          isFocusMode ? 'w-full' : 'w-full max-w-7xl mx-auto'
        }
      >
        <ZenCard variant="default" padding="none">
          <PromiseDetailHeader
            studioSlug={studioSlug}
            promiseId={promiseId}
            loading={false}
            pipelineStages={pipelineStages}
            currentPipelineStageId={stateData.promiseData.pipeline_stage_id}
            isChangingStage={isChangingStage}
            promiseData={promiseDataForHeader}
            contactData={contactDataForHeader}
            isArchived={isArchived}
            onPipelineStageChange={handlePipelineStageChange}
            onConfigClick={promisesConfig?.openConfigCatalog}
            onArchive={() => setShowArchiveModal(true)}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
            isArchiving={isArchiving}
            isUnarchiving={false}
            isDeleting={false}
            focusMode={isFocusMode}
            onAutomateClick={
              !isFocusMode
                ? () => {
                    setShareModalMode('default');
                    setIsShareModalOpen(true);
                  }
                : undefined
            }
          />
          {!isFocusMode && (
          <PromiseDetailToolbar
            studioSlug={studioSlug}
            promiseId={promiseId}
            contactData={{
              contactId: contactDataForHeader.contactId,
              contactName: promiseDataForHeader.name,
              phone: promiseDataForHeader.phone,
            }}
            isPublished={!!stateData.promiseData.published_at}
            onRequestPublish={() => {
              setShareModalMode('publish');
              setIsShareModalOpen(true);
            }}
            onUnpublishSuccess={() => {
              startTransition(() => router.refresh());
            }}
            eventName={stateData.promiseData.event_type_name}
            eventDate={stateData.promiseData.event_date}
            onOpenAutomationOptions={() => {
              setShareModalMode('default');
              setIsShareModalOpen(true);
            }}
          />
          )}
          <ZenCardContent
            className={isFocusMode ? 'p-0 min-h-[600px]' : 'p-6 min-h-[600px]'}
          >
            <PromiseFocusModeProvider value={isFocusMode}>
              {children || <PromiseContentSkeleton />}
            </PromiseFocusModeProvider>
          </ZenCardContent>
        </ZenCard>

        <ArchivePromiseModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={async (archiveReason) => await handleArchive(archiveReason)}
        />

        {/* Modales compartidos */}
        {promiseId && (
          <>
            <PromiseShareOptionsModal
              key={promiseId}
              isOpen={isShareModalOpen}
              onClose={() => {
                setIsShareModalOpen(false);
                setShareModalMode('default');
              }}
              studioSlug={studioSlug}
              promiseId={promiseId}
              contactName={stateData.promiseData.contact_name ?? undefined}
              mode={shareModalMode}
              onPublishSuccess={async () => {
                const { getOrCreateShortUrl } = await import('@/lib/actions/studio/commercial/promises/promise-short-url.actions');
                const result = await getOrCreateShortUrl(studioSlug, promiseId);
                if (result.success && result.data && typeof window !== 'undefined') {
                  const url = `${window.location.origin}/s/${result.data.shortCode}`;
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch {
                    // Fallback
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    try {
                      document.execCommand('copy');
                    } finally {
                      document.body.removeChild(ta);
                    }
                  }
                }
              }}
              onSuccess={() => startTransition(() => router.refresh())}
            />
            <BitacoraSheet
              open={logsSheetOpen}
              onOpenChange={setLogsSheetOpen}
              studioSlug={studioSlug}
              promiseId={promiseId}
              context="PROMISE"
            />
          </>
        )}

      </div>
    </PromiseProvider>
  );
}
