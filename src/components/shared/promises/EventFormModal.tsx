'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ZenDialog, ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { es } from 'date-fns/locale';
import { CalendarIcon, AlertCircle, X, Plus } from 'lucide-react';
import { createPromise, updatePromise, getEventTypes, getPromiseIdByContactId } from '@/lib/actions/studio/commercial/promises';
import { actualizarFechaEvento } from '@/lib/actions/studio/business/events/events.actions';
import { getContacts, getAcquisitionChannels, getSocialNetworks, createContact } from '@/lib/actions/studio/commercial/contacts';
import { obtenerCrewMembers } from '@/lib/actions/studio/crew/crew.actions';
import { verificarDisponibilidadFecha, type AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { CreatePromiseData, UpdatePromiseData } from '@/lib/actions/schemas/promises-schemas';
import { useContactRefresh } from '@/hooks/useContactRefresh';
import { TipoEventoEnrichedModal } from '@/components/shared/tipos-evento/TipoEventoEnrichedModal';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';

interface EventFormModalProps {
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
        address?: string;
        event_type_id?: string;
        event_location?: string;
        event_name?: string; // Nombre del evento (opcional)
        duration_hours?: number | null;
        event_date?: Date | string | null; // Fecha única del evento (puede venir como Date o string YYYY-MM-DD desde server)
        interested_dates?: string; // Fecha de interés (solo string único, no array)
        acquisition_channel_id?: string;
        social_network_id?: string;
        referrer_contact_id?: string;
        referrer_name?: string;
    };
    onSuccess?: (updatedData?: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        address: string | null;
        acquisition_channel_id?: string | null;
        social_network_id?: string | null;
        referrer_contact_id?: string | null;
        referrer_name?: string | null;
        event_type_id?: string | null;
        event_name?: string | null;
        event_location?: string | null;
        duration_hours?: number | null;
        event_type?: string | null;
        interested_dates?: string[] | null;
        event_date?: Date | string | null;
    }) => void;
    zIndex?: number; // Z-index para modales anidados
}

export function EventFormModal({
    isOpen,
    onClose,
    studioSlug,
    context = 'promise',
    eventId,
    initialData,
    onSuccess,
    zIndex = 10050,
}: EventFormModalProps) {
    const router = useRouter();
    const { triggerContactUpdate } = useContactRefresh();
    const isEditMode = !!initialData?.id;
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const eventTypeSelectRef = useRef<HTMLSelectElement>(null);

    // Helper para formatear fecha como YYYY-MM-DD sin zona horaria
    const formatDateForServer = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper para parsear fecha de forma segura usando métodos UTC
    const parseDateSafe = (date: Date | string | null): Date => {
        if (!date) {
            return new Date();
        }
        if (typeof date === "string") {
            const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                const [, year, month, day] = dateMatch;
                return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
            }
            const isoDate = new Date(date);
            if (!Number.isNaN(isoDate.getTime())) {
                return new Date(Date.UTC(
                    isoDate.getUTCFullYear(),
                    isoDate.getUTCMonth(),
                    isoDate.getUTCDate(),
                    12, 0, 0
                ));
            }
            return new Date(date);
        }
        return new Date(Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            12, 0, 0
        ));
    };

    // Estado interno para event_date (string único) - más simple que interested_dates
    const [eventDate, setEventDate] = useState<string | undefined>(() => {
        // Priorizar event_date si existe, luego interested_dates (solo primera fecha)
        if (initialData?.event_date) {
            return typeof initialData.event_date === 'string'
                ? initialData.event_date
                : formatDateForServer(parseDateSafe(initialData.event_date));
        }
        if (initialData?.interested_dates) {
            return typeof initialData.interested_dates === 'string'
                ? initialData.interested_dates
                : initialData.interested_dates[0];
        }
        return undefined;
    });

    const [formData, setFormData] = useState<Omit<CreatePromiseData, 'interested_dates'>>({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        address: initialData?.address || '',
        event_type_id: initialData?.event_type_id || '',
        event_location: initialData?.event_location || '',
        event_name: initialData?.event_name || '',
        duration_hours: initialData?.duration_hours ?? undefined,
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
    const [allContacts, setAllContacts] = useState<Array<{ id: string; name: string; phone: string; email: string | null; status?: string; type?: 'contact' | 'crew' }>>([]);

    // Estado para fecha única (solo una fecha permitida)
    const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
        // Usar eventDate interno para inicializar
        if (eventDate) {
            return [parseDateSafe(eventDate)];
        }
        return [];
    });
    const [month, setMonth] = useState<Date | undefined>(() => {
        if (initialData?.event_date) {
            return parseDateSafe(initialData.event_date);
        }
        if (initialData?.interested_dates) {
            return parseDateSafe(initialData.interested_dates);
        }
        return undefined;
    });
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [referrerInputValue, setReferrerInputValue] = useState(
        initialData?.referrer_name || ''
    );
    const [showReferrerSuggestions, setShowReferrerSuggestions] = useState(false);
    const [filteredReferrerContacts, setFilteredReferrerContacts] = useState<Array<{ id: string; name: string; phone: string; status?: string; type?: 'contact' | 'crew' }>>([]);
    const [selectedContactIndex, setSelectedContactIndex] = useState(-1);
    const [selectedReferrerIndex, setSelectedReferrerIndex] = useState(-1);
    const [conflictosPorFecha, setConflictosPorFecha] = useState<Map<string, AgendaItem[]>>(new Map());
    const referrerSyncedRef = useRef(false);
    const [showCreateReferrerModal, setShowCreateReferrerModal] = useState(false);
    const [newReferrerName, setNewReferrerName] = useState('');
    const [newReferrerPhone, setNewReferrerPhone] = useState('');
    const [isCreatingReferrer, setIsCreatingReferrer] = useState(false);
    const [referrerSearchQuery, setReferrerSearchQuery] = useState('');
    const [showTipoEventoModal, setShowTipoEventoModal] = useState(false);

    const handleTipoEventoCreated = useCallback((newTipoEvento: TipoEventoData) => {
        // Agregar el nuevo tipo de evento a la lista
        const newEventType = {
            id: newTipoEvento.id,
            name: newTipoEvento.nombre,
        };
        setEventTypes((prev) => [...prev, newEventType]);

        // Seleccionar automáticamente el nuevo tipo de evento
        setFormData((prev) => ({
            ...prev,
            event_type_id: newTipoEvento.id,
        }));

        // Limpiar error si existía
        if (errors.event_type_id) {
            setErrors((prev) => ({ ...prev, event_type_id: '' }));
        }

        toast.success(`Tipo de evento "${newTipoEvento.nombre}" creado y seleccionado`);
    }, [errors.event_type_id]);

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
            const [contactsResult, crewResult] = await Promise.all([
                getContacts(studioSlug, {
                    page: 1,
                    limit: 100,
                    status: 'all',
                }),
                obtenerCrewMembers(studioSlug),
            ]);

            const combined: Array<{ id: string; name: string; phone: string; email: string | null; status?: string; type?: 'contact' | 'crew' }> = [];

            // Agregar contactos con su status
            if (contactsResult.success && contactsResult.data) {
                const contacts = contactsResult.data.contacts.map((c) => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    email: c.email || null,
                    status: c.status || 'prospecto', // prospecto, cliente
                    type: 'contact' as const,
                }));
                combined.push(...contacts);
            }

            // Agregar crew members con status "personal" (solo los que tienen teléfono)
            if (crewResult.success && crewResult.data) {
                const crew = crewResult.data
                    .filter((member) => member.phone && member.phone.trim() !== '')
                    .map((member) => ({
                        id: member.id,
                        name: member.name,
                        phone: member.phone!,
                        email: member.email || null,
                        status: 'personal',
                        type: 'crew' as const,
                    }));
                combined.push(...crew);
            }

            setAllContacts(combined);
        } catch (error) {
            console.error('Error loading contacts and crew:', error);
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

    const handleCreateReferrerContact = async () => {
        if (!newReferrerName.trim() || !newReferrerPhone.trim()) {
            toast.error('Nombre y teléfono son requeridos');
            return;
        }

        // Normalizar teléfono (solo números)
        const normalizedPhone = normalizePhone(newReferrerPhone);
        if (normalizedPhone.length !== 10) {
            toast.error('El teléfono debe tener 10 dígitos');
            return;
        }

        setIsCreatingReferrer(true);
        try {
            const result = await createContact(studioSlug, {
                name: newReferrerName.trim(),
                phone: normalizedPhone,
                status: 'prospecto',
            });

            if (result.success && result.data) {
                // Recargar contactos para incluir el nuevo
                await loadAllContacts();

                // Asociar el nuevo contacto como referido
                setReferrerInputValue(`@${result.data.name}`);
                setFormData((prev) => ({
                    ...prev,
                    referrer_contact_id: result.data!.id,
                    referrer_name: undefined,
                }));

                // Cerrar modal y limpiar
                setShowCreateReferrerModal(false);
                setNewReferrerName('');
                setNewReferrerPhone('');
                setShowReferrerSuggestions(false);
                toast.success('Contacto creado y asociado como referido');
            } else {
                toast.error(result.error || 'Error al crear contacto');
            }
        } catch (error) {
            console.error('Error creating referrer contact:', error);
            toast.error('Error al crear contacto');
        } finally {
            setIsCreatingReferrer(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Sincronizar datos iniciales inmediatamente si existen
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    phone: normalizePhone(initialData.phone || ''),
                    email: initialData.email || '',
                    address: initialData.address || '',
                    event_type_id: initialData.event_type_id || '',
                    event_location: initialData.event_location || '',
                    event_name: initialData.event_name || '',
                    duration_hours: initialData.duration_hours ?? undefined,
                    acquisition_channel_id: initialData.acquisition_channel_id ?? '',
                    social_network_id: initialData.social_network_id,
                    referrer_contact_id: initialData.referrer_contact_id,
                    referrer_name: initialData.referrer_name,
                });
                setNameInput(initialData.name || '');

                // Actualizar eventDate interno
                const newEventDate = initialData.event_date
                    ? (typeof initialData.event_date === 'string'
                        ? initialData.event_date
                        : formatDateForServer(parseDateSafe(initialData.event_date)))
                    : initialData.interested_dates
                        ? (typeof initialData.interested_dates === 'string'
                            ? initialData.interested_dates
                            : initialData.interested_dates[0])
                        : undefined;

                setEventDate(newEventDate);

                // Actualizar selectedDates basado en eventDate
                if (newEventDate) {
                    setSelectedDates([parseDateSafe(newEventDate)]);
                    setMonth(parseDateSafe(newEventDate));
                } else {
                    setSelectedDates([]);
                    setMonth(undefined);
                }
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
                    acquisition_channel_id: '',
                    social_network_id: undefined,
                    referrer_contact_id: undefined,
                    referrer_name: undefined,
                });
                setNameInput('');
                setSelectedDates([]);
                setEventDate(undefined);
                setReferrerInputValue('');
            }
            setErrors({});
            setIsInitialLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData, isEditMode]);

    // VALIDACIÓN ESTRICTA: Asegurar que solo haya UNA fecha seleccionada (nunca múltiples)
    useEffect(() => {
        // SIEMPRE limitar a máximo una fecha - FORZAR solo una fecha
        if (selectedDates.length > 1) {
            // Si hay más de una fecha, mantener solo la primera
            console.warn('[EventFormModal] Múltiples fechas detectadas, limitando a una sola fecha');
            setSelectedDates((prev) => [prev[0]]);
            return;
        }
        // Validar que si hay fecha, sea válida
        if (selectedDates.length === 1) {
            const date = selectedDates[0];
            if (isNaN(date.getTime())) {
                console.warn('[EventFormModal] Fecha inválida detectada, limpiando selección');
                setSelectedDates([]);
                setEventDate(undefined);
            }
        }
        // Si no hay fechas, asegurar que eventDate también esté undefined
        if (selectedDates.length === 0 && eventDate !== undefined) {
            setEventDate(undefined);
        }
    }, [selectedDates, eventDate]);

    useEffect(() => {
        if (selectedDates.length > 0) {
            const date = selectedDates[0];
            date.setHours(0, 0, 0, 0);
            // Guardar como string único en eventDate
            const dateString = formatDateForServer(date);
            setEventDate(dateString);
        } else {
            setEventDate(undefined);
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
                // Solo verificar disponibilidad de la primera fecha (única fecha permitida)
                if (selectedDates.length > 0) {
                    const date = selectedDates[0];
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
                }

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

        // Lugar del evento es opcional, no se valida

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
            // Lugar del evento es opcional, puede ser undefined si está vacío
            const eventLocation = formData.event_type_id && formData.event_type_id !== 'none'
                ? (formData.event_location || '').trim() || undefined
                : undefined;

            // duration_hours solo se guarda si hay event_type_id (igual que event_location)
            const durationHours = formData.event_type_id && formData.event_type_id !== 'none' && formData.duration_hours
                ? formData.duration_hours
                : undefined;

            // Normalizar teléfono antes de enviar
            // Convertir eventDate (string) a interested_dates (array) para el schema
            const formDataToSubmit: CreatePromiseData = {
                ...formData,
                phone: normalizedPhone,
                event_location: eventLocation,
                duration_hours: durationHours,
                interested_dates: eventDate ? [eventDate] : undefined,
            };

            let result;

            // Si el contexto es 'event' y hay eventId, y solo se cambió la fecha, usar actualizarFechaEvento
            if (context === 'event' && eventId && isEditMode && initialData?.id) {
                // Verificar si solo se cambió la fecha (comparar eventDate con initialData)
                const initialDate = initialData.event_date
                    ? (typeof initialData.event_date === 'string'
                        ? initialData.event_date
                        : formatDateForServer(parseDateSafe(initialData.event_date)))
                    : initialData.interested_dates
                        ? (typeof initialData.interested_dates === 'string'
                            ? initialData.interested_dates
                            : initialData.interested_dates[0])
                        : null;
                const datesChanged = initialDate !== eventDate;

                // Verificar si otros campos cambiaron
                const otherFieldsChanged =
                    formData.name !== initialData.name ||
                    formData.phone !== initialData.phone ||
                    formData.email !== (initialData.email || '') ||
                    formData.event_type_id !== (initialData.event_type_id || '') ||
                    formData.event_location !== (initialData.event_location || '') ||
                    formData.event_name !== (initialData.event_name || '') ||
                    formData.duration_hours !== (initialData.duration_hours ?? undefined) ||
                    formData.acquisition_channel_id !== (initialData.acquisition_channel_id || '') ||
                    formData.social_network_id !== (initialData.social_network_id || undefined) ||
                    formData.referrer_contact_id !== (initialData.referrer_contact_id || undefined) ||
                    formData.referrer_name !== (initialData.referrer_name || undefined);

                // Si solo cambió la fecha y hay una fecha seleccionada, usar actualizarFechaEvento
                if (datesChanged && !otherFieldsChanged && selectedDates.length === 1) {
                    const nuevaFecha = selectedDates[0];
                    // Normalizar la fecha antes de enviarla
                    const fechaNormalizada = new Date(nuevaFecha);
                    fechaNormalizada.setHours(0, 0, 0, 0);
                    result = await actualizarFechaEvento(studioSlug, {
                        event_id: eventId,
                        event_date: fechaNormalizada,
                    });

                    if (result.success) {
                        toast.success('Fecha del evento actualizada exitosamente');
                        window.dispatchEvent(new CustomEvent('agenda-updated'));
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
                    const updatedData = {
                        id: result.data.id,
                        name: result.data.name,
                        phone: result.data.phone,
                        email: result.data.email,
                        address: result.data.address,
                        acquisition_channel_id: result.data.acquisition_channel_id,
                        social_network_id: result.data.social_network_id,
                        referrer_contact_id: result.data.referrer_contact_id,
                        referrer_name: result.data.referrer_name,
                        // Datos del evento
                        event_type_id: result.data.event_type_id,
                        event_name: result.data.event_name,
                        event_location: result.data.event_location,
                        duration_hours: result.data.duration_hours,
                        event_type: typeof result.data.event_type === 'string' 
                          ? result.data.event_type 
                          : result.data.event_type?.name || null,
                        interested_dates: result.data.interested_dates,
                        event_date: result.data.event_date,
                    };
                    
                    // Siempre disparar evento para otros componentes que escuchan
                    triggerContactUpdate(result.data.id, updatedData);
                    
                    // Si hay onSuccess, pasarle los datos actualizados
                    if (onSuccess) {
                        onSuccess(updatedData);
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
            return 'Seleccionar fecha';
        }
        // Usar formatDisplayDate que usa métodos UTC exclusivamente
        return formatDisplayDate(selectedDates[0]);
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
            zIndex={zIndex}
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

                    {/* Dirección */}
                    <div>
                        <label className="text-sm font-medium text-zinc-300 block mb-2">
                            Dirección
                        </label>
                        <textarea
                            value={formData.address || ''}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, address: e.target.value || undefined }));
                            }}
                            placeholder="Dirección del cliente (opcional)"
                            rows={2}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
                        />
                    </div>

                    {/* Tipo de Evento y Nombre del Evento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-zinc-300 block mb-2">
                                Tipo de Evento <span className="text-red-500">*</span>
                            </label>
                            <select
                                ref={eventTypeSelectRef}
                                value={formData.event_type_id || 'none'}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;

                                    // Si se selecciona "create_new", abrir el modal y resetear el select
                                    if (selectedValue === 'create_new') {
                                        setShowTipoEventoModal(true);
                                        // Resetear el select al valor anterior usando el ref
                                        if (eventTypeSelectRef.current) {
                                            eventTypeSelectRef.current.value = formData.event_type_id || 'none';
                                        }
                                        return;
                                    }

                                    const newEventTypeId = selectedValue === 'none' ? '' : selectedValue;
                                    setFormData((prev) => ({
                                        ...prev,
                                        event_type_id: newEventTypeId,
                                        // Limpiar lugar del evento si se deselecciona el tipo
                                        ...(newEventTypeId === '' ? { event_location: '' } : {}),
                                        // No auto-completar event_location, es opcional
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
                                <option value="create_new" className="text-emerald-400 font-medium">
                                    + Crear evento
                                </option>
                            </select>
                            {errors.event_type_id && (
                                <p className="mt-1 text-xs text-red-500">{errors.event_type_id}</p>
                            )}
                        </div>

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
                        </div>
                    </div>

                    {/* Lugar del Evento y Duración */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Lugar del Evento */}
                        <div>
                            <label className="text-sm font-medium text-zinc-300 block mb-2">
                                Lugar del Evento
                            </label>
                            <ZenInput
                                type="text"
                                placeholder="Ej: Salón de eventos, Playa, Jardín... (opcional)"
                                value={formData.event_location || ''}
                                onChange={(e) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        event_location: e.target.value,
                                    }));
                                }}
                                disabled={!formData.event_type_id || formData.event_type_id === 'none'}
                                className="w-full h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                error={errors.event_location}
                            />
                        </div>

                        {/* Duración del Evento */}
                        <div>
                            <label className="text-sm font-medium text-zinc-300 block mb-2">
                                Duración del Evento (horas)
                            </label>
                            <ZenInput
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Ej: 6"
                                value={formData.duration_hours?.toString() || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                        setFormData((prev) => ({
                                            ...prev,
                                            duration_hours: undefined,
                                        }));
                                    } else {
                                        const numValue = parseInt(value, 10);
                                        if (!isNaN(numValue) && numValue > 0) {
                                            setFormData((prev) => ({
                                                ...prev,
                                                duration_hours: numValue,
                                            }));
                                        }
                                    }
                                    if (errors.duration_hours) {
                                        setErrors((prev) => ({ ...prev, duration_hours: '' }));
                                    }
                                }}
                                disabled={!formData.event_type_id || formData.event_type_id === 'none'}
                                className="w-full h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                error={errors.duration_hours}
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
                                            const searchText = afterAt.trim();
                                            setReferrerSearchQuery(searchText);
                                            if (searchText) {
                                                const filtered = allContacts.filter((c) =>
                                                    c.name.toLowerCase().includes(searchText.toLowerCase())
                                                );
                                                setFilteredReferrerContacts(filtered.map((c) => ({
                                                    id: c.id,
                                                    name: c.name,
                                                    phone: c.phone,
                                                    status: c.status,
                                                    type: c.type,
                                                })));
                                                setShowReferrerSuggestions(true);
                                            } else {
                                                setFilteredReferrerContacts(allContacts.slice(0, 10).map((c) => ({
                                                    id: c.id,
                                                    name: c.name,
                                                    phone: c.phone,
                                                    status: c.status,
                                                    type: c.type,
                                                })));
                                                setShowReferrerSuggestions(true);
                                            }
                                            setFormData((prev) => ({ ...prev, referrer_name: undefined }));
                                        } else {
                                            // Sin @: mostrar sugerencias y botón crear si hay texto
                                            const searchText = value.trim();
                                            setReferrerSearchQuery(searchText);
                                            if (searchText) {
                                                const filtered = allContacts.filter((c) =>
                                                    c.name.toLowerCase().includes(searchText.toLowerCase())
                                                );
                                                setFilteredReferrerContacts(filtered.map((c) => ({
                                                    id: c.id,
                                                    name: c.name,
                                                    phone: c.phone,
                                                    status: c.status,
                                                    type: c.type,
                                                })));
                                                setShowReferrerSuggestions(true);
                                            } else {
                                                setShowReferrerSuggestions(false);
                                            }
                                            setFormData((prev) => ({
                                                ...prev,
                                                referrer_name: value || undefined,
                                                referrer_contact_id: undefined,
                                            }));
                                        }
                                    }}
                                    onKeyDown={handleReferrerInputKeyDown}
                                    onFocus={() => {
                                        const value = referrerInputValue;
                                        if (value.includes('@')) {
                                            const afterAt = value.split('@').pop() || '';
                                            const searchText = afterAt.trim();
                                            setReferrerSearchQuery(searchText);
                                            if (searchText) {
                                                const filtered = allContacts.filter((c) =>
                                                    c.name.toLowerCase().includes(searchText.toLowerCase())
                                                );
                                                setFilteredReferrerContacts(filtered.map((c) => ({
                                                    id: c.id,
                                                    name: c.name,
                                                    phone: c.phone,
                                                    status: c.status,
                                                    type: c.type,
                                                })));
                                            } else {
                                                setFilteredReferrerContacts(allContacts.slice(0, 10).map((c) => ({
                                                    id: c.id,
                                                    name: c.name,
                                                    phone: c.phone,
                                                    status: c.status,
                                                    type: c.type,
                                                })));
                                            }
                                            setShowReferrerSuggestions(true);
                                        } else if (value.trim()) {
                                            const searchText = value.trim();
                                            setReferrerSearchQuery(searchText);
                                            const filtered = allContacts.filter((c) =>
                                                c.name.toLowerCase().includes(searchText.toLowerCase())
                                            );
                                            setFilteredReferrerContacts(filtered.map((c) => ({
                                                id: c.id,
                                                name: c.name,
                                                phone: c.phone,
                                                status: c.status,
                                                type: c.type,
                                            })));
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

                                {showReferrerSuggestions && (
                                    <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
                                        {filteredReferrerContacts.length > 0 ? (
                                            <>
                                                {filteredReferrerContacts.map((contact, index) => (
                                                    <button
                                                        key={contact.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const hasAt = referrerInputValue.includes('@');
                                                            setReferrerInputValue(hasAt ? `@${contact.name}` : contact.name);
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
                                                        {contact.status && (
                                                            <span className={`ml-auto text-xs px-2 py-0.5 rounded ${contact.status === 'personal'
                                                                ? 'bg-purple-500/20 text-purple-300'
                                                                : contact.status === 'cliente'
                                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                                    : 'bg-blue-500/20 text-blue-300'
                                                                }`}>
                                                                {contact.status === 'personal' ? 'Personal' : contact.status === 'cliente' ? 'Cliente' : 'Prospecto'}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                                {referrerSearchQuery.trim() && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewReferrerName(referrerSearchQuery);
                                                            setShowCreateReferrerModal(true);
                                                            setShowReferrerSuggestions(false);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors border-t border-zinc-700"
                                                    >
                                                        <span className="text-emerald-400">+</span>
                                                        <span>Crear contacto "{referrerSearchQuery}"</span>
                                                    </button>
                                                )}
                                            </>
                                        ) : referrerSearchQuery.trim() ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewReferrerName(referrerSearchQuery);
                                                    setShowCreateReferrerModal(true);
                                                    setShowReferrerSuggestions(false);
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                                            >
                                                <span className="text-emerald-400">+</span>
                                                <span>Crear contacto "{referrerSearchQuery}"</span>
                                            </button>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Fecha de Interés / Fecha del Evento */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 block mb-2">
                            {context === 'event' ? 'Fecha del Evento' : 'Fecha de Interés'}
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
                                className="w-auto p-0 bg-zinc-900 border-zinc-700 z-9999 overflow-visible"
                                align="start"
                                sideOffset={4}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                                <div className="p-3">
                                    <Calendar
                                        mode="single"
                                        required
                                        selected={selectedDates.length > 0 ? selectedDates[0] : undefined}
                                        onSelect={(date: Date | undefined) => {
                                            // VALIDACIÓN ESTRICTA: Solo permitir UNA fecha única
                                            // Si date es undefined (usuario intenta deseleccionar), ignorar
                                            if (!date) {
                                                return;
                                            }

                                            // Normalizar fecha a mediodía UTC para evitar problemas de zona horaria
                                            const normalizedDate = new Date(Date.UTC(
                                                date.getUTCFullYear(),
                                                date.getUTCMonth(),
                                                date.getUTCDate(),
                                                12, 0, 0
                                            ));

                                            // SIEMPRE reemplazar con un array de un solo elemento (nunca agregar)
                                            setSelectedDates([normalizedDate]);
                                            setEventDate(formatDateForServer(normalizedDate));
                                            setMonth(normalizedDate);
                                        }}
                                        month={month}
                                        onMonthChange={setMonth}
                                        numberOfMonths={1}
                                        locale={es}
                                        buttonVariant="ghost"
                                        className="border border-zinc-700 rounded-lg"
                                    />
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-700 mt-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCalendarOpen(false);
                                            }}
                                            className="px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCalendarOpen(false);
                                            }}
                                            className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-zinc-400 mt-1">
                            {context === 'event'
                                ? 'Puedes cambiar la fecha del evento siempre y cuando esté disponible'
                                : 'Selecciona una fecha de interés para la promesa'
                            }
                        </p>
                        {selectedDates.length > 0 && (() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selectedDate = new Date(selectedDates[0]);
                            selectedDate.setHours(0, 0, 0, 0);
                            return selectedDate < today;
                        })() && (
                                <ZenCard variant="outlined" className="bg-orange-900/20 border-orange-700/50 mt-2">
                                    <ZenCardContent className="p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                                            <div className="space-y-1.5 flex-1">
                                                <p className="text-xs font-medium text-orange-300">
                                                    Has seleccionado una fecha que ya ha pasado:
                                                </p>
                                                <p className="text-xs text-orange-200/80">
                                                    • {formatDisplayDate(selectedDates[0])}
                                                </p>
                                            </div>
                                        </div>
                                    </ZenCardContent>
                                </ZenCard>
                            )}
                        {/* Removed: Multiple dates display - now only single date allowed */}
                        {selectedDates.length > 0 && (() => {
                            const fecha = selectedDates[0];
                            const dateKey = fecha.toISOString().split('T')[0];
                            const conflictos = conflictosPorFecha.get(dateKey);
                            if (!conflictos || conflictos.length === 0) return null;

                            return (
                                <ZenCard key={dateKey} variant="outlined" className="bg-amber-900/20 border-amber-700/50 mt-2">
                                    <ZenCardContent className="p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                                            <div className="space-y-1.5 flex-1">
                                                <p className="text-xs font-medium text-amber-300">
                                                    {formatDisplayDate(fecha)} ya está programada:
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
                        })()}
                    </div>
                </form>
            )}

            {/* Modal rápido para crear contacto referido */}
            <ZenDialog
                isOpen={showCreateReferrerModal}
                onClose={() => {
                    setShowCreateReferrerModal(false);
                    setNewReferrerName('');
                    setNewReferrerPhone('');
                }}
                title="Crear Contacto Referido"
                description="Ingresa los datos mínimos para crear el contacto, después los podrás completar"
                maxWidth="sm"
                zIndex={10100}
            >
                <div className="space-y-4">
                    <ZenInput
                        label="Nombre"
                        value={newReferrerName}
                        onChange={(e) => setNewReferrerName(e.target.value)}
                        placeholder="Nombre del referido"
                        required
                        autoFocus
                    />
                    <ZenInput
                        label="Teléfono"
                        type="tel"
                        value={newReferrerPhone}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 10) {
                                setNewReferrerPhone(value);
                            }
                        }}
                        placeholder="10 dígitos"
                        required
                        maxLength={10}
                    />
                    <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                        <ZenButton
                            variant="ghost"
                            onClick={() => {
                                setShowCreateReferrerModal(false);
                                setNewReferrerName('');
                                setNewReferrerPhone('');
                            }}
                            disabled={isCreatingReferrer}
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={handleCreateReferrerContact}
                            loading={isCreatingReferrer}
                            disabled={!newReferrerName.trim() || !newReferrerPhone.trim() || newReferrerPhone.length !== 10}
                        >
                            Crear y Asociar
                        </ZenButton>
                    </div>
                </div>
            </ZenDialog>

            {/* Modal enriquecido para agregar/editar tipo de evento */}
            <TipoEventoEnrichedModal
                isOpen={showTipoEventoModal}
                onClose={() => {
                    setShowTipoEventoModal(false);
                    // Disparar evento para cerrar overlays
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('close-overlays'));
                    }
                }}
                onSuccess={handleTipoEventoCreated}
                studioSlug={studioSlug}
                zIndex={zIndex + 10}
            />
        </ZenDialog>
    );
}

