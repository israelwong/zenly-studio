'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ZenCard, ZenCardContent, ZenConfirmModal } from '@/components/ui/zen';
import { obtenerEventoDetalle, cancelarEvento, getEventPipelineStages, moveEvent, obtenerCotizacionesAutorizadasCount, type EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { EventPanel } from '../components/EventPanel';
import { BitacoraSheet } from '@/components/shared/bitacora';
import { EventDetailSkeleton } from './components/EventDetailSkeleton';
import { EventDetailHeader } from './components/EventDetailHeader';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [pipelineStages, setPipelineStages] = useState<EventPipelineStage[]>([]);
  const [currentPipelineStageId, setCurrentPipelineStageId] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cotizacionesCount, setCotizacionesCount] = useState(0);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'ZEN Studio - Evento';
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEventData(result.data);
          setCurrentPipelineStageId(result.data.stage_id);

          // Obtener número de cotizaciones autorizadas asociadas al evento
          const countResult = await obtenerCotizacionesAutorizadasCount(studioSlug, eventId);
          if (countResult.success && countResult.count !== undefined) {
            setCotizacionesCount(countResult.count);
          }
        } else {
          toast.error(result.error || 'Evento no encontrado');
          router.push(`/${studioSlug}/studio/business/events`);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Error al cargar el evento');
        router.push(`/${studioSlug}/studio/business/events`);
      } finally {
        setLoading(false);
      }
    };

    if (eventId && studioSlug) {
      loadEvent();
    }
  }, [eventId, studioSlug]);

  // Cargar pipeline stages
  useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        const result = await getEventPipelineStages(studioSlug);
        if (result.success && result.data) {
          setPipelineStages(result.data);
        }
      } catch (error) {
        console.error('Error cargando pipeline stages:', error);
      }
    };
    loadPipelineStages();
  }, [studioSlug]);

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!eventId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        setCurrentPipelineStageId(newStageId);
        toast.success('Etapa actualizada correctamente');
        // Recargar datos del evento
        const eventResult = await obtenerEventoDetalle(studioSlug, eventId);
        if (eventResult.success && eventResult.data) {
          setEventData(eventResult.data);
        }
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

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelarEvento(studioSlug, eventId);
      if (result.success) {
        toast.success('Evento cancelado correctamente');
        setShowCancelModal(false);
        router.push(`/${studioSlug}/studio/business/events`);
      } else {
        toast.error(result.error || 'Error al cancelar evento');
        setShowCancelModal(false);
      }
    } catch (error) {
      console.error('Error cancelando evento:', error);
      toast.error('Error al cancelar evento');
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  // Funciones para acciones rápidas
  const handleWhatsApp = () => {
    const phone = eventData?.promise?.contact?.phone;
    if (!phone) {
      toast.error('No hay número de teléfono disponible');
      return;
    }
    // Limpiar número (remover espacios, guiones, etc.)
    const cleanPhone = phone.replace(/\D/g, '');
    // Si no tiene código de país, agregar código de México (52)
    const phoneWithCountry = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${phoneWithCountry}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = () => {
    const phone = eventData?.promise?.contact?.phone;
    if (!phone) {
      toast.error('No hay número de teléfono disponible');
      return;
    }
    // Limpiar número para tel: link
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    window.location.href = `tel:+${phoneWithCountry}`;
  };

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (!eventData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <EventDetailHeader
          studioSlug={studioSlug}
          eventData={eventData}
          pipelineStages={pipelineStages}
          currentPipelineStageId={currentPipelineStageId}
          isChangingStage={isChangingStage}
          loading={loading}
          onPipelineStageChange={handlePipelineStageChange}
          onCancelClick={handleCancelClick}
          onLogsClick={() => setLogsSheetOpen(true)}
          onTemplatesClick={() => setTemplatesModalOpen(true)}
        />
        <ZenCardContent className="p-6">
          <EventPanel
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            onEventUpdated={async () => {
              const result = await obtenerEventoDetalle(studioSlug, eventId);
              if (result.success && result.data) {
                setEventData(result.data);
              }
            }}
          />
        </ZenCardContent>
      </ZenCard>

      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancelModal(false);
          }
        }}
        onConfirm={handleCancelConfirm}
        title="Cancelar Evento"
        description={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">
              Al cancelar este evento, se realizarán las siguientes acciones:
            </p>
            <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
              <li>El evento cambiará a estado <strong className="text-zinc-300">Cancelado</strong></li>
              {cotizacionesCount > 0 && (
                <li>
                  Se cancelarán todas las cotizaciones asociadas ({cotizacionesCount} cotización{cotizacionesCount > 1 ? 'es' : ''}). 
                  Las cotizaciones no se eliminarán, solo cambiarán su estado a <strong className="text-zinc-300">cancelada</strong>
                </li>
              )}
              {eventData?.promise_id && (
                <>
                  <li>La promesa regresará a la etapa <strong className="text-zinc-300">Pendiente</strong></li>
                  <li>Se agregará la etiqueta <strong className="text-zinc-300">Cancelada</strong> a la promesa</li>
                </>
              )}
              <li>Se eliminará el agendamiento asociado al evento</li>
            </ul>
            <p className="text-sm text-amber-400 font-medium pt-2 border-t border-zinc-800">
              ⚠️ Esta acción no se puede deshacer. ¿Deseas continuar?
            </p>
          </div>
        }
        confirmText="Sí, cancelar evento"
        cancelText="No cancelar"
        variant="destructive"
        loading={isCancelling}
      />

      {/* Sheet de bitácora */}
      {eventData?.promise?.id && (
        <BitacoraSheet
          open={logsSheetOpen}
          onOpenChange={setLogsSheetOpen}
          studioSlug={studioSlug}
          promiseId={eventData.promise.id}
        />
      )}

      {/* Modal de plantillas de contrato */}
      <ContractTemplateManagerModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        studioSlug={studioSlug}
        eventTypeId={eventData?.promise?.event_type_id || undefined}
      />
    </div>
  );
}
