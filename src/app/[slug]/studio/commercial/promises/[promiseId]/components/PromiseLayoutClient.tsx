'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromiseDetailHeader } from './PromiseDetailHeader';
import { PromiseDetailToolbar } from './PromiseDetailToolbar';
import { PromiseShareOptionsModal } from './PromiseShareOptionsModal';
import { PromiseProvider } from '../context/PromiseContext';
import { BitacoraSheet } from '@/components/shared/bitacora';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { toast } from 'sonner';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { useContactUpdateListener } from '@/hooks/useContactRefresh';
import dynamic from 'next/dynamic';
import type { PromiseStateData } from '@/lib/actions/studio/commercial/promises/promise-state.actions';
import { PromiseContentSkeleton } from './PromiseLayoutSkeleton';

const ContractTemplateManagerModal = dynamic(
  () => import('@/components/shared/contracts/ContractTemplateManagerModal').then(mod => mod.ContractTemplateManagerModal),
  { ssr: false }
);

interface PromiseLayoutClientProps {
  studioSlug: string;
  promiseId: string;
  stateData: PromiseStateData;
  pipelineStages: PipelineStage[];
}

export function PromiseLayoutClient({
  studioSlug,
  promiseId,
  stateData,
  pipelineStages,
  children,
}: PromiseLayoutClientProps & { children: React.ReactNode }) {
  const router = useRouter();
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);

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
    // El contexto se actualizará automáticamente cuando el layout se recargue
    // Por ahora solo recargamos la página para sincronizar
    if (updatedContact) {
      router.refresh();
    }
  }, [router]);

  useContactUpdateListener(stateData.promiseData.contact_id, handleContactUpdate);

  // Cerrar overlays al montar el componente de detalle
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('close-overlays'));
  }, []);

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!promiseId || newStageId === stateData.promiseData.pipeline_stage_id) return;

    setIsChangingStage(true);
    try {
      const { movePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await movePromise(studioSlug, {
        promise_id: promiseId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Etapa actualizada correctamente');
        router.refresh();
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
    try {
      const { archivePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await archivePromise(studioSlug, promiseId);
      if (result.success) {
        toast.success('Promesa archivada correctamente');
        router.refresh();
      } else {
        toast.error(result.error || 'Error al archivar promesa');
      }
    } catch (error) {
      console.error('Error archivando promesa:', error);
      toast.error('Error al archivar promesa');
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
    <PromiseProvider promiseData={contextPromiseData} isLoading={false}>
      <div className="w-full max-w-7xl mx-auto">
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
            onTemplatesClick={() => setTemplatesModalOpen(true)}
            onAutomateClick={() => setIsShareModalOpen(true)}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDelete}
            isArchiving={false}
            isUnarchiving={false}
            isDeleting={false}
          />
          <PromiseDetailToolbar
            studioSlug={studioSlug}
            promiseId={promiseId}
            contactData={{
              contactId: contactDataForHeader.contactId,
              contactName: promiseDataForHeader.name,
              phone: promiseDataForHeader.phone,
            }}
            eventoId={stateData.promiseData.evento_id || null}
            onPreview={() => {
              const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;
              window.open(previewUrl, '_blank');
            }}
          />
          <ZenCardContent className="p-6 min-h-[600px]">
            {children || <PromiseContentSkeleton />}
          </ZenCardContent>
        </ZenCard>

        {/* Modales compartidos */}
        {promiseId && (
          <>
            <PromiseShareOptionsModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              studioSlug={studioSlug}
              promiseId={promiseId}
            />
            <BitacoraSheet
              open={logsSheetOpen}
              onOpenChange={setLogsSheetOpen}
              studioSlug={studioSlug}
              promiseId={promiseId}
            />
          </>
        )}

        <ContractTemplateManagerModal
          isOpen={templatesModalOpen}
          onClose={() => setTemplatesModalOpen(false)}
          studioSlug={studioSlug}
        />
      </div>
    </PromiseProvider>
  );
}
