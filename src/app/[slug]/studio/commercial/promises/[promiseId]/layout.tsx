'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { getPromiseById, getPipelineStages } from '@/lib/actions/studio/commercial/promises';
import { getCotizacionesByPromiseId, getCotizacionAutorizadaByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { PromiseDetailHeader } from './components/PromiseDetailHeader';
import { PromiseDetailToolbar } from './components/PromiseDetailToolbar';
import { PromiseShareOptionsModal } from './components/PromiseShareOptionsModal';
import { PromiseLayoutSkeleton } from './components/PromiseLayoutSkeleton';
import { PromiseProvider } from './context/PromiseContext';
import { BitacoraSheet } from '@/components/shared/bitacora';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { toast } from 'sonner';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { useContactUpdateListener } from '@/hooks/useContactRefresh';
import dynamic from 'next/dynamic';

const ContractTemplateManagerModal = dynamic(
  () => import('@/components/shared/contracts/ContractTemplateManagerModal').then(mod => mod.ContractTemplateManagerModal),
  { ssr: false }
);

type PromiseState = 'pendiente' | 'cierre' | 'autorizada' | 'loading';

export default function PromiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<PromiseState>('loading');
  const [isArchived, setIsArchived] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [currentPipelineStageId, setCurrentPipelineStageId] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);
  const isDeterminingStateRef = React.useRef(false);
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
    duration_hours: number | null;
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

  // Determinar estado y redirigir
  useEffect(() => {
    const determineStateAndRedirect = async () => {
      if (!promiseId) return;
      
      // Evitar múltiples ejecuciones simultáneas
      if (isDeterminingStateRef.current) return;
      
      // Si ya tenemos datos y estamos en la ruta correcta, evitar recarga innecesaria
      const isInCierre = pathname.includes('/cierre');
      const isInAutorizada = pathname.includes('/autorizada');
      const isInPendiente = !isInCierre && !isInAutorizada;
      
      if (promiseData && state !== 'loading') {
        // Si ya estamos en la ruta correcta según el estado, no recargar
        if ((isInCierre && state === 'cierre') || 
            (isInAutorizada && state === 'autorizada') || 
            (isInPendiente && state === 'pendiente')) {
          return; // Ya estamos en la ruta correcta con datos cargados
        }
      }
      
      isDeterminingStateRef.current = true;

      try {
        setLoading(true);

        // Cargar datos básicos de la promesa
        const [promiseResult, cotizacionesResult, autorizadaResult, stagesResult] = await Promise.all([
          getPromiseById(promiseId),
          getCotizacionesByPromiseId(promiseId),
          getCotizacionAutorizadaByPromiseId(promiseId),
          getPipelineStages(studioSlug),
        ]);

        if (!promiseResult.success || !promiseResult.data) {
          toast.error(promiseResult.error || 'Promesa no encontrada');
          router.push(`/${studioSlug}/studio/commercial/promises`);
          return;
        }

        const data = promiseResult.data;
        
        // Establecer datos de la promesa
        setPromiseData({
          id: data.contact_id,
          name: data.contact_name,
          phone: data.contact_phone,
          email: data.contact_email,
          address: data.contact_address,
          event_type_id: data.event_type_id || null,
          event_type_name: data.event_type_name || null,
          event_location: data.event_location || null,
          event_name: data.event_name || null,
          duration_hours: data.duration_hours ?? null,
          event_date: data.event_date || null,
          interested_dates: data.interested_dates,
          acquisition_channel_id: data.acquisition_channel_id ?? null,
          acquisition_channel_name: data.acquisition_channel_name ?? null,
          social_network_id: data.social_network_id ?? null,
          social_network_name: data.social_network_name ?? null,
          referrer_contact_id: data.referrer_contact_id ?? null,
          referrer_name: data.referrer_name ?? null,
          referrer_contact_name: data.referrer_contact_name ?? null,
          referrer_contact_email: data.referrer_contact_email ?? null,
          promiseId: data.promise_id,
          has_event: data.has_event,
          evento_id: data.evento_id ?? null,
        });

        setContactData({
          contactId: data.contact_id,
          contactName: data.contact_name,
          phone: data.contact_phone,
          email: data.contact_email,
          promiseId: data.promise_id,
        });

        setIsArchived(data.pipeline_stage_slug === 'archived');
        setCurrentPipelineStageId(data.pipeline_stage_id);

        if (stagesResult.success && stagesResult.data) {
          setPipelineStages(stagesResult.data);
        }

        // Determinar estado según cotizaciones
        let newState: PromiseState = 'pendiente';
        let shouldRedirect = false;
        let targetPath = '';

        // Prioridad 1: Cotización autorizada con evento
        if (autorizadaResult.success && autorizadaResult.data && autorizadaResult.data.evento_id) {
          newState = 'autorizada';
          if (!pathname.includes('/autorizada')) {
            shouldRedirect = true;
            targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`;
          }
        }
        // Prioridad 2: Cotización en cierre o aprobada sin evento
        else if (cotizacionesResult.success && cotizacionesResult.data) {
          const cotizacionEnCierre = cotizacionesResult.data.find(c => c.status === 'en_cierre');
          const cotizacionAprobada = cotizacionesResult.data.find(
            c => (c.status === 'aprobada' || c.status === 'approved') && !c.evento_id
          );

          if (cotizacionEnCierre || cotizacionAprobada) {
            newState = 'cierre';
            if (!pathname.includes('/cierre')) {
              shouldRedirect = true;
              targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`;
            }
          } else {
            newState = 'pendiente';
            if (pathname.includes('/cierre') || pathname.includes('/autorizada')) {
              shouldRedirect = true;
              targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}`;
            }
          }
        } else {
          newState = 'pendiente';
          if (pathname.includes('/cierre') || pathname.includes('/autorizada')) {
            shouldRedirect = true;
            targetPath = `/${studioSlug}/studio/commercial/promises/${promiseId}`;
          }
        }

        setState(newState);
        setLoading(false);

        // Redirigir después de establecer el estado
        if (shouldRedirect && targetPath) {
          router.replace(targetPath);
        }
      } catch (error) {
        console.error('Error determining state:', error);
        toast.error('Error al cargar la promesa');
        router.push(`/${studioSlug}/studio/commercial/promises`);
      } finally {
        isDeterminingStateRef.current = false;
      }
    };

    determineStateAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promiseId, studioSlug, pathname]);

  // Callback para manejar actualizaciones de contacto
  const handleContactUpdate = React.useCallback((updatedContact: {
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
    }
  }, [promiseData]);

  useContactUpdateListener(promiseData?.id || null, handleContactUpdate);

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!promiseId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const { movePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await movePromise(studioSlug, {
        promise_id: promiseId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        setCurrentPipelineStageId(newStageId);
        const newStage = pipelineStages.find((s) => s.id === newStageId);
        setIsArchived(newStage?.slug === 'archived');
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
    try {
      const { archivePromise } = await import('@/lib/actions/studio/commercial/promises');
      const result = await archivePromise(studioSlug, promiseId);
      if (result.success) {
        setIsArchived(true);
        const archivedStage = pipelineStages.find((s) => s.slug === 'archived');
        if (archivedStage) {
          setCurrentPipelineStageId(archivedStage.id);
        }
        toast.success('Promesa archivada correctamente');
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
        setIsArchived(false);
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
  const contextPromiseData = promiseData ? {
    id: promiseData.id,
    name: promiseData.name,
    phone: promiseData.phone,
    email: promiseData.email,
    address: promiseData.address,
    event_type_id: promiseData.event_type_id,
    event_type_name: promiseData.event_type_name,
    event_location: promiseData.event_location,
    event_name: promiseData.event_name,
    duration_hours: promiseData.duration_hours,
    event_date: promiseData.event_date,
    interested_dates: promiseData.interested_dates,
    acquisition_channel_id: promiseData.acquisition_channel_id,
    acquisition_channel_name: promiseData.acquisition_channel_name,
    social_network_id: promiseData.social_network_id,
    social_network_name: promiseData.social_network_name,
    referrer_contact_id: promiseData.referrer_contact_id,
    referrer_name: promiseData.referrer_name,
    referrer_contact_name: promiseData.referrer_contact_name,
    referrer_contact_email: promiseData.referrer_contact_email,
    contact_id: contactData?.contactId || promiseData.id,
    evento_id: promiseData.evento_id,
    promise_id: promiseData.promiseId || promiseId,
  } : null;

  if (loading || !promiseData) {
    // Renderizar layout skeleton pero permitir que children manejen su propio skeleton
    return (
      <PromiseProvider promiseData={null} isLoading={true}>
        <PromiseLayoutSkeleton>{children}</PromiseLayoutSkeleton>
      </PromiseProvider>
    );
  }

  return (
    <PromiseProvider promiseData={contextPromiseData} isLoading={false}>
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <PromiseDetailHeader
            studioSlug={studioSlug}
            promiseId={promiseId}
            loading={loading}
            pipelineStages={pipelineStages}
            currentPipelineStageId={currentPipelineStageId}
            isChangingStage={isChangingStage}
            promiseData={promiseData}
            contactData={contactData}
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
            contactData={contactData ? {
              contactId: contactData.contactId,
              contactName: promiseData.name,
              phone: promiseData.phone,
            } : null}
            eventoId={promiseData.evento_id || null}
            onPreview={() => {
              const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;
              window.open(previewUrl, '_blank');
            }}
          />
          <ZenCardContent className="p-6">
            {children}
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
