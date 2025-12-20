'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ZenInput, ZenButton, ZenCard, ZenCardContent, ZenConfirmModal } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { createPromise, updatePromise, getEventTypes, getPromiseIdByContactId } from '@/lib/actions/studio/commercial/promises';
import { getContacts, getAcquisitionChannels, getSocialNetworks } from '@/lib/actions/studio/commercial/contacts';
import { PromiseLogsPanelCompact } from './PromiseLogsPanelCompact';
import { PromiseQuotesPanel } from './PromiseQuotesPanel';
import { PromiseTags } from './PromiseTags';
import { PromiseAgendamiento } from './PromiseAgendamiento';
import type { CreatePromiseData, UpdatePromiseData } from '@/lib/actions/schemas/promises-schemas';

interface PromiseFormProps {
  studioSlug: string;
  initialData?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    event_type_id?: string;
    interested_dates?: string[];
    acquisition_channel_id?: string;
    social_network_id?: string;
    referrer_contact_id?: string;
    referrer_name?: string;
    promiseId?: string | null;
  };
  onSuccess?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export interface PromiseFormRef {
  submit: () => void;
  cancel: () => void;
  loading: boolean;
  isEditMode: boolean;
  contactData: {
    contactId: string | null;
    contactName: string;
    phone: string;
    email: string | null;
    promiseId: string | null;
  } | null;
}

export const PromiseForm = forwardRef<PromiseFormRef, PromiseFormProps>(({
  studioSlug,
  initialData,
  onSuccess,
  onLoadingChange,
}, ref) => {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(!!initialData?.id);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreatePromiseData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    event_type_id: initialData?.event_type_id || '',
    interested_dates: initialData?.interested_dates,
    acquisition_channel_id: initialData?.acquisition_channel_id ?? '',
    social_network_id: initialData?.social_network_id,
    referrer_contact_id: initialData?.referrer_contact_id,
    referrer_name: initialData?.referrer_name,
  });
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [acquisitionChannels, setAcquisitionChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [socialNetworks, setSocialNetworks] = useState<Array<{ id: string; name: string }>>([]);
  const [nameInput, setNameInput] = useState(initialData?.name || '');
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [filteredContactSuggestions, setFilteredContactSuggestions] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [allContacts, setAllContacts] = useState<Array<{ id: string; name: string; phone: string; email: string | null }>>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    initialData?.interested_dates ? initialData.interested_dates.map(d => new Date(d)) : []
  );
  const [month, setMonth] = useState<Date | undefined>(
    selectedDates.length > 0 ? selectedDates[0] : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [referrerInputValue, setReferrerInputValue] = useState(
    initialData?.referrer_name || ''
  );
  const [showReferrerSuggestions, setShowReferrerSuggestions] = useState(false);
  const [filteredReferrerContacts, setFilteredReferrerContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState(-1);
  const [selectedReferrerIndex, setSelectedReferrerIndex] = useState(-1);
  const [promiseId, setPromiseId] = useState<string | null>(initialData?.promiseId || null);
  const [currentContactId, setCurrentContactId] = useState<string | null>(initialData?.id || null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Estado para saber si la promesa está guardada
  const isSaved = promiseId !== null;

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
        // Si hay referrer_contact_id en initialData o formData, actualizar el input
        const referrerId = initialData?.referrer_contact_id || formData.referrer_contact_id;
        if (referrerId) {
          const referrer = contacts.find(c => c.id === referrerId);
          if (referrer) {
            setReferrerInputValue(`@${referrer.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

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

  // Sincronizar formData cuando initialData cambie
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        event_type_id: initialData.event_type_id || '',
        interested_dates: initialData.interested_dates,
        acquisition_channel_id: initialData.acquisition_channel_id ?? '',
        social_network_id: initialData.social_network_id,
        referrer_contact_id: initialData.referrer_contact_id,
        referrer_name: initialData.referrer_name,
      });
      setNameInput(initialData.name || '');
      setSelectedDates(
        initialData.interested_dates ? initialData.interested_dates.map(d => new Date(d)) : []
      );
      setMonth(
        initialData.interested_dates && initialData.interested_dates.length > 0
          ? new Date(initialData.interested_dates[0])
          : undefined
      );
      // Si hay referrer_name, inicializar el input
      if (initialData.referrer_name) {
        setReferrerInputValue(initialData.referrer_name);
      } else if (initialData.referrer_contact_id) {
        // Si hay referrer_contact_id pero no referrer_name, buscar el contacto
        const referrer = allContacts.find(c => c.id === initialData.referrer_contact_id);
        if (referrer) {
          setReferrerInputValue(`@${referrer.name}`);
        }
      } else {
        setReferrerInputValue('');
      }
      setPromiseId(initialData.promiseId || null);
      setCurrentContactId(initialData.id || null);
      setIsEditMode(!!initialData.id);
    }
  }, [initialData, allContacts]);

  useEffect(() => {
    setIsInitialLoading(true);
    Promise.all([
      loadEventTypes(),
      loadAcquisitionChannels(),
      loadSocialNetworks(),
      loadAllContacts(),
    ]).finally(() => {
      setIsInitialLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlug]);

  // Verificar que el acquisition_channel_id esté en la lista cuando se carguen los canales
  useEffect(() => {
    if (acquisitionChannels.length > 0 && formData.acquisition_channel_id) {
      const channelExists = acquisitionChannels.some(c => c.id === formData.acquisition_channel_id);
      if (!channelExists) {
        // Si el canal no existe en la lista, limpiar el valor
        setFormData((prev) => ({ ...prev, acquisition_channel_id: '' }));
      }
    }
  }, [acquisitionChannels, formData.acquisition_channel_id]);

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setSelectedContactIndex(-1);

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
      setFormData((prev) => ({ ...prev, name: '' }));
    } else {
      setShowContactSuggestions(false);
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
    if (e.key === 'Enter' && (showContactSuggestions || showReferrerSuggestions)) {
      e.preventDefault();
      if (showContactSuggestions && filteredContactSuggestions.length > 0) {
        if (selectedContactIndex >= 0 && selectedContactIndex < filteredContactSuggestions.length) {
          handleSelectContact(filteredContactSuggestions[selectedContactIndex]);
        }
      }
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

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setErrors({});

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
      let result;
      if (isEditMode && initialData?.id) {
        const updateData: UpdatePromiseData = {
          id: initialData.id,
          ...formData,
        };
        result = await updatePromise(studioSlug, updateData);
      } else {
        result = await createPromise(studioSlug, formData);
      }

      if (result.success && result.data) {
        const contactId = result.data.id;

        // Obtener promiseId después de crear/actualizar
        if (contactId) {
          const promiseResult = await getPromiseIdByContactId(contactId);
          if (promiseResult.success && promiseResult.data) {
            setPromiseId(promiseResult.data.promise_id);
          }

          // Actualizar contactId actual
          setCurrentContactId(contactId);

          // Si es creación (no estaba en modo edición), actualizar URL sin recargar
          if (!isEditMode && promiseResult.success && promiseResult.data) {
            // Actualizar URL sin recargar la página usando promiseId
            router.replace(`/${studioSlug}/studio/commercial/promises/${promiseResult.data.promise_id}`);

            // Actualizar estado interno para modo edición
            setIsEditMode(true);
          }
        }

        toast.success(isEditMode ? 'Promesa actualizada exitosamente' : 'Promesa registrada exitosamente');
        // Marcar formulario como limpio después de guardar
        setIsFormDirty(false);

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || `Error al ${isEditMode ? 'actualizar' : 'registrar'} promesa`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} promise:`, error);
      toast.error(`Error al ${isEditMode ? 'actualizar' : 'registrar'} promesa`);
    } finally {
      setLoading(false);
    }
  }, [studioSlug, isEditMode, initialData, formData, onSuccess, router]);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  // Detectar cambios en el formulario
  useEffect(() => {
    // Comparar datos del formulario con los iniciales
    const initialFormData: CreatePromiseData = {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      event_type_id: initialData?.event_type_id || '',
      interested_dates: initialData?.interested_dates,
      acquisition_channel_id: initialData?.acquisition_channel_id || '',
      social_network_id: initialData?.social_network_id,
      referrer_contact_id: initialData?.referrer_contact_id,
      referrer_name: initialData?.referrer_name,
    };

    // Comparar campos principales
    let hasChanges = false;
    if (
      formData.name !== initialFormData.name ||
      formData.phone !== initialFormData.phone ||
      formData.email !== initialFormData.email ||
      formData.event_type_id !== initialFormData.event_type_id ||
      formData.acquisition_channel_id !== initialFormData.acquisition_channel_id ||
      formData.social_network_id !== initialFormData.social_network_id ||
      formData.referrer_contact_id !== initialFormData.referrer_contact_id ||
      formData.referrer_name !== initialFormData.referrer_name
    ) {
      hasChanges = true;
    }

    // Comparar fechas de interés
    if (!hasChanges) {
      const currentDates = selectedDates.map(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
      }).sort();

      const initialDates = (initialData?.interested_dates || []).map(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
      }).sort();

      if (currentDates.length !== initialDates.length) {
        hasChanges = true;
      } else {
        for (let i = 0; i < currentDates.length; i++) {
          if (currentDates[i] !== initialDates[i]) {
            hasChanges = true;
            break;
          }
        }
      }
    }

    setIsFormDirty(hasChanges);
  }, [formData, selectedDates, initialData]);

  // Interceptar beforeunload del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isFormDirty]);

  // Función para manejar la navegación con confirmación
  const handleNavigation = useCallback((navigationFn: () => void) => {
    if (isFormDirty) {
      setPendingNavigation(() => navigationFn);
      setShowConfirmModal(true);
    } else {
      navigationFn();
    }
  }, [isFormDirty]);

  // Confirmar salida
  const handleConfirmExit = () => {
    setShowConfirmModal(false);
    setIsFormDirty(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  // Cancelar salida
  const handleCancelExit = () => {
    setShowConfirmModal(false);
    setPendingNavigation(null);
  };



  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit();
    },
    cancel: () => {
      handleNavigation(() => router.push(`/${studioSlug}/studio/commercial/promises`));
    },
    loading,
    isEditMode,
    contactData: isSaved && currentContactId ? {
      contactId: currentContactId,
      contactName: formData.name,
      phone: formData.phone,
      email: formData.email || null,
      promiseId: promiseId,
    } : null,
  }), [loading, isEditMode, handleNavigation, handleSubmit, router, isSaved, currentContactId, formData.name, formData.phone, formData.email, promiseId, studioSlug]);

  useEffect(() => {
    if (selectedDates.length > 0) {
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

  useEffect(() => {
    if (selectedDates.length > 0 && !month) {
      setMonth(selectedDates[0]);
    }
  }, [selectedDates, month]);

  const formatDatesDisplay = () => {
    if (selectedDates.length === 0) return 'Seleccionar fechas';
    if (selectedDates.length === 1) {
      return formatDate(selectedDates[0]);
    }
    return `${selectedDates.length} fechas seleccionadas`;
  };

  // Mostrar skeleton completo solo si no hay initialData (nueva promesa)
  // Si hay initialData, mostramos el formulario pero con skeletons en los selects
  if (isInitialLoading && !initialData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="h-[300px] w-full max-w-[350px] bg-zinc-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Layout de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Información */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
            {/* Ficha 1: Nombre, Teléfono, Email */}
            <ZenCard variant="outlined">
              <ZenCardContent className="p-4 space-y-4">
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

                {/* Teléfono y Email */}
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
              </ZenCardContent>
            </ZenCard>

            {/* Ficha 3: Canal de Adquisición */}
            <ZenCard variant="outlined">
              <ZenCardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-2">
                    Canal de Adquisición <span className="text-red-500">*</span>
                  </label>
                  {isInitialLoading && acquisitionChannels.length === 0 ? (
                    <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                  ) : (
                    <select
                      value={formData.acquisition_channel_id || 'none'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          acquisition_channel_id: value === 'none' ? '' : value,
                        }));
                        if (errors.acquisition_channel_id) {
                          setErrors((prev) => ({ ...prev, acquisition_channel_id: '' }));
                        }
                        const redesChannelId = getRedesSocialesChannelId();
                        const referidosChannelId = getReferidosChannelId();
                        if (value !== redesChannelId) {
                          setFormData((prev) => ({ ...prev, social_network_id: undefined }));
                        }
                        if (value !== referidosChannelId) {
                          setFormData((prev) => ({ ...prev, referrer_contact_id: undefined, referrer_name: undefined }));
                          setReferrerInputValue('');
                          setShowReferrerSuggestions(false);
                        }
                      }}
                      required
                      disabled={acquisitionChannels.length === 0}
                      className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.acquisition_channel_id
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                    >
                      <option value="none">
                        {acquisitionChannels.length === 0 ? 'Cargando canales...' : 'Seleccionar canal'}
                      </option>
                      {acquisitionChannels.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.acquisition_channel_id && (
                    <p className="mt-1 text-xs text-red-500">{errors.acquisition_channel_id}</p>
                  )}
                </div>

                {/* Selector de Red Social */}
                {formData.acquisition_channel_id === getRedesSocialesChannelId() && (
                  <div>
                    <label className="text-sm font-medium text-zinc-300 block mb-2">
                      Red Social
                    </label>
                    {isInitialLoading && socialNetworks.length === 0 ? (
                      <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                    ) : (
                      <select
                        value={formData.social_network_id || 'none'}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            social_network_id: e.target.value === 'none' ? undefined : e.target.value,
                          }));
                        }}
                        disabled={socialNetworks.length === 0}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="none">
                          {socialNetworks.length === 0 ? 'Cargando redes sociales...' : 'Seleccionar red social'}
                        </option>
                        {socialNetworks.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Input para Referidos */}
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
                            setFormData((prev) => ({ ...prev, referrer_name: undefined }));
                          } else {
                            setShowReferrerSuggestions(false);
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
                          setTimeout(() => {
                            setShowReferrerSuggestions(false);
                            setSelectedReferrerIndex(-1);
                          }, 200);
                        }}
                        disabled={loading}
                      />

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
              </ZenCardContent>
            </ZenCard>

            {/* Ficha 2: Tipo de Evento y Fecha de Interés */}
            <ZenCard variant="outlined">
              <ZenCardContent className="p-4 space-y-4">
                {/* Tipo de Evento */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-2">
                    Tipo de Evento <span className="text-red-500">*</span>
                  </label>
                  {isInitialLoading && eventTypes.length === 0 ? (
                    <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                  ) : (
                    <select
                      value={formData.event_type_id || 'none'}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          event_type_id: e.target.value === 'none' ? '' : e.target.value,
                        }));
                        if (errors.event_type_id) {
                          setErrors((prev) => ({ ...prev, event_type_id: '' }));
                        }
                      }}
                      required
                      disabled={eventTypes.length === 0}
                      className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.event_type_id
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                    >
                      <option value="none">
                        {eventTypes.length === 0 ? 'Cargando tipos de evento...' : 'Seleccionar tipo de evento'}
                      </option>
                      {eventTypes.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.event_type_id && (
                    <p className="mt-1 text-xs text-red-500">{errors.event_type_id}</p>
                  )}
                </div>

                {/* Fecha de Interés */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-2">
                    Fecha(s) de Interés
                  </label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:border-zinc-600 transition-colors"
                      >
                        <span className={selectedDates.length === 0 ? 'text-zinc-500' : ''}>
                          {formatDatesDisplay()}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
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
                        className="border border-zinc-700 rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDates.length > 0 && (
                    <div className="mt-3 p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-300">
                          {selectedDates.length} fecha(s) seleccionada(s)
                        </span>
                        <ZenButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
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
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-600/30"
                          >
                            {formatDate(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ZenCardContent>
            </ZenCard>

            {/* Botones de acción - siempre visibles en el form */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <ZenButton
                type="button"
                variant="ghost"
                onClick={() => handleNavigation(() => router.push(`/${studioSlug}/studio/commercial/promises`))}
                disabled={loading}
              >
                Cancelar
              </ZenButton>
              <ZenButton type="submit" loading={loading}>
                {isEditMode ? 'Actualizar' : 'Registrar'} Promesa
              </ZenButton>
            </div>
          </form>
        </div>

        {/* Columna 2: Cotizaciones y Etiquetas */}
        <div className="lg:col-span-1 space-y-6">
          <PromiseQuotesPanel
            studioSlug={studioSlug}
            promiseId={promiseId}
            eventTypeId={formData.event_type_id || null}
            isSaved={isSaved}
            contactId={currentContactId}
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
                contactId={currentContactId}
                isSaved={isSaved}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación para salir con cambios sin guardar */}
      <ZenConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelExit}
        onConfirm={handleConfirmExit}
        title="¿Estás seguro de salir?"
        description="La promesa tiene datos sin guardar. Si sales ahora, perderás todos los cambios realizados."
        confirmText="Sí, salir"
        cancelText="Cancelar"
        variant="destructive"
      />

    </div>
  );
});

PromiseForm.displayName = 'PromiseForm';

