'use client';

import React, { useState, useEffect } from 'react';
import { ZenInput, ZenDialog, ZenTextarea, ZenSelect } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import type { ZenSelectOption } from '@/components/ui/zen';
import { toast } from 'sonner';
import {
    createContact,
    updateContact,
    getContactById,
    getAcquisitionChannels,
    getSocialNetworks,
    getContacts,
    getContactEvents
} from '@/lib/actions/studio/builder/commercial/contacts';
import type { CreateContactData, Contact } from '@/lib/actions/schemas/contacts-schemas';
import { AvatarManager } from '@/components/shared/avatar';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { formatDate } from '@/lib/actions/utils/formatting';
import { Calendar, ExternalLink } from 'lucide-react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactId?: string | null;
    studioSlug: string;
    onSuccess: (contact?: Contact) => void;
}

export function ContactModal({
    isOpen,
    onClose,
    contactId,
    studioSlug,
    onSuccess
}: ContactModalProps) {
    const { triggerRefresh } = useStorageRefresh(studioSlug);
    const [loading, setLoading] = useState(false);
    const [loadingContact, setLoadingContact] = useState(false);
    const [formData, setFormData] = useState<CreateContactData>({
        name: '',
        phone: '',
        email: '',
        address: '',
        avatar_url: '',
        status: 'prospecto',
        acquisition_channel_id: undefined,
        social_network_id: undefined,
        referrer_contact_id: undefined,
        referrer_name: '',
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [acquisitionChannels, setAcquisitionChannels] = useState<Array<{ id: string; name: string }>>([]);
    const [socialNetworks, setSocialNetworks] = useState<Array<{ id: string; name: string }>>([]);
    const [referrerContacts, setReferrerContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [referrerInputValue, setReferrerInputValue] = useState('');
    const [showReferrerSuggestions, setShowReferrerSuggestions] = useState(false);
    const [filteredReferrerContacts, setFilteredReferrerContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [events, setEvents] = useState<Array<{
        id: string;
        name: string;
        event_date: Date;
        status: string;
        event_type: string | null;
        cotizacion: { id: string; status: string; name: string } | null;
    }>>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAcquisitionChannels();
            loadSocialNetworks();
            loadReferrerContacts();
            if (contactId) {
                // Limpiar formulario antes de cargar nuevo contacto
                resetForm();
                loadContact();
                loadEvents();
            } else {
                resetForm();
                setEvents([]);
            }
        } else {
            // Limpiar cuando se cierra el modal
            resetForm();
            setLoadingContact(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, contactId]);

    const loadAcquisitionChannels = async () => {
        try {
            const result = await getAcquisitionChannels();
            if (result.success && result.data) {
                setAcquisitionChannels(result.data.map(c => ({ id: c.id, name: c.name })));
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    };

    const loadSocialNetworks = async () => {
        try {
            const result = await getSocialNetworks();
            if (result.success && result.data) {
                setSocialNetworks(result.data.map((n: { id: string; name: string }) => ({ id: n.id, name: n.name })));
            }
        } catch (error) {
            console.error('Error loading social networks:', error);
        }
    };

    const loadReferrerContacts = async () => {
        try {
            const result = await getContacts(studioSlug, { page: 1, limit: 100, status: 'all' });
            if (result.success && result.data) {
                // Excluir el contacto actual si está editando
                const filtered = contactId
                    ? result.data.contacts.filter(c => c.id !== contactId)
                    : result.data.contacts;
                const contacts = filtered.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone
                }));
                setReferrerContacts(contacts);
                setFilteredReferrerContacts(contacts);
            }
        } catch (error) {
            console.error('Error loading referrer contacts:', error);
        }
    };

    const loadContact = async () => {
        if (!contactId) return;
        try {
            setLoadingContact(true);
            setLoading(true);
            const result = await getContactById(studioSlug, contactId);
            if (result.success && result.data) {
                setFormData({
                    name: result.data.name,
                    phone: normalizePhone(result.data.phone),
                    email: result.data.email ? result.data.email : '',
                    address: result.data.address ? result.data.address : '',
                    avatar_url: result.data.avatar_url ? result.data.avatar_url : '',
                    status: result.data.status as 'prospecto' | 'cliente',
                    acquisition_channel_id: result.data.acquisition_channel_id ?? undefined,
                    social_network_id: result.data.social_network_id ?? undefined,
                    referrer_contact_id: result.data.referrer_contact_id ?? undefined,
                    referrer_name: result.data.referrer_name ? result.data.referrer_name : '',
                    notes: result.data.notes ? result.data.notes : ''
                });

                // Establecer valor del input de referido
                if (result.data.referrer_contact_id && result.data.referrer_contact) {
                    setReferrerInputValue(`@${result.data.referrer_contact.name}`);
                } else if (result.data.referrer_name) {
                    setReferrerInputValue(result.data.referrer_name);
                } else {
                    setReferrerInputValue('');
                }
            } else {
                toast.error(result.error || 'Error al cargar contacto');
            }
        } catch (error) {
            console.error('Error loading contact:', error);
            toast.error('Error al cargar contacto');
        } finally {
            setLoadingContact(false);
            setLoading(false);
        }
    };

    const loadEvents = async () => {
        if (!contactId) return;
        try {
            setLoadingEvents(true);
            const result = await getContactEvents(studioSlug, contactId);
            if (result.success && result.data) {
                setEvents(result.data);
            }
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            avatar_url: '',
            status: 'prospecto',
            acquisition_channel_id: undefined,
            social_network_id: undefined,
            referrer_contact_id: undefined,
            referrer_name: '',
            notes: ''
        });
        setErrors({});
        setReferrerInputValue('');
        setShowReferrerSuggestions(false);
    };

    const handleInputChange = <K extends keyof CreateContactData>(
        field: K,
        value: CreateContactData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async () => {
        setErrors({});

        // Validación básica en el cliente
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }

        const normalizedPhone = normalizePhone(formData.phone || '');
        if (!normalizedPhone || normalizedPhone.length !== 10) {
            newErrors.phone = normalizedPhone.length === 0
                ? 'El teléfono es requerido'
                : 'El teléfono debe tener exactamente 10 dígitos';
        }

        // Validar email solo si está presente
        if (formData.email && formData.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                newErrors.email = 'Email inválido';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true);

            // Preparar datos con teléfono normalizado
            // Nota: Los canales de adquisición vienen de la BD (getAcquisitionChannels)
            // Solo "Ninguno" es una opción manual para limpiar el campo
            const submitData: CreateContactData = {
                name: formData.name,
                phone: normalizedPhone,
                status: formData.status,
                email: formData.email?.trim() || undefined,
                address: formData.address?.trim() || undefined,
                avatar_url: formData.avatar_url?.trim() || undefined,
                // Enviar explícitamente undefined o el valor para que updateContact lo maneje
                acquisition_channel_id: formData.acquisition_channel_id,
                social_network_id: formData.social_network_id,
                referrer_contact_id: formData.referrer_contact_id,
                referrer_name: formData.referrer_name?.trim() || undefined,
                notes: formData.notes?.trim() || undefined,
            };

            const result = contactId
                ? await updateContact(studioSlug, { ...submitData, id: contactId })
                : await createContact(studioSlug, submitData);

            if (result.success && result.data) {
                toast.success(contactId ? 'Contacto actualizado exitosamente' : 'Contacto creado exitosamente');
                triggerRefresh(); // Disparar refresh de storage
                onSuccess(result.data); // Pasar el contacto creado/actualizado
                onClose();
                resetForm();
            } else {
                // Manejar errores de Zod
                if (result.error) {
                    try {
                        const zodErrors = JSON.parse(result.error);
                        if (Array.isArray(zodErrors)) {
                            const fieldErrors: Record<string, string> = {};
                            zodErrors.forEach((err: { path?: string[]; message?: string }) => {
                                if (err.path && err.path.length > 0) {
                                    fieldErrors[err.path[0]] = err.message || 'Error de validación';
                                }
                            });
                            setErrors(fieldErrors);
                            toast.error('Por favor corrige los errores en el formulario');
                        } else {
                            toast.error(result.error);
                        }
                    } catch {
                        // Si no es JSON, mostrar error directamente
                        toast.error(result.error);
                        if (result.error.includes('teléfono')) {
                            setErrors({ phone: result.error });
                        } else if (result.error.includes('email')) {
                            setErrors({ email: result.error });
                        }
                    }
                } else {
                    toast.error('Error al guardar contacto');
                }
            }
        } catch (error) {
            console.error('Error saving contact:', error);
            toast.error('Error al guardar contacto');
        } finally {
            setLoading(false);
        }
    };

    // Función para obtener el ID del canal "Referidos"
    const getReferidosChannelId = (): string | undefined => {
        const referidosChannel = acquisitionChannels.find(c =>
            c.name.toLowerCase().includes('referido') || c.name.toLowerCase().includes('referral')
        );
        return referidosChannel?.id;
    };

    const getRedesSocialesChannelId = (): string | undefined => {
        const redesChannel = acquisitionChannels.find(c =>
            c.name.toLowerCase().includes('red') || c.name.toLowerCase().includes('social')
        );
        return redesChannel?.id;
    };

    const normalizePhone = (value: string): string => {
        // Quitar todos los caracteres no numéricos
        const digitsOnly = value.replace(/\D/g, '');
        // Tomar los últimos 10 dígitos
        return digitsOnly.slice(-10);
    };

    const acquisitionChannelOptions: ZenSelectOption[] = [
        { value: 'none', label: 'Ninguno' },
        ...acquisitionChannels.map(c => ({ value: c.id, label: c.name }))
    ];

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title={contactId ? 'Editar Contacto' : 'Nuevo Contacto'}
            onSave={handleSubmit}
            onCancel={onClose}
            saveLabel={contactId ? 'Actualizar' : 'Crear'}
            cancelLabel="Cancelar"
            isLoading={loading}
            maxWidth="2xl"
        >
            {loadingContact && contactId ? (
                <div className="space-y-6 animate-pulse">
                    {/* Skeleton Avatar + Info básica */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <Skeleton className="w-24 h-24 rounded-full bg-zinc-700" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <Skeleton className="h-10 w-full bg-zinc-700" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Skeleton className="h-10 bg-zinc-700" />
                                <Skeleton className="h-10 bg-zinc-700" />
                            </div>
                        </div>
                    </div>
                    {/* Skeleton Dirección y otros campos */}
                    <Skeleton className="h-20 w-full bg-zinc-700" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 bg-zinc-700" />
                        <Skeleton className="h-10 bg-zinc-700" />
                    </div>
                    <Skeleton className="h-10 w-full bg-zinc-700" />
                    <Skeleton className="h-24 w-full bg-zinc-700" />
                </div>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                    {/* Sección 1: Avatar + Información básica en 2 columnas */}
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Columna 1: Avatar - Ancho fijo */}
                        <div className="flex-shrink-0 flex justify-center md:justify-start">
                            <AvatarManager
                                url={formData.avatar_url || null}
                                onUpdate={(url) => handleInputChange('avatar_url', url)}
                                studioSlug={studioSlug}
                                category="clientes"
                                subcategory="contactos-avatars"
                                size="md"
                                variant="compact"
                                loading={loading}
                                disabled={loading}
                                showAdjustButton={false}
                                cropTitle="Ajustar foto de contacto"
                                cropDescription="Arrastra y redimensiona el área circular para ajustar la foto."
                                cropInstructions={[
                                    "• Arrastra para mover el área de recorte",
                                    "• Usa las esquinas para redimensionar",
                                    "• El área circular será la foto del contacto"
                                ]}
                            />
                        </div>

                        {/* Columna 2: Nombre, Teléfono, Email - Ocupa el resto */}
                        <div className="flex-1 space-y-4 min-w-0">
                            <ZenInput
                                id="name"
                                label="Nombre *"
                                required
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Nombre completo"
                                disabled={loading}
                                error={errors.name}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ZenInput
                                    id="phone"
                                    label="Teléfono *"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const normalized = normalizePhone(e.target.value);
                                        handleInputChange('phone', normalized);
                                    }}
                                    placeholder="10 dígitos"
                                    disabled={loading}
                                    error={errors.phone}
                                />

                                <ZenInput
                                    id="email"
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="email@ejemplo.com"
                                    disabled={loading}
                                    error={errors.email}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Dirección, Estado, Canal de Adquisición */}
                    <div className="space-y-4">
                        <ZenTextarea
                            label="Dirección"
                            value={formData.address || ''}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            placeholder="Dirección completa"
                            disabled={loading}
                            minRows={2}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ZenSelect
                                label="Tipo de Contacto"
                                value={formData.status}
                                onValueChange={(value) => {
                                    if (value === 'prospecto' || value === 'cliente') {
                                        handleInputChange('status', value);
                                    }
                                }}
                                options={[
                                    { value: 'prospecto', label: 'Prospecto' },
                                    { value: 'cliente', label: 'Cliente' }
                                ]}
                                disabled={loading}
                                disableSearch
                            />

                            <ZenSelect
                                label="Canal de Adquisición"
                                value={formData.acquisition_channel_id || 'none'}
                                onValueChange={(value) => {
                                    handleInputChange('acquisition_channel_id', value === 'none' ? undefined : value);
                                    // Limpiar referrer cuando cambia el canal
                                    if (value !== getReferidosChannelId()) {
                                        handleInputChange('referrer_contact_id', undefined);
                                        handleInputChange('referrer_name', '');
                                        setReferrerInputValue('');
                                    }
                                    // Limpiar red social cuando cambia el canal
                                    if (value !== getRedesSocialesChannelId()) {
                                        handleInputChange('social_network_id', undefined);
                                    }
                                }}
                                options={acquisitionChannelOptions}
                                placeholder="Seleccionar canal"
                                disabled={loading}
                                disableSearch
                            />
                        </div>

                        {/* Selector de Red Social (solo si canal es "Redes Sociales") */}
                        {formData.acquisition_channel_id === getRedesSocialesChannelId() && (
                            <div>
                                <ZenSelect
                                    label="Red Social"
                                    value={formData.social_network_id || 'none'}
                                    onValueChange={(value) => {
                                        handleInputChange('social_network_id', value === 'none' ? undefined : value);
                                    }}
                                    options={[
                                        { value: 'none', label: 'Seleccionar red social' },
                                        ...socialNetworks.map((n: { id: string; name: string }) => ({ value: n.id, label: n.name }))
                                    ]}
                                    placeholder="Seleccionar red social"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <div>

                            {/* Input para Referidos con @mention */}
                            {formData.acquisition_channel_id === getReferidosChannelId() && (
                                <div className="mt-4 space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">
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

                                                // Detectar @ y filtrar contactos
                                                if (value.includes('@')) {
                                                    const afterAt = value.split('@').pop() || '';
                                                    if (afterAt.trim()) {
                                                        const filtered = referrerContacts.filter(c =>
                                                            c.name.toLowerCase().includes(afterAt.toLowerCase())
                                                        );
                                                        setFilteredReferrerContacts(filtered);
                                                        setShowReferrerSuggestions(true);
                                                    } else {
                                                        setFilteredReferrerContacts(referrerContacts);
                                                        setShowReferrerSuggestions(true);
                                                    }
                                                    // Si hay @, limpiar referrer_name
                                                    handleInputChange('referrer_name', '');
                                                } else {
                                                    setShowReferrerSuggestions(false);
                                                    // Si no hay @, es nombre histórico
                                                    handleInputChange('referrer_name', value);
                                                    handleInputChange('referrer_contact_id', undefined);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (referrerInputValue.includes('@')) {
                                                    setShowReferrerSuggestions(true);
                                                }
                                            }}
                                            disabled={loading}
                                        />

                                        {/* Lista de sugerencias */}
                                        {showReferrerSuggestions && filteredReferrerContacts.length > 0 && (
                                            <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
                                                {filteredReferrerContacts.map((contact) => (
                                                    <button
                                                        key={contact.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setReferrerInputValue(`@${contact.name}`);
                                                            handleInputChange('referrer_contact_id', contact.id);
                                                            handleInputChange('referrer_name', '');
                                                            setShowReferrerSuggestions(false);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
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
                    </div>

                    {/* Sección 3: Notas */}
                    <ZenTextarea
                        label="Notas"
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Notas adicionales..."
                        disabled={loading}
                        minRows={3}
                    />

                    {/* Sección 4: Eventos Asociados */}
                    {contactId && (
                        <div className="space-y-3 pt-2 border-t border-zinc-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-zinc-300">
                                    Eventos Asociados
                                </h3>
                                {!loadingEvents && (
                                    <span className="text-xs text-zinc-400">
                                        {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                                    </span>
                                )}
                            </div>

                            {loadingEvents ? (
                                <div className="space-y-2">
                                    {[...Array(2)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full bg-zinc-700" />
                                    ))}
                                </div>
                            ) : events.length === 0 ? (
                                <div className="text-center py-6 text-zinc-500 text-sm">
                                    No hay eventos asociados
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {events.map((event) => (
                                        <button
                                            key={event.id}
                                            type="button"
                                            onClick={() => {
                                                // TODO: Navegar a detalle de evento cuando exista
                                                toast.info('Navegación a detalle de evento próximamente');
                                            }}
                                            className="w-full text-left p-3 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Calendar className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                                                        <span className="font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                                                            {event.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                        <span>{formatDate(event.event_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        {event.event_type && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{event.event_type}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {event.cotizacion && (
                                                        <div className="mt-2">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${event.cotizacion.status === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                event.cotizacion.status === 'aceptada' ? 'bg-green-500/20 text-green-400' :
                                                                    event.cotizacion.status === 'rechazada' ? 'bg-red-500/20 text-red-400' :
                                                                        'bg-zinc-700 text-zinc-300'
                                                                }`}>
                                                                {event.cotizacion.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </form>
            )}
        </ZenDialog>
    );
}

