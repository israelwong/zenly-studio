'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { EventInfoCard } from '@/components/shared/promises';
import { PromiseQuotesPanel } from './cotizaciones/PromiseQuotesPanel';
import { PromiseAgendamiento } from './eventos/PromiseAgendamiento';
import { PromiseTags } from './PromiseTags';
import { PromiseStatsCard } from './PromiseStatsCard';
import { PromiseReminderCard } from './PromiseReminderCard';
import { EventFormModal } from '@/components/shared/promises';
import { AuthorizeCotizacionModal } from './cotizaciones/AuthorizeCotizacionModal';
import { usePromiseContext } from '../../context/PromiseContext';

interface PromisePendienteClientProps {
  initialCondicionesComerciales: Array<{
    id: string;
    name: string;
    description?: string | null;
    advance_percentage?: number | null;
    discount_percentage?: number | null;
  }>;
  initialPaymentMethods: Array<{ id: string; name: string }>;
  initialSelectedCotizacion: {
    id: string;
    name: string;
    price: number;
    status: string;
    selected_by_prospect: boolean;
    condiciones_comerciales_id: string | null;
    condiciones_comerciales?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export function PromisePendienteClient({
  initialCondicionesComerciales,
  initialPaymentMethods,
  initialSelectedCotizacion,
}: PromisePendienteClientProps) {
  const params = useParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const { promiseData: contextPromiseData } = usePromiseContext();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [promiseData, setPromiseData] = useState<{
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
  } | null>(null);
  const [condicionesComerciales] = useState(initialCondicionesComerciales);
  const [paymentMethods] = useState(initialPaymentMethods);
  const [selectedCotizacion, setSelectedCotizacion] = useState(initialSelectedCotizacion);

  // Sincronizar datos del contexto
  React.useEffect(() => {
    if (contextPromiseData) {
      setPromiseData({
        name: contextPromiseData.name,
        phone: contextPromiseData.phone,
        email: contextPromiseData.email,
        address: contextPromiseData.address,
        event_type_id: contextPromiseData.event_type_id,
        event_type_name: contextPromiseData.event_type_name,
        event_location: contextPromiseData.event_location,
        event_name: contextPromiseData.event_name,
        duration_hours: contextPromiseData.duration_hours,
        event_date: contextPromiseData.event_date,
        interested_dates: contextPromiseData.interested_dates,
        acquisition_channel_id: contextPromiseData.acquisition_channel_id,
        acquisition_channel_name: contextPromiseData.acquisition_channel_name,
        social_network_id: contextPromiseData.social_network_id,
        social_network_name: contextPromiseData.social_network_name,
        referrer_contact_id: contextPromiseData.referrer_contact_id,
        referrer_name: contextPromiseData.referrer_name,
        referrer_contact_name: contextPromiseData.referrer_contact_name,
        referrer_contact_email: contextPromiseData.referrer_contact_email,
      });
    }
  }, [contextPromiseData]);

  const handleEditSuccess = useCallback((updatedData?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    acquisition_channel_id?: string | null;
    social_network_id?: string | null;
    referrer_contact_id?: string | null;
    referrer_name?: string | null;
    event_type_id?: string | null;
    event_name?: string | null;
    event_location?: string | null;
    duration_hours?: number | null;
    event_type?: string | null;
    interested_dates?: string[] | null;
    event_date?: Date | string | null;
  }) => {
    if (updatedData) {
      setPromiseData((prev) => prev ? {
        ...prev,
        name: updatedData.name,
        phone: updatedData.phone,
        email: updatedData.email,
        address: updatedData.address,
        event_type_id: updatedData.event_type_id || null,
        event_type_name: updatedData.event_type || null,
        event_location: updatedData.event_location || null,
        event_name: updatedData.event_name || null,
        duration_hours: updatedData.duration_hours ?? null,
        event_date: updatedData.event_date ? (typeof updatedData.event_date === 'string' ? new Date(updatedData.event_date) : updatedData.event_date) : null,
        interested_dates: updatedData.interested_dates || null,
        acquisition_channel_id: updatedData.acquisition_channel_id || null,
        social_network_id: updatedData.social_network_id || null,
        referrer_contact_id: updatedData.referrer_contact_id || null,
        referrer_name: updatedData.referrer_name || null,
      } : null);
    }
  }, []);

  const contactId = contextPromiseData?.contact_id || null;
  const eventoId = contextPromiseData?.evento_id || null;

  if (!contextPromiseData || !promiseData || !contactId) {
    return null; // El skeleton se muestra en loading.tsx
  }

  return (
    <>
      <div className="space-y-6">
        {/* Layout de 3 columnas: Info + Cotizaciones + Etiquetas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Columna 1: Información */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <EventInfoCard
              studioSlug={studioSlug}
              contactId={contactId}
              contactData={{
                name: promiseData.name,
                phone: promiseData.phone,
                email: promiseData.email,
                address: promiseData.address || null,
              }}
              eventData={{
                event_type_id: promiseData.event_type_id,
                event_type_name: promiseData.event_type_name || null,
                event_location: promiseData.event_location || null,
                event_name: promiseData.event_name || null,
                duration_hours: promiseData.duration_hours ?? null,
                event_date: promiseData.event_date || null,
                interested_dates: promiseData.interested_dates,
              }}
              acquisitionData={{
                acquisition_channel_id: promiseData.acquisition_channel_id,
                acquisition_channel_name: promiseData.acquisition_channel_name || null,
                social_network_id: promiseData.social_network_id,
                social_network_name: promiseData.social_network_name || null,
                referrer_contact_id: promiseData.referrer_contact_id,
                referrer_name: promiseData.referrer_name,
                referrer_contact_name: promiseData.referrer_contact_name,
                referrer_contact_email: promiseData.referrer_contact_email,
              }}
              promiseId={promiseId}
              promiseData={promiseId ? {
                id: promiseId,
                name: promiseData.name,
                phone: promiseData.phone,
                email: promiseData.email || null,
                address: promiseData.address || null,
                event_type_id: promiseData.event_type_id,
                event_location: promiseData.event_location || null,
                event_name: promiseData.event_name || null,
                interested_dates: promiseData.interested_dates,
                acquisition_channel_id: promiseData.acquisition_channel_id || null,
                social_network_id: promiseData.social_network_id || null,
                referrer_contact_id: promiseData.referrer_contact_id || null,
                referrer_name: promiseData.referrer_name || null,
              } : null}
              onEdit={() => setShowEditModal(true)}
              context="promise"
            />
          </div>

          {/* Columna 2: Cotizaciones + Etiquetas */}
          <div className="lg:col-span-1 flex flex-col h-full space-y-6">
            {/* Cotizaciones */}
            <PromiseQuotesPanel
              studioSlug={studioSlug}
              promiseId={promiseId}
              eventTypeId={promiseData.event_type_id || null}
              isSaved={true}
              contactId={contactId}
              promiseData={{
                name: promiseData.name,
                phone: promiseData.phone,
                email: promiseData.email,
                address: promiseData.address || null,
                event_date: promiseData.event_date || null,
                event_name: promiseData.event_name || null,
                event_type_name: promiseData.event_type_name || null,
              }}
              isLoadingPromiseData={false}
              onAuthorizeClick={() => setShowAuthorizeModal(true)}
            />

            {/* Etiquetas */}
            <PromiseTags
              studioSlug={studioSlug}
              promiseId={promiseId}
              isSaved={true}
              eventoId={eventoId}
            />
          </div>

          {/* Columna 3: Seguimiento + Agendamiento + Estadísticas */}
          <div className="lg:col-span-1 flex flex-col h-full space-y-6">
            {/* Seguimiento (Reminder) */}
            <PromiseReminderCard
              studioSlug={studioSlug}
              promiseId={promiseId}
            />

            {/* Agendamiento */}
            <PromiseAgendamiento
              studioSlug={studioSlug}
              promiseId={promiseId}
              isSaved={true}
              eventoId={eventoId}
            />

            {/* Estadísticas */}
            <PromiseStatsCard
              studioSlug={studioSlug}
              promiseId={promiseId}
            />
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {promiseId && (
        <EventFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          studioSlug={studioSlug}
          context="promise"
          initialData={{
            id: contactId || undefined,
            name: promiseData.name,
            phone: promiseData.phone,
            email: promiseData.email || undefined,
            address: promiseData.address || undefined,
            event_type_id: promiseData.event_type_id || undefined,
            event_location: promiseData.event_location || undefined,
            event_name: promiseData.event_name || undefined,
            duration_hours: promiseData.duration_hours ?? undefined,
            event_date: promiseData.event_date || undefined,
            interested_dates: promiseData.interested_dates || undefined,
            acquisition_channel_id: promiseData.acquisition_channel_id || undefined,
            social_network_id: promiseData.social_network_id || undefined,
            referrer_contact_id: promiseData.referrer_contact_id || undefined,
            referrer_name: promiseData.referrer_name || undefined,
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Modal de Autorización */}
      {showAuthorizeModal && selectedCotizacion && promiseId && (
        <AuthorizeCotizacionModal
          isOpen={showAuthorizeModal}
          onClose={() => {
            if (!showAuthorizeModal) return;
            setShowAuthorizeModal(false);
          }}
          cotizacion={selectedCotizacion}
          promiseId={promiseId}
          studioSlug={studioSlug}
          condicionesComerciales={condicionesComerciales}
          paymentMethods={paymentMethods}
          onSuccess={async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
