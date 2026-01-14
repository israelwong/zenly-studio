'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ContactEventInfoCard } from '@/components/shared/contact-info';
import { CotizacionAutorizadaCard } from './components/CotizacionAutorizadaCard';
import { ContactEventFormModal } from '@/components/shared/contact-info';
import { getPromiseById } from '@/lib/actions/studio/commercial/promises';
import { getCotizacionAutorizadaByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

export default function PromiseAutorizadaPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;

  const [showEditModal, setShowEditModal] = useState(false);
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
  const [contactId, setContactId] = useState<string | null>(null);
  const [cotizacionAutorizada, setCotizacionAutorizada] = useState<CotizacionListItem | null>(null);
  const [loadingCotizacion, setLoadingCotizacion] = useState(true);

  // Cargar datos de la promesa y cotización autorizada
  useEffect(() => {
    const loadData = async () => {
      if (!promiseId) return;

      try {
        const [promiseResult, autorizadaResult] = await Promise.all([
          getPromiseById(promiseId),
          getCotizacionAutorizadaByPromiseId(promiseId),
        ]);

        if (promiseResult.success && promiseResult.data) {
          const data = promiseResult.data;
          setPromiseData({
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
            referrer_name: data.referrer_name || null,
            referrer_contact_name: data.referrer_contact_name || null,
            referrer_contact_email: data.referrer_contact_email || null,
          });
          setContactId(data.contact_id);
        }

        if (autorizadaResult.success && autorizadaResult.data) {
          setCotizacionAutorizada(autorizadaResult.data);
        }

        setLoadingCotizacion(false);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar los datos');
        setLoadingCotizacion(false);
      }
    };

    loadData();
  }, [promiseId]);

  const handleEditSuccess = useCallback(async () => {
    // Recargar datos después de editar
    try {
      const result = await getPromiseById(promiseId);
      if (result.success && result.data) {
        const data = result.data;
        setPromiseData({
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
          referrer_name: data.referrer_name || null,
          referrer_contact_name: data.referrer_contact_name || null,
          referrer_contact_email: data.referrer_contact_email || null,
        });
        setContactId(data.contact_id);
      }
    } catch (error) {
      console.error('Error reloading promise:', error);
    }
  }, [promiseId]);

  if (!promiseData || !contactId || loadingCotizacion) {
    return null;
  }

  if (!cotizacionAutorizada || !cotizacionAutorizada.evento_id) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Layout de 2 columnas: Info + Cotización Autorizada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
          {/* Columna 1: Información */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <ContactEventInfoCard
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

          {/* Columna 2: Cotización Autorizada */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <CotizacionAutorizadaCard
              cotizacion={cotizacionAutorizada}
              eventoId={cotizacionAutorizada.evento_id}
              studioSlug={studioSlug}
            />
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {promiseId && (
        <ContactEventFormModal
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
    </>
  );
}
