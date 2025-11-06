'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenInput, ZenButton, ZenSelect } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { createProspect, getEventTypes } from '@/lib/actions/studio/builder/commercial/prospects';
import { getContacts, getAcquisitionChannels, getSocialNetworks } from '@/lib/actions/studio/builder/commercial/contacts';
import type { ZenSelectOption } from '@/components/ui/zen';
import type { CreateProspectData } from '@/lib/actions/schemas/prospects-schemas';
import { formatDate } from '@/lib/actions/utils/formatting';
import { es } from 'date-fns/locale';

interface ProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onSuccess: () => void;
}

export function ProspectModal({
  isOpen,
  onClose,
  studioSlug,
  onSuccess,
}: ProspectModalProps) {
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreateProspectData>({
    name: '',
    phone: '',
    email: '',
    event_type_id: '',
    interested_dates: undefined,
    acquisition_channel_id: '',
    social_network_id: undefined,
    referrer_contact_id: undefined,
    referrer_name: undefined,
  });
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [acquisitionChannels, setAcquisitionChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [socialNetworks, setSocialNetworks] = useState<Array<{ id: string; name: string }>>([]);
  const [nameInput, setNameInput] = useState('');
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [filteredContactSuggestions, setFilteredContactSuggestions] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [allContacts, setAllContacts] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  // Estados para Natural Language Picker
  const [month, setMonth] = useState<Date | undefined>(undefined);
  // Estados para referidos
  const [referrerInputValue, setReferrerInputValue] = useState('');
  const [showReferrerSuggestions, setShowReferrerSuggestions] = useState(false);
  const [filteredReferrerContacts, setFilteredReferrerContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  // Estados para navegación con teclado
  const [selectedContactIndex, setSelectedContactIndex] = useState(-1);
  const [selectedReferrerIndex, setSelectedReferrerIndex] = useState(-1);

  const loadEventTypes = async () => {
    try {
      const result = await getEventTypes(studioSlug);
      if (result.success && result.data) {
        setEventTypes(result.data);
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const loadAcquisitionChannels = async () => {
    try {
      const result = await getAcquisitionChannels();
      if (result.success && result.data) {
        setAcquisitionChannels(result.data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadSocialNetworks = async () => {
    try {
      const result = await getSocialNetworks();
      if (result.success && result.data) {
        setSocialNetworks(result.data.map((n) => ({ id: n.id, name: n.name })));
      }
    } catch (error) {
      console.error('Error loading social networks:', error);
    }
  };

  const loadAllContacts = async () => {
    try {
      const result = await getContacts(studioSlug, {
        page: 1,
        limit: 100,
        status: 'all',
      });
      if (result.success && result.data) {
        const contacts = result.data.contacts.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || null,
        }));
        setAllContacts(contacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Funciones helper para obtener IDs de canales específicos
  const getRedesSocialesChannelId = (): string | undefined => {
    const redesChannel = acquisitionChannels.find((c) =>
      c.name.toLowerCase().includes('red') || c.name.toLowerCase().includes('social')
    );
    return redesChannel?.id;
  };

  const getReferidosChannelId = (): string | undefined => {
    const referidosChannel = acquisitionChannels.find((c) =>
      c.name.toLowerCase().includes('referido') || c.name.toLowerCase().includes('referral')
    );
    return referidosChannel?.id;
  };

  // Cargar tipos de evento, canales y contactos al abrir
  React.useEffect(() => {
    if (isOpen) {
      setIsInitialLoading(true);
      setErrors({}); // Limpiar errores al abrir
      Promise.all([
        loadEventTypes(),
        loadAcquisitionChannels(),
        loadSocialNetworks(),
        loadAllContacts(),
      ]).finally(() => {
        setIsInitialLoading(false);
      });
    } else {
      // Resetear cuando se cierra el modal
      setIsInitialLoading(false);
      setErrors({}); // Limpiar errores al cerrar
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studioSlug]);

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setSelectedContactIndex(-1);

    // Detectar @ y filtrar contactos
    if (value.includes('@')) {
      const afterAt = value.split('@').pop() || '';
      if (afterAt.trim()) {
        const filtered = allContacts.filter((c) =>
          c.name.toLowerCase().includes(afterAt.toLowerCase())
        );
        setFilteredContactSuggestions(filtered);
        setShowContactSuggestions(true);
      } else {
        setFilteredContactSuggestions(allContacts.slice(0, 10));
        setShowContactSuggestions(true);
      }
      // Si hay @, limpiar nombre
      setFormData((prev) => ({ ...prev, name: '' }));
    } else {
      setShowContactSuggestions(false);
      // Si no hay @, es nombre nuevo
      setFormData((prev) => ({
        ...prev,
        name: value,
      }));
    }
  };

  const handleSelectContact = (contact: { id: string; name: string; phone: string; email: string | null }) => {
    setNameInput(`@${contact.name}`);
    setFormData((prev) => ({
      ...prev,
      name: contact.name,
      phone: contact.phone || '',
      email: contact.email || undefined,
    }));
    setShowContactSuggestions(false);
    setSelectedContactIndex(-1);
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Prevenir submit si hay sugerencias abiertas
    if (e.key === 'Enter' && (showContactSuggestions || showReferrerSuggestions)) {
      e.preventDefault();
      // Si hay sugerencias de contactos en nombre
      if (showContactSuggestions && filteredContactSuggestions.length > 0) {
        if (selectedContactIndex >= 0 && selectedContactIndex < filteredContactSuggestions.length) {
          handleSelectContact(filteredContactSuggestions[selectedContactIndex]);
        }
      }
      // Si hay sugerencias de referidos
      if (showReferrerSuggestions && filteredReferrerContacts.length > 0) {
        if (selectedReferrerIndex >= 0 && selectedReferrerIndex < filteredReferrerContacts.length) {
          const contact = filteredReferrerContacts[selectedReferrerIndex];
          setReferrerInputValue(`@${contact.name}`);
          setFormData((prev) => ({
            ...prev,
            referrer_contact_id: contact.id,
            referrer_name: undefined,
          }));
          setShowReferrerSuggestions(false);
          setSelectedReferrerIndex(-1);
        }
      }
    }
  };

  const handleNameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showContactSuggestions || filteredContactSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedContactIndex((prev) =>
        prev < filteredContactSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedContactIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowContactSuggestions(false);
      setSelectedContactIndex(-1);
    }
  };

  const handleReferrerInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showReferrerSuggestions || filteredReferrerContacts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedReferrerIndex((prev) =>
        prev < filteredReferrerContacts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedReferrerIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowReferrerSuggestions(false);
      setSelectedReferrerIndex(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validación en el cliente
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'El teléfono es requerido';
    }

    if (!formData.event_type_id || formData.event_type_id === '' || formData.event_type_id === 'none') {
      newErrors.event_type_id = 'El tipo de evento es requerido';
    }

    if (!formData.acquisition_channel_id || formData.acquisition_channel_id === '' || formData.acquisition_channel_id === 'none') {
      newErrors.acquisition_channel_id = 'El canal de adquisición es requerido';
    }

    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      const result = await createProspect(studioSlug, formData);
      if (result.success) {
        toast.success('Prospect registrado exitosamente');
        onSuccess();
        onClose();
        resetForm();
      } else {
        toast.error(result.error || 'Error al registrar prospect');
      }
    } catch (error) {
      console.error('Error creating prospect:', error);
      toast.error('Error al registrar prospect');
    } finally {
      setLoading(false);
    }
  };

  // Función para parsear lenguaje natural a fechas (no utilizada actualmente)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parseNaturalLanguageDate = (text: string): Date[] | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalized = text.toLowerCase().trim();

    // Patrones comunes en español
    // Hoy
    if (/^hoy$/.test(normalized)) {
      return [new Date(today)];
    }

    // Mañana
    if (/^mañana$/.test(normalized)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return [tomorrow];
    }

    // Pasado mañana
    if (/^pasado\s+mañana$/.test(normalized)) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return [dayAfter];
    }

    // Próxima semana
    if (/^próxima\s+semana$/.test(normalized)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return [nextWeek];
    }

    // En X días/semanas
    const daysMatch = normalized.match(/^en\s+(\d+)\s+(días?|semana[s]?)$/);
    if (daysMatch) {
      const num = parseInt(daysMatch[1]);
      const unit = daysMatch[2];
      const date = new Date(today);
      if (unit.includes('semana')) {
        date.setDate(date.getDate() + (num * 7));
      } else {
        date.setDate(date.getDate() + num);
      }
      return [date];
    }

    // Fecha formato DD/MM o DD/MM/YYYY
    const dateMatch = normalized.match(/^el\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
      const date = new Date(year, month, day);
      if (date.getTime() >= today.getTime()) {
        return [date];
      }
      return null;
    }

    return null;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      event_type_id: '',
      interested_dates: undefined,
      acquisition_channel_id: '',
      social_network_id: undefined,
      referrer_contact_id: undefined,
      referrer_name: undefined,
    });
    setErrors({});
    setNameInput('');
    setShowContactSuggestions(false);
    setSelectedDates([]);
    setMonth(undefined);
    setReferrerInputValue('');
    setShowReferrerSuggestions(false);
    setSelectedContactIndex(-1);
    setSelectedReferrerIndex(-1);
  };

  const acquisitionChannelOptions: ZenSelectOption[] = [
    { value: 'none', label: 'Seleccionar canal' },
    ...acquisitionChannels.map((c) => ({ value: c.id, label: c.name })),
    { value: 'otro', label: 'Otro' },
  ];

  useEffect(() => {
    if (selectedDates.length > 0) {
      // Convertir fechas a ISO datetime (con hora a medianoche UTC)
      const dateStrings = selectedDates.map((d) => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      });
      setFormData((prev) => ({
        ...prev,
        interested_dates: dateStrings,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        interested_dates: undefined,
      }));
    }
  }, [selectedDates]);

  // Actualizar mes cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDates.length > 0 && !month) {
      setMonth(selectedDates[0]);
    }
  }, [selectedDates, month]);

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Prospecto"
      maxWidth="2xl"
      onSave={() => {
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
      }}
      onCancel={onClose}
      saveLabel="Registrar"
      cancelLabel="Cancelar"
      isLoading={loading}
    >
      {isInitialLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Columna 1: Skeleton Formulario */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
          {/* Columna 2: Skeleton Calendario */}
          <div className="flex flex-col items-center">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="h-[300px] w-full max-w-[350px] bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Columna 1: Formulario */}
            <div className="space-y-4">
              {/* Nombre con búsqueda @ */}
              <div className="relative">
                <ZenInput
                  label="Nombre"
                  value={nameInput}
                  onChange={(e) => {
                    handleNameChange(e.target.value);
                    setSelectedContactIndex(-1);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: '' }));
                    }
                  }}
                  onKeyDown={handleNameInputKeyDown}
                  onFocus={() => {
                    if (nameInput.includes('@')) {
                      setShowContactSuggestions(true);
                    }
                  }}
                  placeholder="Nombre o @contacto existente"
                  required
                  error={errors.name}
                />
                {showContactSuggestions && filteredContactSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
                    {filteredContactSuggestions.map((contact, index) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        onMouseEnter={() => setSelectedContactIndex(index)}
                        className={`w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors ${selectedContactIndex === index ? 'bg-zinc-800' : ''
                          }`}
                      >
                        <span className="font-medium">{contact.name}</span>
                        <span className="text-zinc-400 text-xs">({contact.phone})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Teléfono y Email (auto-poblados si contacto existe) */}
              <ZenInput
                label="Teléfono"
                value={formData.phone || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, phone: e.target.value }));
                  if (errors.phone) {
                    setErrors((prev) => ({ ...prev, phone: '' }));
                  }
                }}
                required
                error={errors.phone}
              />
              <ZenInput
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value || undefined }));
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                error={errors.email}
              />

              {/* Tipo de Evento */}
              <div>
                <ZenSelect
                  label="Tipo de Evento"
                  value={formData.event_type_id || 'none'}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      event_type_id: value === 'none' ? '' : value,
                    }));
                    if (errors.event_type_id) {
                      setErrors((prev) => ({ ...prev, event_type_id: '' }));
                    }
                  }}
                  options={[
                    { value: 'none', label: 'Seleccionar tipo de evento' },
                    ...eventTypes.map((et) => ({ value: et.id, label: et.name })),
                    { value: 'otro', label: 'Otro' },
                  ]}
                  placeholder="Buscar tipo de evento..."
                  required
                  error={errors.event_type_id}
                />
              </div>

              {/* Canal de Adquisición */}
              <div>
                <ZenSelect
                  label="Canal de Adquisición"
                  value={formData.acquisition_channel_id || 'none'}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      acquisition_channel_id: value === 'none' ? '' : value,
                    }));
                    if (errors.acquisition_channel_id) {
                      setErrors((prev) => ({ ...prev, acquisition_channel_id: '' }));
                    }
                    // Limpiar red social cuando cambia el canal
                    if (value !== getRedesSocialesChannelId()) {
                      setFormData((prev) => ({ ...prev, social_network_id: undefined }));
                    }
                    // Limpiar referrer cuando cambia el canal
                    if (value !== getReferidosChannelId()) {
                      setFormData((prev) => ({ ...prev, referrer_contact_id: undefined, referrer_name: undefined }));
                      setReferrerInputValue('');
                      setShowReferrerSuggestions(false);
                    }
                  }}
                  options={acquisitionChannelOptions}
                  placeholder="Seleccionar canal"
                  disableSearch
                  required
                  error={errors.acquisition_channel_id}
                />
              </div>

              {/* Selector de Red Social (solo si canal es "Redes Sociales") */}
              {formData.acquisition_channel_id === getRedesSocialesChannelId() && (
                <div>
                  <ZenSelect
                    label="Red Social"
                    value={formData.social_network_id || 'none'}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        social_network_id: value === 'none' ? undefined : value,
                      }));
                    }}
                    options={[
                      { value: 'none', label: 'Seleccionar red social' },
                      ...socialNetworks.map((n) => ({ value: n.id, label: n.name })),
                    ]}
                    placeholder="Seleccionar red social"
                    disableSearch
                  />
                </div>
              )}

              {/* Input para Referidos con @mention */}
              {formData.acquisition_channel_id === getReferidosChannelId() && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 block mb-1">
                    Referido por
                  </label>
                  <div className="relative">
                    <ZenInput
                      id="referrer_input"
                      placeholder="Escribe nombre o @nombre del contacto..."
                      value={referrerInputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setReferrerInputValue(value);
                        setSelectedReferrerIndex(-1);

                        // Detectar @ y filtrar contactos
                        if (value.includes('@')) {
                          const afterAt = value.split('@').pop() || '';
                          if (afterAt.trim()) {
                            const filtered = allContacts.filter((c) =>
                              c.name.toLowerCase().includes(afterAt.toLowerCase())
                            );
                            setFilteredReferrerContacts(filtered.map((c) => ({ id: c.id, name: c.name, phone: c.phone })));
                            setShowReferrerSuggestions(true);
                          } else {
                            setFilteredReferrerContacts(allContacts.slice(0, 10).map((c) => ({ id: c.id, name: c.name, phone: c.phone })));
                            setShowReferrerSuggestions(true);
                          }
                          // Si hay @, limpiar referrer_name
                          setFormData((prev) => ({ ...prev, referrer_name: undefined }));
                        } else {
                          setShowReferrerSuggestions(false);
                          // Si no hay @, es nombre histórico
                          setFormData((prev) => ({
                            ...prev,
                            referrer_name: value || undefined,
                            referrer_contact_id: undefined,
                          }));
                        }
                      }}
                      onKeyDown={handleReferrerInputKeyDown}
                      onFocus={() => {
                        if (referrerInputValue.includes('@')) {
                          setShowReferrerSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay para permitir click en sugerencias
                        setTimeout(() => {
                          setShowReferrerSuggestions(false);
                          setSelectedReferrerIndex(-1);
                        }, 200);
                      }}
                      disabled={loading}
                    />

                    {/* Lista de sugerencias */}
                    {showReferrerSuggestions && filteredReferrerContacts.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
                        {filteredReferrerContacts.map((contact, index) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => {
                              setReferrerInputValue(`@${contact.name}`);
                              setFormData((prev) => ({
                                ...prev,
                                referrer_contact_id: contact.id,
                                referrer_name: undefined,
                              }));
                              setShowReferrerSuggestions(false);
                              setSelectedReferrerIndex(-1);
                            }}
                            onMouseEnter={() => setSelectedReferrerIndex(index)}
                            className={`w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors ${selectedReferrerIndex === index ? 'bg-zinc-800' : ''
                              }`}
                          >
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-zinc-400 text-xs">({contact.phone})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Columna 2: Calendario */}
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Fecha(s) de Interés
              </label>
              <div className="w-full flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates: Date | Date[] | undefined) => {
                    if (dates) {
                      const newDates = Array.isArray(dates) ? dates : dates ? [dates] : [];
                      setSelectedDates(newDates);
                      if (newDates.length > 0) {
                        setMonth(newDates[0]);
                      }
                    } else {
                      setSelectedDates([]);
                      setMonth(undefined);
                    }
                  }}
                  month={month}
                  onMonthChange={setMonth}
                  numberOfMonths={1}
                  locale={es}
                  buttonVariant="ghost"
                  className="border border-zinc-700 rounded-lg  [--cell-size:--spacing(9)] md:[--cell-size:--spacing(9)]"
                />
              </div>
              {selectedDates.length > 0 ? (
                <div className="mt-3 border border-zinc-700 rounded-lg p-2 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-300">
                      {selectedDates.length} fecha(s) seleccionada(s)
                    </span>
                    <ZenButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDates([]);
                        setMonth(undefined);
                      }}
                    >
                      Limpiar
                    </ZenButton>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {selectedDates.map((date, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-300 border border-blue-600/30"
                      >
                        {formatDate(date)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3  p-2 w-full">
                  <p className="text-xs text-zinc-600 text-center italic">
                    Puedes seleccionar una o más fechas de interés para asociar al prospecto
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </ZenDialog>
  );
}

