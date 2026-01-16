'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { EventInfoCard } from '@/components/shared/promises';
import { PromiseQuotesPanel } from './components/cotizaciones/PromiseQuotesPanel';
import { PromiseAgendamiento } from './components/eventos/PromiseAgendamiento';
import { PromiseTags } from './components/PromiseTags';
import { EventFormModal } from '@/components/shared/promises';
import { AuthorizeCotizacionModal } from './components/cotizaciones/AuthorizeCotizacionModal';
import { PromisePendienteSkeleton } from './components/PromisePendienteSkeleton';
import { usePromiseContext } from '../context/PromiseContext';

export default function PromisePendientePage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const { promiseData: contextPromiseData, isLoading: contextLoading } = usePromiseContext();

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
  const [condicionesComerciales, setCondicionesComerciales] = useState<Array<{
    id: string;
    name: string;
    description?: string | null;
    advance_percentage?: number | null;
    discount_percentage?: number | null;
  }>>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCotizacion, setSelectedCotizacion] = useState<{
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
  } | null>(null);

  // Usar datos del contexto directamente
  useEffect(() => {
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

  const loadAuthorizationData = useCallback(async () => {
    try {
      const { obtenerCondicionesComerciales } = await import('@/lib/actions/studio/config/condiciones-comerciales.actions');
      const { getPaymentMethodsForAuthorization } = await import('@/lib/actions/studio/commercial/promises/authorize-legacy.actions');
      const { getCotizacionesByPromiseId } = await import('@/lib/actions/studio/commercial/promises/cotizaciones.actions');

      const [condicionesResult, paymentMethodsResult, cotizacionesResult] = await Promise.all([
        obtenerCondicionesComerciales(studioSlug),
        getPaymentMethodsForAuthorization(studioSlug),
        promiseId ? getCotizacionesByPromiseId(promiseId) : Promise.resolve({ success: false, data: [] }),
      ]);

      if (condicionesResult.success && condicionesResult.data) {
        setCondicionesComerciales(condicionesResult.data.map(cc => ({
          id: cc.id,
          name: cc.name,
          description: cc.description,
          advance_percentage: cc.advance_percentage,
          discount_percentage: cc.discount_percentage,
        })));
      }

      if (paymentMethodsResult.success && paymentMethodsResult.data) {
        setPaymentMethods(paymentMethodsResult.data);
      }

      // Encontrar la cotización aprobada
      if (cotizacionesResult.success && cotizacionesResult.data) {
        const approvedQuote = cotizacionesResult.data.find(
          (c) => c.status === 'aprobada' || c.status === 'autorizada' || c.status === 'approved'
        );
        if (approvedQuote) {
          setSelectedCotizacion({
            id: approvedQuote.id,
            name: approvedQuote.name,
            price: approvedQuote.price,
            status: approvedQuote.status,
            selected_by_prospect: approvedQuote.selected_by_prospect ?? false,
            condiciones_comerciales_id: approvedQuote.condiciones_comerciales_id ?? null,
            condiciones_comerciales: approvedQuote.condiciones_comerciales ? {
              id: approvedQuote.condiciones_comerciales.id,
              name: approvedQuote.condiciones_comerciales.name,
            } : null,
          });
        }
      }
    } catch (error) {
      console.error('[loadAuthorizationData] Error:', error);
    }
  }, [studioSlug, promiseId]);

  // Cargar datos necesarios para el modal de autorización
  useEffect(() => {
    if (showAuthorizeModal) {
      loadAuthorizationData();
    }
  }, [showAuthorizeModal, loadAuthorizationData]);

  const handleEditSuccess = useCallback(() => {
    // Los datos se actualizarán automáticamente a través del contexto cuando el layout recargue
    window.location.reload();
  }, []);

  // Usar datos del contexto directamente
  const contactId = contextPromiseData?.contact_id || null;
  const eventoId = contextPromiseData?.evento_id || null;

  // Mostrar skeleton mientras carga
  if (contextLoading || !contextPromiseData || !promiseData || !contactId) {
    return <PromisePendienteSkeleton />;
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

          {/* Columna 2: Cotizaciones */}
          <div className="lg:col-span-1 flex flex-col h-full">
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
          </div>

          {/* Columna 3: Agendamiento + Etiquetas */}
          <div className="lg:col-span-1 flex flex-col h-full space-y-6">
            {/* Agendamiento */}
            <PromiseAgendamiento
              studioSlug={studioSlug}
              promiseId={promiseId}
              isSaved={true}
              eventoId={eventoId}
            />

            {/* Etiquetas */}
            <PromiseTags
              studioSlug={studioSlug}
              promiseId={promiseId}
              isSaved={true}
              eventoId={eventoId}
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
