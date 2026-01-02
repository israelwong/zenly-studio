'use client';

import React, { useState, useEffect } from 'react';
import { ContactEventInfoCard } from '@/components/shared/contact-info';
import { PromiseQuotesPanel } from './cotizaciones/PromiseQuotesPanel';
import { PromiseTags } from './PromiseTags';
import { PromiseAgendamiento } from './eventos/PromiseAgendamiento';
import { ContactEventFormModal } from '@/components/shared/contact-info';
import { AuthorizeCotizacionModal } from './cotizaciones/AuthorizeCotizacionModal';
import { PromiseClosingProcessSection } from './cierre/PromiseClosingProcessSection';

interface PromiseCardViewProps {
  studioSlug: string;
  promiseId: string | null;
  contactId: string | null;
  data: {
    name: string;
    phone: string;
    email: string | null;
    address?: string | null;
    event_type_id: string | null;
    event_type_name?: string | null;
    event_location?: string | null;
    event_name?: string | null;
    event_date?: Date | null;
    interested_dates: string[] | null;
    acquisition_channel_id?: string | null;
    acquisition_channel_name?: string | null;
    social_network_id?: string | null;
    social_network_name?: string | null;
    referrer_contact_id?: string | null;
    referrer_name?: string | null;
    referrer_contact_name?: string | null;
    referrer_contact_email?: string | null;
  };
  onEdit: () => void;
  isSaved: boolean;
}

export function PromiseCardView({
  studioSlug,
  promiseId,
  contactId,
  data,
  onEdit,
  isSaved,
}: PromiseCardViewProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
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

  // Cargar datos necesarios para el modal de autorización
  useEffect(() => {
    if (showAuthorizeModal) {
      loadAuthorizationData();
    }
  }, [showAuthorizeModal]);

  const loadAuthorizationData = async () => {
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
          (c) => (c.status === 'aprobada' || c.status === 'autorizada' || c.status === 'approved') && !c.archived
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
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      setShowEditModal(true);
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Layout de 3 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Columna 1: Información */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <ContactEventInfoCard
              studioSlug={studioSlug}
              contactId={contactId}
              contactData={{
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: data.address || null,
              }}
              eventData={{
                event_type_id: data.event_type_id,
                event_type_name: data.event_type_name || null,
                event_location: data.event_location || null,
                event_name: data.event_name || null,
                event_date: data.event_date || null,
                interested_dates: data.interested_dates,
              }}
              acquisitionData={{
                acquisition_channel_id: data.acquisition_channel_id,
                acquisition_channel_name: data.acquisition_channel_name || null,
                social_network_id: data.social_network_id,
                social_network_name: data.social_network_name || null,
                referrer_contact_id: data.referrer_contact_id,
                referrer_name: data.referrer_name,
                referrer_contact_name: data.referrer_contact_name,
                referrer_contact_email: data.referrer_contact_email,
              }}
              promiseId={promiseId}
              promiseData={promiseId ? {
                id: promiseId,
                name: data.name,
                phone: data.phone,
                email: data.email || null,
                address: data.address || null,
                event_type_id: data.event_type_id,
                event_location: data.event_location || null,
                event_name: data.event_name || null,
                interested_dates: data.interested_dates,
                acquisition_channel_id: data.acquisition_channel_id || null,
                social_network_id: data.social_network_id || null,
                referrer_contact_id: data.referrer_contact_id || null,
                referrer_name: data.referrer_name || null,
              } : null}
              onEdit={handleEdit}
              context="promise"
            />
          </div>

          {/* Columna 2: Cotizaciones + Agendamiento + Etiquetas */}
          <div className="lg:col-span-1 space-y-6">
            {/* Cotizaciones */}
            <PromiseQuotesPanel
              studioSlug={studioSlug}
              promiseId={promiseId}
              eventTypeId={data.event_type_id || null}
              isSaved={isSaved}
              contactId={contactId}
              promiseData={{
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: data.address || null,
                event_date: data.event_date || null,
                event_name: data.event_name || null,
                event_type_name: data.event_type_name || null,
              }}
              isLoadingPromiseData={false}
              onAuthorizeClick={() => setShowAuthorizeModal(true)}
            />

            {/* Agendamiento (solo si está guardado) */}
            {isSaved && promiseId && (
              <div>
                <PromiseAgendamiento
                  studioSlug={studioSlug}
                  promiseId={promiseId}
                  isSaved={isSaved}
                />
              </div>
            )}

            {/* Etiquetas (solo si está guardado) */}
            {isSaved && promiseId && (
              <div>
                <PromiseTags
                  studioSlug={studioSlug}
                  promiseId={promiseId}
                  isSaved={isSaved}
                />
              </div>
            )}
          </div>

          {/* Columna 3: Proceso de Cierre */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <PromiseClosingProcessSection
              studioSlug={studioSlug}
              promiseId={promiseId}
              promiseData={{
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: data.address || null,
                event_date: data.event_date || null,
                event_name: data.event_name || null,
                event_type_name: data.event_type_name || null,
                event_location: data.event_location || null,
              }}
              onAuthorizeClick={() => setShowAuthorizeModal(true)}
              contactId={contactId || undefined}
              eventTypeId={data.event_type_id || null}
              acquisitionChannelId={data.acquisition_channel_id || null}
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
            name: data.name,
            phone: data.phone,
            email: data.email || undefined,
            address: data.address || undefined,
            event_type_id: data.event_type_id || undefined,
            event_location: data.event_location || undefined,
            event_name: data.event_name || undefined,
            event_date: data.event_date || undefined,
            interested_dates: data.interested_dates || undefined,
            acquisition_channel_id: data.acquisition_channel_id || undefined,
            social_network_id: data.social_network_id || undefined,
            referrer_contact_id: data.referrer_contact_id || undefined,
            referrer_name: data.referrer_name || undefined,
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Modal de Autorización */}
      {showAuthorizeModal && selectedCotizacion && promiseId && (
        <AuthorizeCotizacionModal
          isOpen={showAuthorizeModal}
          onClose={() => setShowAuthorizeModal(false)}
          cotizacion={selectedCotizacion}
          promiseId={promiseId}
          studioSlug={studioSlug}
          condicionesComerciales={condicionesComerciales}
          paymentMethods={paymentMethods}
          onSuccess={() => {
            setShowAuthorizeModal(false);
            // Recargar página para reflejar cambios
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

export default PromiseCardView;
