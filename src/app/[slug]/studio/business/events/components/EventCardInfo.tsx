'use client';

import React, { useState } from 'react';
import { Edit, MapPin, Calendar } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { formatDate } from '@/lib/actions/utils/formatting';
import { ContactEventFormModal } from '@/components/shared/contact-info';

interface EventCardInfoProps {
  studioSlug: string;
  eventId: string;
  initialData: {
    name: string | null;
    event_date: Date;
    address: string | null;
    sede: string | null;
    event_type?: {
      id: string;
      name: string;
    } | null;
    promise_id?: string | null;
    promise_data?: {
      id: string;
      event_type_id: string | null;
      event_location: string | null;
      interested_dates: string[] | null;
      acquisition_channel_id: string | null;
      social_network_id: string | null;
      referrer_contact_id: string | null;
      referrer_name: string | null;
      contact: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
      };
    } | null;
  };
  onEdit?: () => void;
  onEventUpdated?: () => void;
}

export function EventCardInfo({
  studioSlug,
  eventId,
  initialData,
  onEdit,
  onEventUpdated,
}: EventCardInfoProps) {
  const [showPromiseModal, setShowPromiseModal] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else if (initialData.promise_id && initialData.promise_data) {
      // Abrir modal de promesa
      setShowPromiseModal(true);
    }
  };

  const handlePromiseSuccess = () => {
    setShowPromiseModal(false);
    if (onEventUpdated) {
      onEventUpdated();
    }
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Datos del Evento
            </ZenCardTitle>
            {(onEdit || (initialData.promise_id && initialData.promise_data)) && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
              >
                <Edit className="h-3.5 w-3.5" />
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Nombre del Evento
            </label>
            <p className="text-sm text-zinc-200 font-medium">
              {initialData.name || 'Sin nombre'}
            </p>
          </div>

          {initialData.event_type && (
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Tipo de Evento
              </label>
              <p className="text-sm text-zinc-200">{initialData.event_type.name}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Fecha del Evento
            </label>
            <p className="text-sm text-zinc-200">
              {formatDate(initialData.event_date)}
            </p>
          </div>

          {initialData.address && (
            <div>
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5" />
                Dirección
              </label>
              <p className="text-sm text-zinc-200">{initialData.address}</p>
            </div>
          )}

          {initialData.sede && (
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Sede
              </label>
              <p className="text-sm text-zinc-200">{initialData.sede}</p>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal de promesa */}
      {initialData.promise_id && initialData.promise_data && (
        <ContactEventFormModal
          isOpen={showPromiseModal}
          onClose={() => setShowPromiseModal(false)}
          studioSlug={studioSlug}
          initialData={{
            id: initialData.promise_data.id,
            name: initialData.promise_data.contact.name,
            phone: initialData.promise_data.contact.phone,
            email: initialData.promise_data.contact.email || undefined,
            event_type_id: initialData.promise_data.event_type_id || undefined,
            event_location: initialData.promise_data.event_location || undefined,
            interested_dates: initialData.promise_data.interested_dates || undefined,
            acquisition_channel_id: initialData.promise_data.acquisition_channel_id || undefined,
            social_network_id: initialData.promise_data.social_network_id || undefined,
            referrer_contact_id: initialData.promise_data.referrer_contact_id || undefined,
            referrer_name: initialData.promise_data.referrer_name || undefined,
          }}
          onSuccess={handlePromiseSuccess}
        />
      )}
    </>
  );
}

