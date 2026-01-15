'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, ArrowLeft, Plus, Calendar } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge } from '@/components/ui/zen';
import { getContactById, getContactEvents, createStandaloneEvent } from '@/lib/actions/studio/commercial/contacts';
import { ContactModal } from '@/components/shared/contacts/ContactModal';
import { Contact } from '@/lib/actions/schemas/contacts-schemas';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { getEventTypes } from '@/lib/actions/studio/commercial/promises';
import { ZenDialog, ZenInput, ZenSelect } from '@/components/ui/zen';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { CalendarIcon } from 'lucide-react';
import { es } from 'date-fns/locale';

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<Array<{
    id: string;
    name: string;
    event_date: Date;
    status: string;
    event_type: string | null;
    promise_id: string;
    cotizacion_id: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    name: '',
    event_date: undefined as Date | undefined,
    event_type_id: '',
    event_location: '',
  });
  const [eventFormErrors, setEventFormErrors] = useState<{
    name?: string;
    event_date?: string;
  }>({});

  useEffect(() => {
    if (contact) {
      document.title = `Zenly Studio - ${contact.name}`;
    }
  }, [contact]);

  const loadContact = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getContactById(studioSlug, contactId);
      if (result.success && result.data) {
        setContact(result.data);
      } else {
        toast.error(result.error || 'Error al cargar cliente');
        router.push(`/${studioSlug}/studio/business/clientes`);
      }
    } catch (error) {
      console.error('Error al cargar cliente:', error);
      toast.error('Error al cargar cliente');
      router.push(`/${studioSlug}/studio/business/clientes`);
    } finally {
      setLoading(false);
    }
  }, [studioSlug, contactId, router]);

  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const result = await getContactEvents(studioSlug, contactId);
      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        toast.error(result.error || 'Error al cargar eventos');
      }
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoadingEvents(false);
    }
  }, [studioSlug, contactId]);

  const loadEventTypes = useCallback(async () => {
    try {
      const result = await getEventTypes(studioSlug);
      if (result.success && result.data) {
        setEventTypes(result.data);
      }
    } catch (error) {
      console.error('Error al cargar tipos de evento:', error);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadContact();
    loadEvents();
    loadEventTypes();
  }, [loadContact, loadEvents, loadEventTypes]);

  const handleContactUpdate = (updatedContact?: Contact) => {
    if (updatedContact) {
      setContact(updatedContact);
    }
    loadContact();
    setIsContactModalOpen(false);
  };

  const handleEventCreate = () => {
    setEventFormData({
      name: '',
      event_date: undefined,
      event_type_id: '',
      event_location: '',
    });
    setEventFormErrors({});
    setIsEventModalOpen(true);
  };

  const handleEventSuccess = () => {
    loadEvents();
    setIsEventModalOpen(false);
  };

  const handleEventSubmit = async () => {
    // Validar formulario
    const errors: { name?: string; event_date?: string } = {};
    
    if (!eventFormData.name.trim()) {
      errors.name = 'El nombre del evento es requerido';
    }
    
    if (!eventFormData.event_date) {
      errors.event_date = 'La fecha del evento es requerida';
    }
    
    if (Object.keys(errors).length > 0) {
      setEventFormErrors(errors);
      return;
    }
    
    setIsCreatingEvent(true);
    try {
      const result = await createStandaloneEvent(studioSlug, contactId, {
        name: eventFormData.name,
        event_date: eventFormData.event_date!,
        event_type_id: eventFormData.event_type_id || null,
        event_location: eventFormData.event_location || null,
      });
      
      if (result.success) {
        toast.success('Evento creado exitosamente');
        handleEventSuccess();
      } else {
        toast.error(result.error || 'Error al crear evento');
      }
    } catch (error) {
      console.error('Error al crear evento:', error);
      toast.error('Error al crear evento');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
        <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
          <ZenCardContent className="p-6">
            <div className="space-y-4">
              <div className="h-8 bg-zinc-800 rounded animate-pulse w-64" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-48" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/clientes`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </ZenButton>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  {contact.avatar_url ? (
                    <img
                      src={contact.avatar_url}
                      alt={contact.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <ZenCardTitle>{contact.name}</ZenCardTitle>
                  <ZenCardDescription>
                    {contact.phone} {contact.email && `• ${contact.email}`}
                  </ZenCardDescription>
                </div>
                <ZenBadge
                  variant={contact.status === 'cliente' ? 'default' : 'secondary'}
                  size="sm"
                >
                  {contact.status === 'cliente' ? 'Cliente' : 'Prospecto'}
                </ZenBadge>
              </div>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna 1: Formulario de contacto */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Información del Contacto</h2>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContactModalOpen(true)}
                >
                  Editar
                </ZenButton>
              </div>
              <ZenCard variant="default" padding="default">
                <ZenCardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400">Nombre</label>
                    <p className="text-white mt-1">{contact.name}</p>
                  </div>
                  {contact.phone && (
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Teléfono</label>
                      <p className="text-white mt-1">{contact.phone}</p>
                    </div>
                  )}
                  {contact.email && (
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Email</label>
                      <p className="text-white mt-1">{contact.email}</p>
                    </div>
                  )}
                  {contact.address && (
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Dirección</label>
                      <p className="text-white mt-1">{contact.address}</p>
                    </div>
                  )}
                  {contact.notes && (
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Notas</label>
                      <p className="text-white mt-1 whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  )}
                </ZenCardContent>
              </ZenCard>
            </div>

            {/* Columna 2: Eventos asociados */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Eventos Asociados</h2>
                <ZenButton
                  onClick={handleEventCreate}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Evento
                </ZenButton>
              </div>
              <ZenCard variant="default" padding="default">
                <ZenCardContent>
                  {loadingEvents ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="h-12 w-12 text-zinc-600 mb-4" />
                      <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                        No hay eventos
                      </h3>
                      <p className="text-sm text-zinc-500 mb-4">
                        Agrega eventos pasados o futuros asociados a este cliente
                      </p>
                      <ZenButton onClick={handleEventCreate} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Evento
                      </ZenButton>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event.id)}
                          className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">
                                {event.name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(event.event_date)}</span>
                                {event.event_type && (
                                  <>
                                    <span>•</span>
                                    <span>{event.event_type}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ZenBadge
                              variant={event.status === 'ACTIVE' ? 'default' : 'secondary'}
                              size="sm"
                            >
                              {event.status === 'ACTIVE' ? 'Activo' : event.status}
                            </ZenBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ZenCardContent>
              </ZenCard>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal de contacto */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contactId={contactId}
        studioSlug={studioSlug}
        onSuccess={handleContactUpdate}
      />

      {/* Modal de evento standalone */}
      <ZenDialog
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Nuevo Evento"
        description="Registra un evento asociado a este cliente"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Nombre del Evento *
            </label>
            <ZenInput
              value={eventFormData.name}
              onChange={(e) => setEventFormData({ ...eventFormData, name: e.target.value })}
              placeholder="Ej: Boda de Juan y María"
              error={eventFormErrors.name}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Fecha del Evento *
            </label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <ZenButton
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventFormData.event_date ? (
                    formatDisplayDate(eventFormData.event_date)
                  ) : (
                    <span className="text-zinc-500">Selecciona una fecha</span>
                  )}
                </ZenButton>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={eventFormData.event_date}
                  onSelect={(date) => {
                    if (date) {
                      setEventFormData({ ...eventFormData, event_date: date });
                      setCalendarOpen(false);
                    }
                  }}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {eventFormErrors.event_date && (
              <p className="text-sm text-red-400 mt-1">{eventFormErrors.event_date}</p>
            )}
          </div>

          {eventTypes.length > 0 && (
            <div>
              <ZenSelect
                label="Tipo de Evento"
                value={eventFormData.event_type_id}
                onValueChange={(value) => setEventFormData({ ...eventFormData, event_type_id: value })}
                options={[
                  { value: '', label: 'Seleccionar tipo' },
                  ...eventTypes.map((type) => ({ value: type.id, label: type.name }))
                ]}
                placeholder="Seleccionar tipo"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Lugar del Evento
            </label>
            <ZenInput
              value={eventFormData.event_location}
              onChange={(e) => setEventFormData({ ...eventFormData, event_location: e.target.value })}
              placeholder="Ej: Salón de eventos, dirección..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <ZenButton
              variant="outline"
              onClick={() => setIsEventModalOpen(false)}
              disabled={isCreatingEvent}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              onClick={handleEventSubmit}
              disabled={isCreatingEvent}
              loading={isCreatingEvent}
            >
              Crear Evento
            </ZenButton>
          </div>
        </div>
      </ZenDialog>
    </div>
  );
}
