'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ZenDialog, ZenInput, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { es } from 'date-fns/locale';
import { CalendarIcon, AlertCircle, X } from 'lucide-react';
import { createPromise, updatePromise, getEventTypes, getPromiseIdByContactId } from '@/lib/actions/studio/commercial/promises';
import { actualizarFechaEvento } from '@/lib/actions/studio/business/events/events.actions';
import { getContacts, getAcquisitionChannels, getSocialNetworks } from '@/lib/actions/studio/commercial/contacts';
import { verificarDisponibilidadFecha, type AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { CreatePromiseData, UpdatePromiseData } from '@/lib/actions/schemas/promises-schemas';

interface ContactEventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    context?: 'promise' | 'event'; // Contexto para adaptar labels y comportamiento
    eventId?: string; // ID del evento cuando context es 'event'
    initialData?: {
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
        event_type_id?: string;
        event_location?: string;
        event_name?: string; // Nombre del evento (opcional)
        interested_dates?: string[];
        acquisition_channel_id?: string;
        social_network_id?: string;
        referrer_contact_id?: string;
        referrer_name?: string;
    };
    onSuccess?: () => void;
}

export function ContactEventFormModal({
    isOpen,
    onClose,
    studioSlug,
    context = 'promise',
    eventId,
    initialData,
    onSuccess,
}: ContactEventFormModalProps) {
    const router = useRouter();
    const isEditMode = !!initialData?.id;
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<CreatePromiseData>({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        event_type_id: initialData?.event_type_id || '',
        event_location: initialData?.event_location || '',
        event_name: initialData?.event_name || '',
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
        initialData?.interested_dates && initialData.interested_dates.length > 0
            ? new Date(initialData.interested_dates[0])
            : undefined
    );
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [referrerInputValue, setReferrerInputValue] = useState(
        initialData?.referrer_name || ''
    );
    const [showReferrerSuggestions, setShowReferrerSuggestions] = useState(false);
    const [filteredReferrerContacts, setFilteredReferrerContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [selectedContactIndex, setSelectedContactIndex] = useState(-1);
    const [selectedReferrerIndex, setSelectedReferrerIndex] = useState(-1);
    const [conflictosPorFecha, setConflictosPorFecha] = useState<Map<string, AgendaItem[]>>(new Map());
    const referrerSyncedRef = useRef(false);

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

    const normalizePhone = (value: string): string => {
        // Quitar todos los caracteres no numéricos
        const digitsOnly = value.replace(/\D/g, '');
        // Tomar los últimos 10 dígitos
        return digitsOnly.slice(-10);
    };

    useEffect(() => {
        if (isOpen) {
            // Sincronizar datos iniciales inmediatamente si existen
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    phone: normalizePhone(initialData.phone || ''),
                    email: initialData.email || '',
                    event_type_id: initialData.event_type_id || '',
                    event_location: initialData.event_location || '',
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
                // Inicializar referrerInputValue: si hay referrer_name, usarlo; si no, se sincronizará cuando se carguen los contactos
                if (initialData.referrer_name) {
                    // Si hay referrer_name, usarlo directamente
                    setReferrerInputValue(initialData.referrer_name);
                    referrerSyncedRef.current = true;
                } else if (initialData.referrer_contact_id) {
                    // Si hay referrer_contact_id pero no referrer_name, inicializar vacío
                    // Se sincronizará cuando se carguen los contactos con el formato @nombre
                    setReferrerInputValue('');
                    referrerSyncedRef.current = false;
                } else {
                    setReferrerInputValue('');
                    referrerSyncedRef.current = true;
                }
            } else {
                // Resetear al cerrar
                referrerSyncedRef.current = false;
                setReferrerInputValue('');
            }

            // Cargar catálogos en segundo plano
            setIsInitialLoading(true);
            Promise.all([
                loadEventTypes(),
                loadAcquisitionChannels(),
                loadSocialNetworks(),
                loadAllContacts(),
            ]).finally(() => {
                setIsInitialLoading(false);
            });
        } else {
            // Resetear formulario al cerrar solo si no es modo edición
            if (!isEditMode) {
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    event_type_id: '',
                    event_location: '',
                    event_name: '',
                    interested_dates: undefined,
                    acquisition_channel_id: '',
                    social_network_id: undefined,
                    referrer_contact_id: undefined,
                    referrer_name: undefined,
                });
                setNameInput('');
                setSelectedDates([]);
                setReferrerInputValue('');
            }
            setErrors({});
            setIsInitialLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData, isEditMode]);

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

    // Verificar disponibilidad cuando cambian las fechas seleccionadas
    useEffect(() => {
        const verificarDisponibilidad = async () => {
            if (selectedDates.length === 0) {
                setConflictosPorFecha(new Map());
                return;
            }

            const nuevosConflictos = new Map<string, AgendaItem[]>();

            try {
                await Promise.all(
                    selectedDates.map(async (date) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const result = await verificarDisponibilidadFecha(
                            studioSlug,
                            date,
                            undefined,
                            initialData?.id || undefined,
                            undefined
                        );

                        if (result.success && result.data && result.data.length > 0) {
                            nuevosConflictos.set(dateKey, result.data);
                        }
                    })
                );

                setConflictosPorFecha(nuevosConflictos);
            } catch (error) {
                console.error('Error verificando disponibilidad:', error);
            }
        };

        verificarDisponibilidad();
    }, [selectedDates, studioSlug, initialData?.id]);

    // Sincronizar referrerInputValue cuando hay referrer_contact_id pero no referrer_name
    useEffect(() => {
        // Solo sincronizar si:
        // 1. El modal está abierto
        // 2. Hay referrer_contact_id en formData
        // 3. No hay referrer_name (o está vacío)
        // 4. Los contactos ya se cargaron
        // 5. Aún no se ha sincronizado (evitar parpadeos)
        if (
            isOpen &&
            formData.referrer_contact_id &&
            !formData.referrer_name &&
            allContacts.length > 0 &&
            !referrerSyncedRef.current
        ) {
            const referrerContact = allContacts.find((c) => c.id === formData.referrer_contact_id);
            if (referrerContact) {
                const expectedValue = `@${referrerContact.name}`;
                // Actualizar siempre si el valor actual está vacío o no coincide con el esperado
                setReferrerInputValue((current) => {
                    if (!current || current === '' || current !== expectedValue) {
                        referrerSyncedRef.current = true;
                        return expectedValue;
                    }
                    return current;
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, formData.referrer_contact_id, formData.referrer_name, allContacts.length]);

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
            phone: normalizePhone(contact.phone || ''),
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

    const handleSubmit = useCallback(async () => {
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.trim() === '') {
            newErrors.name = 'El nombre es requerido';
        }

        const normalizedPhone = normalizePhone(formData.phone || '');
        if (!normalizedPhone || normalizedPhone.length !== 10) {
            newErrors.phone = normalizedPhone.length === 0
                ? 'El teléfono es requerido'
                : 'El teléfono debe tener exactamente 10 dígitos';
        }

        if (!formData.event_type_id || formData.event_type_id === '' || formData.event_type_id === 'none') {
            newErrors.event_type_id = 'El tipo de evento es requerido';
        }

        // Validar lugar del evento (obligatorio si hay tipo de evento seleccionado)
        if (formData.event_type_id && formData.event_type_id !== 'none') {
            const eventLocation = (formData.event_location || '').trim();
            if (!eventLocation || eventLocation === '') {
                newErrors.event_location = 'El lugar del evento es requerido (puedes usar "Pendiente")';
            }
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
            // Normalizar lugar del evento: si está vacío o solo espacios, usar "Pendiente"
            const eventLocation = formData.event_type_id && formData.event_type_id !== 'none'
                ? (formData.event_location || '').trim() || 'Pendiente'
                : undefined;

            // Normalizar teléfono antes de enviar
            const formDataToSubmit = {
                ...formData,
                phone: normalizedPhone,
                event_location: eventLocation,
            };

            let result;

            // Si el contexto es 'event' y hay eventId, y solo se cambió la fecha, usar actualizarFechaEvento
            if (context === 'event' && eventId && isEditMode && initialData?.id) {
                // Verificar si solo se cambió la fecha (comparar selectedDates con initialData.interested_dates)
                const initialDates = initialData.interested_dates
                    ? initialData.interested_dates.map(d => new Date(d).toISOString().split('T')[0]).sort()
                    : [];
                const newDates = selectedDates.map(d => d.toISOString().split('T')[0]).sort();
                const datesChanged = JSON.stringify(initialDates) !== JSON.stringify(newDates);

                // Verificar si otros campos cambiaron
                const otherFieldsChanged =
                    formData.name !== initialData.name ||
                    formData.phone !== initialData.phone ||
                    formData.email !== (initialData.email || '') ||
                    formData.event_type_id !== (initialData.event_type_id || '') ||
                    formData.event_location !== (initialData.event_location || '') ||
                    formData.event_name !== (initialData.event_name || '') ||
                    formData.acquisition_channel_id !== (initialData.acquisition_channel_id || '') ||
                    formData.social_network_id !== (initialData.social_network_id || undefined) ||
                    formData.referrer_contact_id !== (initialData.referrer_contact_id || undefined) ||
                    formData.referrer_name !== (initialData.referrer_name || undefined);

                // Si solo cambió la fecha y hay una fecha seleccionada, usar actualizarFechaEvento
                if (datesChanged && !otherFieldsChanged && selectedDates.length === 1) {
                    const nuevaFecha = selectedDates[0];
                    result = await actualizarFechaEvento(studioSlug, {
                        event_id: eventId,
                        event_date: nuevaFecha,
                    });

                    if (result.success) {
                        toast.success('Fecha del evento actualizada exitosamente');
                        onClose();
                        if (onSuccess) {
                            onSuccess();
                        }
                        return;
                    } else {
                        toast.error(result.error || 'Error al actualizar fecha del evento');
                        return;
                    }
                }
            }

            // Flujo normal: crear o actualizar promesa
            if (isEditMode && initialData?.id) {
                const updateData: UpdatePromiseData = {
                    id: initialData.id,
                    ...formDataToSubmit,
                };
                result = await updatePromise(studioSlug, updateData);
            } else {
                result = await createPromise(studioSlug, formDataToSubmit);
            }

            if (result.success && result.data) {
                toast.success(isEditMode ? 'Promesa actualizada exitosamente' : 'Promesa registrada exitosamente');

                if (isEditMode) {
                    // En modo edición, cerrar modal y refrescar
                    onClose();
                    if (onSuccess) {
                        onSuccess();
                    }
                } else {
                    // En modo creación, obtener promiseId y redirigir
                    const contactId = result.data.id;
                    if (contactId) {
                        const promiseResult = await getPromiseIdByContactId(contactId);
                        if (promiseResult.success && promiseResult.data) {
                            onClose();
                            router.push(`/${studioSlug}/studio/commercial/promises/${promiseResult.data.promise_id}`);
                        } else {
                            toast.error('Promesa creada pero no se pudo obtener el ID');
                        }
                    }
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
    }, [studioSlug, formData, isEditMode, initialData, onClose, onSuccess, router, context, eventId, selectedDates]);

    const formatDatesDisplay = () => {
        if (selectedDates.length === 0) {
            return context === 'event' ? 'Seleccionar fecha' : 'Seleccionar fechas';
        }
        if (selectedDates.length === 1) {
            return formatDate(selectedDates[0]);
        }
        return `${selectedDates.length} fechas seleccionadas`;
    };

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Editar Promesa' : 'Nueva Promesa'}
            description={isEditMode ? 'Actualiza la información de la promesa' : 'Registra una nueva promesa de evento'}
            maxWidth="xl"
            onSave={handleSubmit}
            onCancel={onClose}
            saveLabel={isEditMode ? 'Actualizar' : 'Crear Promesa'}
            cancelLabel="Cancelar"
            isLoading={loading}
        >
            {isInitialLoading && !initialData ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} onKeyDown={handleFormKeyDown} className="space-y-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ZenInput
                            label="Teléfono"
                            value={formData.phone || ''}
                            onChange={(e) => {
                                const normalized = normalizePhone(e.target.value);
                                setFormData((prev) => ({ ...prev, phone: normalized }));
                                if (errors.phone) {
                                    setErrors((prev) => ({ ...prev, phone: '' }));
                                }
                            }}
                            required
                            error={errors.phone}
                            placeholder="10 dígitos"
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
                    </div>

                    {/* Nombre del Evento (opcional) */}
                    <div>
                        <ZenInput
                            label="Nombre del Evento (opcional)"
                            placeholder="Ej: Los quince años de Ana, Boda de Ana y Roberto"
                            value={formData.event_name || ''}
                            onChange={(e) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    event_name: e.target.value || undefined,
                                }));
                            }}
                            className="w-full"
                        />
                        <p className="text-xs text-zinc-400 mt-1">
                            Puedes especificar el nombre del evento si lo conoces
                        </p>
                    </div>

                    {/* Tipo de Evento y Lugar del Evento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-zinc-300 block mb-2">
                                Tipo de Evento <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.event_type_id || 'none'}
                                onChange={(e) => {
                                    const newEventTypeId = e.target.value === 'none' ? '' : e.target.value;
                                    setFormData((prev) => ({
                                        ...prev,
                                        event_type_id: newEventTypeId,
                                        // Limpiar lugar del evento si se deselecciona el tipo
                                        ...(newEventTypeId === '' ? { event_location: '' } : {}),
                                        // Si se selecciona un tipo y no hay lugar, poner "Pendiente"
                                        ...(newEventTypeId !== '' && !prev.event_location ? { event_location: 'Pendiente' } : {}),
                                    }));
                                    if (errors.event_type_id) {
                                        setErrors((prev) => ({ ...prev, event_type_id: '' }));
                                    }
                                }}
                                required
                                disabled={isInitialLoading && eventTypes.length === 0}
                                className={`w-full px-3 py-2.5 h-10 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.event_type_id
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-zinc-700 hover:border-zinc-600'
                                    }`}
                            >
                                <option value="none">
                                    {isInitialLoading && eventTypes.length === 0 ? 'Cargando...' : 'Seleccionar tipo de evento'}
                                </option>
                                {eventTypes.map((et) => (
                                    <option key={et.id} value={et.id}>
                                        {et.name}
                                    </option>
                                ))}
                            </select>
                            {errors.event_type_id && (
                                <p className="mt-1 text-xs text-red-500">{errors.event_type_id}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-zinc-300 block mb-2">
                                Lugar del Evento <span className="text-red-500">*</span>
                            </label>
                            <ZenInput
                                type="text"
                                placeholder="Ej: Salón de eventos, Playa, Jardín... (o 'Pendiente')"
                                value={formData.event_location || ''}
                                onChange={(e) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        event_location: e.target.value,
                                    }));
                                }}
                                required
                                disabled={!formData.event_type_id || formData.event_type_id === 'none'}
                                className="w-full h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                error={errors.event_location}
                            />
                        </div>
                    </div>

                    {/* Canal de Adquisición */}
                    <div>
                        <label className="text-sm font-medium text-zinc-300 block mb-2">
                            Canal de Adquisición <span className="text-red-500">*</span>
                        </label>
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
                            disabled={isInitialLoading && acquisitionChannels.length === 0}
                            className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.acquisition_channel_id
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-zinc-700 hover:border-zinc-600'
                                }`}
                        >
                            <option value="none">
                                {isInitialLoading && acquisitionChannels.length === 0 ? 'Cargando...' : 'Seleccionar canal'}
                            </option>
                            {acquisitionChannels.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
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
                            <select
                                value={formData.social_network_id || 'none'}
                                onChange={(e) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        social_network_id: e.target.value === 'none' ? undefined : e.target.value,
                                    }));
                                }}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-zinc-600 transition-colors"
                            >
                                <option value="none">Seleccionar red social</option>
                                {socialNetworks.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.name}
                                    </option>
                                ))}
                            </select>
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

                    {/* Fecha de Interés / Fecha del Evento */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 block mb-2">
                            {context === 'event' ? 'Fecha del Evento' : 'Fecha(s) de Interés'}
                        </label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setCalendarOpen(!calendarOpen);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:border-zinc-600 transition-colors"
                                >
                                    <span className={selectedDates.length === 0 ? 'text-zinc-500' : ''}>
                                        {formatDatesDisplay()}
                                    </span>
                                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0 bg-zinc-900 border-zinc-700 z-[9999]"
                                align="start"
                                sideOffset={4}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                                {context === 'event' ? (
                                    <Calendar
                                        mode="single"
                                        selected={selectedDates.length > 0 ? selectedDates[0] : undefined}
                                        onSelect={(date: Date | undefined) => {
                                            if (date) {
                                                setSelectedDates([date]);
                                                setMonth(date);
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
                                ) : (
                                    <Calendar
                                        mode="multiple"
                                        selected={selectedDates}
                                        onSelect={(dates) => {
                                            const dateArray = dates as Date[] | undefined;
                                            if (dateArray) {
                                                setSelectedDates(dateArray);
                                                if (dateArray.length > 0) {
                                                    setMonth(dateArray[0]);
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
                                        required={false}
                                    />
                                )}
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-zinc-400 mt-1">
                            {context === 'event'
                                ? 'Puedes cambiar la fecha del evento siempre y cuando esté disponible'
                                : 'Puedes elegir una o más fechas de interés asociadas a una sola promesa'
                            }
                        </p>
                        {selectedDates.some(date => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selectedDate = new Date(date);
                            selectedDate.setHours(0, 0, 0, 0);
                            return selectedDate < today;
                        }) && (
                                <ZenCard variant="outlined" className="bg-orange-900/20 border-orange-700/50 mt-2">
                                    <ZenCardContent className="p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                            <div className="space-y-1.5 flex-1">
                                                <p className="text-xs font-medium text-orange-300">
                                                    Has seleccionado una fecha que ya ha pasado:
                                                </p>
                                                <div className="space-y-1">
                                                    {selectedDates
                                                        .filter(date => {
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            const selectedDate = new Date(date);
                                                            selectedDate.setHours(0, 0, 0, 0);
                                                            return selectedDate < today;
                                                        })
                                                        .map((date) => (
                                                            <p key={date.toISOString()} className="text-xs text-orange-200/80">
                                                                • {formatDate(date)}
                                                            </p>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </ZenCardContent>
                                </ZenCard>
                            )}
                        {selectedDates.length > 1 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedDates
                                    .sort((a, b) => a.getTime() - b.getTime())
                                    .map((date) => {
                                        const dateKey = date.toISOString().split('T')[0];
                                        const hasConflict = conflictosPorFecha.has(dateKey);
                                        return (
                                            <div
                                                key={dateKey}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border ${hasConflict
                                                    ? 'bg-amber-900/20 text-amber-300 border-amber-700/50'
                                                    : 'bg-emerald-900/20 text-emerald-300 border-emerald-700/50'
                                                    }`}
                                            >
                                                <span>{formatDate(date)}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedDates(selectedDates.filter(d => d.toISOString().split('T')[0] !== dateKey));
                                                    }}
                                                    className="hover:bg-zinc-800/50 rounded p-0.5 transition-colors"
                                                    title="Eliminar fecha"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                        {Array.from(conflictosPorFecha.entries()).map(([dateKey, conflictos]) => {
                            const fecha = selectedDates.find(d => d.toISOString().split('T')[0] === dateKey);
                            if (!fecha) return null;

                            return (
                                <ZenCard key={dateKey} variant="outlined" className="bg-amber-900/20 border-amber-700/50 mt-2">
                                    <ZenCardContent className="p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <div className="space-y-1.5 flex-1">
                                                <p className="text-xs font-medium text-amber-300">
                                                    {formatDate(fecha)} ya está programada:
                                                </p>
                                                {conflictos.map((conflicto) => (
                                                    <div key={conflicto.id} className="text-xs text-amber-200/80 space-y-0.5">
                                                        {conflicto.contexto === 'promise' ? (
                                                            <>
                                                                <p className="font-medium">
                                                                    Promesa: {conflicto.contact_name || 'Sin nombre'}
                                                                </p>
                                                                {conflicto.time && (
                                                                    <p className="text-amber-300/70">Hora: {conflicto.time}</p>
                                                                )}
                                                                {conflicto.concept && (
                                                                    <p className="text-amber-300/70">Concepto: {conflicto.concept}</p>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="font-medium">
                                                                    Evento: {conflicto.event_name || 'Sin nombre'}
                                                                </p>
                                                                {conflicto.time && (
                                                                    <p className="text-amber-300/70">Hora: {conflicto.time}</p>
                                                                )}
                                                                {conflicto.concept && (
                                                                    <p className="text-amber-300/70">Concepto: {conflicto.concept}</p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </ZenCardContent>
                                </ZenCard>
                            );
                        })}
                    </div>
                </form>
            )}
        </ZenDialog>
    );
}

