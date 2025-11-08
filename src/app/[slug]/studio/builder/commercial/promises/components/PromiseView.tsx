'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, ExternalLink, Loader2, ContactRound, Calendar } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, SeparadorZen } from '@/components/ui/zen';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/shadcn/hover-card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { formatDate } from '@/lib/actions/utils/formatting';
import { getContactById } from '@/lib/actions/studio/builder/commercial/contacts/contacts.actions';
import { PromiseLogsPanelCompact } from './PromiseLogsPanelCompact';
import { PromiseQuotesPanel } from './PromiseQuotesPanel';
import { PromiseTags } from './PromiseTags';
import { PromiseAgendamiento } from './PromiseAgendamiento';

interface PromiseViewProps {
  studioSlug: string;
  promiseId: string | null;
  contactId: string | null;
  data: {
    name: string;
    phone: string;
    email: string | null;
    event_type_id: string | null;
    event_type_name?: string | null;
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

function ContactHoverCard({
  studioSlug,
  contactId,
  displayName,
  fallbackName,
  fallbackEmail,
  whatsappMessage,
  currentContactName,
  isReferrer = false,
}: {
  studioSlug: string;
  contactId: string | null | undefined;
  displayName: string;
  fallbackName?: string | null;
  fallbackEmail?: string | null;
  whatsappMessage?: (referrerName: string, currentContactName: string) => string;
  currentContactName?: string;
  isReferrer?: boolean;
}) {
  const router = useRouter();
  const [contactData, setContactData] = useState<{
    name: string;
    phone: string;
    email: string | null;
    avatar_url: string | null;
    created_at: Date;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && contactId && !contactData && !loading) {
      setLoading(true);
      getContactById(studioSlug, contactId)
        .then((result) => {
          if (result.success && result.data) {
            setContactData({
              name: result.data.name,
              phone: result.data.phone,
              email: result.data.email,
              avatar_url: result.data.avatar_url,
              created_at: result.data.created_at,
            });
          }
        })
        .catch((error) => {
          console.error('Error loading contact:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, contactId, contactData, loading, studioSlug]);

  const handleViewContact = () => {
    if (contactId) {
      router.push(`/${studioSlug}/studio/builder/commercial/contacts?contactId=${contactId}`);
      setOpen(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let whatsappUrl = `https://wa.me/${cleanPhone}`;

    if (whatsappMessage && contactData && currentContactName) {
      const message = whatsappMessage(contactData.name, currentContactName);
      const encodedMessage = encodeURIComponent(message);
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }

    window.open(whatsappUrl, '_blank');
  };

  const finalName = contactData?.name || fallbackName || displayName;
  const finalEmail = contactData?.email || fallbackEmail || null;
  const initials = finalName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="text-sm text-zinc-200 hover:text-emerald-400 transition-colors underline decoration-dotted underline-offset-2 cursor-pointer"
        >
          {displayName}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 bg-zinc-900 border-zinc-700 p-4 relative"
        align="start"
        side="right"
      >
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : contactData || fallbackName ? (
          <div className="space-y-3">
            {contactId && (
              <button
                type="button"
                onClick={handleViewContact}
                className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition-colors"
                title="Ver contacto"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex justify-between gap-4">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage
                  src={contactData?.avatar_url || undefined}
                  alt={finalName}
                />
                <AvatarFallback className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30">
                  {initials || <ContactRound className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1 min-w-0 pr-8">
                <h4 className="text-sm font-semibold text-zinc-200 truncate">
                  {finalName}
                </h4>
                {isReferrer && contactData?.phone && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(contactData.phone)}
                      className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 group cursor-pointer"
                      title="Abrir WhatsApp"
                    >
                      <WhatsAppIcon
                        className="h-3 w-3 text-emerald-500 group-hover:text-emerald-400 transition-colors"
                        size={12}
                      />
                      <span>{contactData.phone}</span>
                    </button>
                  </div>
                )}
                {isReferrer && finalEmail && (
                  <p className="text-xs text-zinc-400 truncate">
                    {finalEmail}
                  </p>
                )}
                {contactData?.created_at && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {isReferrer ? 'Cliente desde' : 'Registrado el'}{' '}
                      {new Intl.DateTimeFormat('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }).format(new Date(contactData.created_at))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            No se pudo cargar la información del contacto
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export function PromiseView({
  studioSlug,
  promiseId,
  contactId,
  data,
  onEdit,
  isSaved,
}: PromiseViewProps) {
  return (
    <div className="space-y-6">
      {/* Layout de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Información */}
        <div className="lg:col-span-1">
          <ZenCard>
            <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
                  Información
                </ZenCardTitle>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-300"
                >
                  <Edit className="h-3.5 w-3.5" />
                </ZenButton>
              </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 space-y-4">
              {/* Datos del Contacto */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                  Datos del Contacto
                </h3>
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Nombre
                  </label>
                  {contactId ? (
                    <ContactHoverCard
                      studioSlug={studioSlug}
                      contactId={contactId}
                      displayName={data.name}
                      isReferrer={false}
                    />
                  ) : (
                  <p className="text-sm text-zinc-200">{data.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Teléfono
                  </label>
                  <p className="text-sm text-zinc-200">{data.phone}</p>
                </div>
                {data.email && (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Email
                    </label>
                    <p className="text-sm text-zinc-200">{data.email}</p>
                  </div>
                )}
              </div>

              <SeparadorZen spacing="md" variant="subtle" />

              {/* Datos del Evento */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                  Datos del Evento
                </h3>
                {data.event_type_name ? (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Tipo de Evento
                    </label>
                    <p className="text-sm text-zinc-200">{data.event_type_name}</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Tipo de Evento
                    </label>
                    <p className="text-sm text-zinc-400 italic">No especificado</p>
                  </div>
                )}
                {data.interested_dates && data.interested_dates.length > 0 ? (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Fecha(s) de Interés
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {data.interested_dates.map((date, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-600/30"
                        >
                          {formatDate(new Date(date))}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Fecha(s) de Interés
                    </label>
                    <p className="text-sm text-zinc-400 italic">Sin fechas seleccionadas</p>
                  </div>
                )}
              </div>

              <SeparadorZen spacing="md" variant="subtle" />

              {/* Canal de Adquisición */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                  Canal de Adquisición
                </h3>
                {data.acquisition_channel_name ? (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Canal
                    </label>
                    <p className="text-sm text-zinc-200">{data.acquisition_channel_name}</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Canal
                    </label>
                    <p className="text-sm text-zinc-400 italic">No especificado</p>
                  </div>
                )}
                {data.social_network_name && (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Red Social
                    </label>
                    <p className="text-sm text-zinc-200">{data.social_network_name}</p>
                  </div>
                )}
                {(data.referrer_name || data.referrer_contact_id) && (
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Referido por
                    </label>
                    <div>
                      <ContactHoverCard
                        studioSlug={studioSlug}
                        contactId={data.referrer_contact_id}
                        displayName={data.referrer_name || data.referrer_contact_name || 'Contacto referido'}
                        fallbackName={data.referrer_name || data.referrer_contact_name}
                        fallbackEmail={data.referrer_contact_email}
                        currentContactName={data.name}
                        isReferrer={true}
                        whatsappMessage={(referrerName, currentContactName) => {
                          const referrerFirstName = referrerName.split(' ')[0];
                          const referrerFirstNameCapitalized = referrerFirstName
                            ? referrerFirstName.charAt(0).toUpperCase() + referrerFirstName.slice(1).toLowerCase()
                            : '';
                          const contactNameCapitalized = currentContactName
                            ? currentContactName.charAt(0).toUpperCase() + currentContactName.slice(1).toLowerCase()
                            : currentContactName;
                          return `¡Hola ${referrerFirstNameCapitalized}! ${contactNameCapitalized} nos contacto, muchas gracias por tu recomendación, realmente lo apreciamos,`;
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>

        {/* Columna 2: Cotizaciones y Etiquetas */}
        <div className="lg:col-span-1 space-y-6">
          <PromiseQuotesPanel
            studioSlug={studioSlug}
            promiseId={promiseId}
            eventTypeId={data.event_type_id || null}
            isSaved={isSaved}
            contactId={contactId}
          />

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

        {/* Columna 3: Agendamiento y Notas */}
        <div className="lg:col-span-1 space-y-6">
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

          {/* Bitácora */}
          {isSaved && promiseId && (
            <div>
              <PromiseLogsPanelCompact
                studioSlug={studioSlug}
                promiseId={promiseId}
                contactId={contactId}
                isSaved={isSaved}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

