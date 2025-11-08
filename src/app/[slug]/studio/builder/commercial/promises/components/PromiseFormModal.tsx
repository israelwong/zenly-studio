'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ZenDialog, ZenInput } from '@/components/ui/zen';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { createPromise, updatePromise, getEventTypes, getPromiseIdByContactId } from '@/lib/actions/studio/builder/commercial/promises';
import { getContacts, getAcquisitionChannels, getSocialNetworks } from '@/lib/actions/studio/builder/commercial/contacts';
import type { CreatePromiseData, UpdatePromiseData } from '@/lib/actions/schemas/promises-schemas';

interface PromiseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
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
    };
    onSuccess?: () => void;
}

export function PromiseFormModal({
    isOpen,
    onClose,
    studioSlug,
    initialData,
    onSuccess,
}: PromiseFormModalProps) {
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

    useEffect(() => {
        if (isOpen) {
            setIsInitialLoading(true);
            Promise.all([
                loadEventTypes(),
                loadAcquisitionChannels(),
                loadSocialNetworks(),
                loadAllContacts(),
            ]).finally(() => {
                setIsInitialLoading(false);
            });

            // Sincronizar datos iniciales cuando se abre el modal
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
                // Inicializar referrerInputValue: si hay referrer_name, usarlo; si no, se sincronizará cuando se carguen los contactos
                setReferrerInputValue(initialData.referrer_name || '');
            }
        } else {
            // Resetear formulario al cerrar solo si no es modo edición
            if (!isEditMode) {
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
                setNameInput('');
                setSelectedDates([]);
                setReferrerInputValue('');
            }
            setErrors({});
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

    // Sincronizar referrerInputValue cuando hay referrer_contact_id pero no referrer_name
    useEffect(() => {
        // Solo sincronizar si:
        // 1. Hay referrer_contact_id en formData
        // 2. No hay referrer_name (o está vacío)
        // 3. Los contactos ya se cargaron
        if (
            formData.referrer_contact_id &&
            !formData.referrer_name &&
            allContacts.length > 0
        ) {
            const referrerContact = allContacts.find((c) => c.id === formData.referrer_contact_id);
            if (referrerContact) {
                // Solo actualizar si el valor actual no coincide con el nombre del contacto
                const expectedValue = `@${referrerContact.name}`;
                setReferrerInputValue((current) => {
                    if (current !== expectedValue) {
                        return expectedValue;
                    }
                    return current;
                });
            }
        }
    }, [formData.referrer_contact_id, formData.referrer_name, allContacts]);

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

    const handleSubmit = useCallback(async () => {
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
                            router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseResult.data.promise_id}`);
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
    }, [studioSlug, formData, isEditMode, initialData, onClose, onSuccess, router]);

    const formatDatesDisplay = () => {
        if (selectedDates.length === 0) return 'Seleccionar fechas';
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
            maxWidth="2xl"
            onSave={handleSubmit}
            onCancel={onClose}
            saveLabel={isEditMode ? 'Actualizar' : 'Crear Promesa'}
            cancelLabel="Cancelar"
            isLoading={loading}
        >
            {isInitialLoading ? (
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
                        <label className="text-sm font-medium text-zinc-300 block mb-2">
                            Tipo de Evento <span className="text-red-500">*</span>
                        </label>
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
                            className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${errors.event_type_id
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-zinc-700 hover:border-zinc-600'
                                }`}
                        >
                            <option value="none">Seleccionar tipo de evento</option>
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
                            disabled={acquisitionChannels.length === 0}
                            className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.acquisition_channel_id
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-zinc-700 hover:border-zinc-600'
                                }`}
                        >
                            <option value="none">Seleccionar canal</option>
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
                    </div>
                </form>
            )}
        </ZenDialog>
    );
}

