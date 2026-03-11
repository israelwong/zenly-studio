'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EventInfoCard } from '@/components/shared/promises';
import { CotizacionAutorizadaCard } from './CotizacionAutorizadaCard';
import { AnexosSection } from './AnexosSection';
import { EventFormModal } from '@/components/shared/promises';
import { usePromiseContext } from '../../context/PromiseContext';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface PromiseAutorizadaClientProps {
  initialCotizacionAutorizada: CotizacionListItem | null;
  initialAnexos: CotizacionListItem[];
}

export function PromiseAutorizadaClient({
  initialCotizacionAutorizada,
  initialAnexos,
}: PromiseAutorizadaClientProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const { promiseData: contextPromiseData } = usePromiseContext();

  const [showEditModal, setShowEditModal] = useState(false);
  const [cotizacionAutorizada] = React.useState(initialCotizacionAutorizada);

  const handleEditSuccess = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // Usar datos del contexto directamente
  const contactId = contextPromiseData?.contact_id || null;

  if (!contextPromiseData || !contactId) {
    return null; // El skeleton se muestra en loading.tsx
  }

  if (!cotizacionAutorizada || !cotizacionAutorizada.evento_id) {
    return null;
  }

  const promiseData = {
    name: contextPromiseData.name,
    phone: contextPromiseData.phone,
    email: contextPromiseData.email,
    address: contextPromiseData.address,
    event_type_id: contextPromiseData.event_type_id,
    event_type_name: contextPromiseData.event_type_name,
    event_location: contextPromiseData.event_location,
    event_location_id: contextPromiseData.event_location_id ?? undefined,
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
  };

  return (
    <>
      <div className="space-y-6">
        {/* Layout de 3 columnas: Info | Cotización Autorizada | Anexos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Columna 1: Información del contacto y evento */}
          <div className="flex flex-col h-full">
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
                event_location_id: promiseData.event_location_id ?? null,
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

          {/* Columna 2: Cotización principal autorizada */}
          <div className="flex flex-col h-full">
            <CotizacionAutorizadaCard
              cotizacion={cotizacionAutorizada}
              eventoId={cotizacionAutorizada.evento_id}
              studioSlug={studioSlug}
            />
          </div>

          {/* Columna 3: Propuestas adicionales (Anexos) */}
          <div className="flex flex-col h-full">
            <AnexosSection
              anexos={initialAnexos}
              studioSlug={studioSlug}
              promiseId={promiseId}
              parentCotizacionId={cotizacionAutorizada.id}
              eventoIdPrincipal={cotizacionAutorizada.evento_id ?? null}
              onRefresh={handleRefresh}
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
          contextSource="autorizada"
          promiseId={promiseId ?? undefined}
          eventoId={cotizacionAutorizada?.evento_id ?? undefined}
          initialData={{
            id: contactId || undefined,
            name: promiseData.name,
            phone: promiseData.phone,
            email: promiseData.email || undefined,
            address: promiseData.address || undefined,
            event_type_id: promiseData.event_type_id || undefined,
            event_location: promiseData.event_location || undefined,
            event_location_id: promiseData.event_location_id ?? undefined,
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
    </>
  );
}
