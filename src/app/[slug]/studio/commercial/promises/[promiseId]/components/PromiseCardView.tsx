'use client';

import React, { useState } from 'react';
import { ContactEventInfoCard } from '@/components/shared/contact-info';
import { PromiseQuotesPanel } from './PromiseQuotesPanel';
import { PromiseTags } from './PromiseTags';
import { PromiseAgendamiento } from './PromiseAgendamiento';
import { ContactEventFormModal } from '@/components/shared/contact-info';
import { PromiseQuickActions } from './PromiseQuickActions';

interface PromiseCardViewProps {
  studioSlug: string;
  promiseId: string | null;
  contactId: string | null;
  data: {
    name: string;
    phone: string;
    email: string | null;
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna 1: Información */}
          <div className="lg:col-span-1">
            <ContactEventInfoCard
              studioSlug={studioSlug}
              contactId={contactId}
              contactData={{
                name: data.name,
                phone: data.phone,
                email: data.email,
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

          {/* Columna 2: Acciones Rápidas + Agendamiento + Etiquetas */}
          <div className="lg:col-span-1 space-y-6">
            {/* Acciones Rápidas (solo si está guardado) */}
            {isSaved && promiseId && contactId && (
              <PromiseQuickActions
                studioSlug={studioSlug}
                contactId={contactId}
                contactName={data.name}
                phone={data.phone}
                email={data.email}
                promiseId={promiseId}
              />
            )}

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

          {/* Columna 3: Cotizaciones + Contrato */}
          <div className="lg:col-span-1 space-y-6">
            <PromiseQuotesPanel
              studioSlug={studioSlug}
              promiseId={promiseId}
              eventTypeId={data.event_type_id || null}
              isSaved={isSaved}
              contactId={contactId}
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
            id: promiseId,
            name: data.name,
            phone: data.phone,
            email: data.email || undefined,
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
    </>
  );
}
