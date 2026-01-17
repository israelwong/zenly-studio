'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZenInput, ZenDialog, ZenTextarea, ZenConfirmModal, ZenButton, ZenBadge } from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { toast } from 'sonner';
import {
    createContact,
    updateContact,
    getContactById,
    getAcquisitionChannels,
    getSocialNetworks,
    getContacts,
    getContactEvents,
    deleteContact,
    checkContactAssociations,
    getContactPromises
} from '@/lib/actions/studio/commercial/contacts';
import type { CreateContactData, Contact } from '@/lib/actions/schemas/contacts-schemas';
import { AvatarManager } from '@/components/shared/avatar';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { useContactRefresh } from '@/hooks/useContactRefresh';
import { formatDate } from '@/lib/actions/utils/formatting';
import { formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { Calendar, ArrowRight, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactId?: string | null;
    studioSlug: string;
    onSuccess: (contact?: Contact, wasEditing?: boolean) => void;
}

function ContactModalComponent({
    isOpen,
    onClose,
    contactId,
    studioSlug,
    onSuccess
}: ContactModalProps) {
    const { triggerRefresh } = useStorageRefresh(studioSlug);
    const { triggerContactUpdate } = useContactRefresh();
    const [loading, setLoading] = useState(false);
    const [loadingContact, setLoadingContact] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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
    const [promises, setPromises] = useState<Array<{
        id: string;
        event_type_name: string | null;
        pipeline_stage_name: string | null;
        created_at: Date;
        has_approved_quote: boolean;
    }>>([]);
    const [loadingPromises, setLoadingPromises] = useState(false);
    const router = useRouter();
    const hasLoadedRef = useRef<boolean>(false);
    const loadedContactIdRef = useRef<string | null | undefined>(null);
    const isInitializingRef = useRef<boolean>(false);
    const previousAvatarUrlRef = useRef<string | null>(null);

    // Función helper para normalizar teléfono (debe estar antes de las funciones que la usan)
    const normalizePhone = useCallback((value: string): string => {
        // Quitar todos los caracteres no numéricos
        const digitsOnly = value.replace(/\D/g, '');
        // Tomar solo los últimos 10 dígitos
        return digitsOnly.slice(-10);
    }, []);

    // Usar refs para funciones para evitar que useEffect se ejecute cuando cambian
    const loadAcquisitionChannelsRef = useRef(async () => {
        try {
            const result = await getAcquisitionChannels();
            if (result.success && result.data) {
                setAcquisitionChannels(result.data);
            }
        } catch (error) {
            console.error('Error loading acquisition channels:', error);
        }
    });

    const loadSocialNetworksRef = useRef(async () => {
        try {
            const result = await getSocialNetworks();
            if (result.success && result.data) {
                setSocialNetworks(result.data);
            }
        } catch (error) {
            console.error('Error loading social networks:', error);
        }
    });

    const loadReferrerContactsRef = useRef(async (excludeContactId?: string | null) => {
        try {
            const result = await getContacts(studioSlug, { page: 1, limit: 100, status: 'all' });
            if (result.success && result.data) {
                const contacts = result.data.contacts
                    .filter((c: Contact) => c.id !== excludeContactId)
                    .map((c: Contact) => ({
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
    });

    const loadContactRef = useRef(async (id: string) => {
        if (!id) return;
        try {
            setLoadingContact(true);
            setLoading(true);
            const result = await getContactById(studioSlug, id);
            if (result.success && result.data) {
                setFormData({
                    name: result.data.name,
                    phone: normalizePhone(result.data.phone || ''),
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
                if (result.data.referrer_contact_id) {
                    // Si hay referrer_contact_id, siempre mostrar con arroba
                    if (result.data.referrer_contact) {
                        setReferrerInputValue(`@${result.data.referrer_contact.name}`);
                    } else if (result.data.referrer_name) {
                        // Si el contacto referido no está disponible pero hay nombre, mostrar con arroba
                        setReferrerInputValue(`@${result.data.referrer_name}`);
                    } else {
                        // Caso edge: hay ID pero no hay nombre disponible
                        setReferrerInputValue('@');
                    }
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
    });

    const loadEventsRef = useRef(async (id: string) => {
        if (!id) return;
        try {
            setLoadingEvents(true);
            const result = await getContactEvents(studioSlug, id);
            if (result.success && result.data) {
                setEvents(result.data);
            }
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoadingEvents(false);
        }
    });
    const loadPromisesRef = useRef(async (id: string) => {
        if (!id) return;
        try {
            setLoadingPromises(true);
            const result = await getContactPromises(studioSlug, id);
            if (result.success && result.data) {
                setPromises(result.data);
            }
        } catch (error) {
            console.error('Error loading promises:', error);
        } finally {
            setLoadingPromises(false);
        }
    });

    // Actualizar refs cuando cambian las dependencias
    useEffect(() => {
        loadReferrerContactsRef.current = async (excludeContactId?: string | null) => {
            try {
                const result = await getContacts(studioSlug, { page: 1, limit: 100, status: 'all' });
                if (result.success && result.data) {
                    const contacts = result.data.contacts
                        .filter((c: Contact) => c.id !== excludeContactId)
                        .map((c: Contact) => ({
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
        loadContactRef.current = async (id: string) => {
            if (!id) return;
            try {
                setLoadingContact(true);
                setLoading(true);
                const result = await getContactById(studioSlug, id);
                if (result.success && result.data) {
                    setFormData({
                        name: result.data.name,
                        phone: normalizePhone(result.data.phone || ''),
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
                    if (result.data.referrer_contact_id) {
                        // Si hay referrer_contact_id, siempre mostrar con arroba
                        if (result.data.referrer_contact) {
                            setReferrerInputValue(`@${result.data.referrer_contact.name}`);
                        } else if (result.data.referrer_name) {
                            // Si el contacto referido no está disponible pero hay nombre, mostrar con arroba
                            setReferrerInputValue(`@${result.data.referrer_name}`);
                        } else {
                            // Caso edge: hay ID pero no hay nombre disponible
                            setReferrerInputValue('@');
                        }
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
        loadEventsRef.current = async (id: string) => {
            if (!id) return;
            try {
                setLoadingEvents(true);
                const result = await getContactEvents(studioSlug, id);
                if (result.success && result.data) {
                    setEvents(result.data);
                }
            } catch (error) {
                console.error('Error loading events:', error);
            } finally {
                setLoadingEvents(false);
            }
        };
        loadPromisesRef.current = async (id: string) => {
            if (!id) return;
            try {
                setLoadingPromises(true);
                const result = await getContactPromises(studioSlug, id);
                if (result.success && result.data) {
                    setPromises(result.data);
                }
            } catch (error) {
                console.error('Error loading promises:', error);
            } finally {
                setLoadingPromises(false);
            }
        };
    }, [studioSlug, normalizePhone]);

    // Cargar datos y contacto cuando se abre el modal - SOLO UNA VEZ
    useEffect(() => {
        if (!isOpen) {
            // Reset cuando se cierra
            if (hasLoadedRef.current) {
                hasLoadedRef.current = false;
                loadedContactIdRef.current = null;
                isInitializingRef.current = false;
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
                setEvents([]);
                setPromises([]);
            }
            return;
        }

        // Prevenir ejecuciones concurrentes
        if (isInitializingRef.current) {
            return;
        }

        const contactIdChanged = contactId !== loadedContactIdRef.current;
        const needsLoad = !hasLoadedRef.current || (contactId && contactIdChanged);

        if (!needsLoad) {
            return;
        }

        isInitializingRef.current = true;

        // Cargar datos base solo una vez
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadAcquisitionChannelsRef.current();
            loadSocialNetworksRef.current();
            loadReferrerContactsRef.current(contactId);
        }

        // Cargar contacto si hay contactId
        if (contactId && contactIdChanged) {
            loadedContactIdRef.current = contactId;
            loadContactRef.current(contactId);
            loadEventsRef.current(contactId);
            loadPromisesRef.current(contactId);
        } else if (!contactId && !hasLoadedRef.current) {
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
            if (contactId) {
                loadContactRef.current(contactId);
                loadEventsRef.current(contactId);
                loadPromisesRef.current(contactId);
            }
        }

        isInitializingRef.current = false;
    }, [isOpen, contactId]);

    const handleInputChange = (field: keyof CreateContactData, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleAvatarLocalUpdate = useCallback((url: string | null) => {
        // Guardar el valor anterior antes de actualizar (para poder revertir si hay error)
        setFormData(prev => {
            previousAvatarUrlRef.current = prev.avatar_url || null;
            return { ...prev, avatar_url: url || '' };
        });

        // Limpiar error si existe
        if (errors.avatar_url) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.avatar_url;
                return newErrors;
            });
        }
    }, [errors.avatar_url]);

    const handleAvatarUpdate = useCallback(async (url: string) => {
        // Si estamos editando un contacto existente, guardar solo el avatar inmediatamente en BD
        if (contactId) {
            try {
                const result = await updateContact(studioSlug, {
                    id: contactId,
                    avatar_url: url
                });

                if (result.success && result.data) {
                    // Disparar eventos de sincronización solo con el avatar actualizado
                    triggerRefresh();
                    // Enviar solo el avatar actualizado para sincronización en tiempo real
                    triggerContactUpdate(contactId, {
                        id: result.data.id,
                        name: result.data.name,
                        phone: result.data.phone,
                        email: result.data.email,
                        avatar_url: url
                    });
                } else {
                    toast.error(result.error || 'Error al actualizar avatar');
                    // Revertir actualización optimista en caso de error
                    setFormData(prev => ({ ...prev, avatar_url: previousAvatarUrlRef.current || '' }));
                }
            } catch (error) {
                console.error('Error updating avatar:', error);
                toast.error('Error al actualizar avatar');
                // Revertir actualización optimista en caso de error
                setFormData(prev => ({ ...prev, avatar_url: previousAvatarUrlRef.current || '' }));
            }
        }
    }, [contactId, studioSlug, triggerRefresh, triggerContactUpdate]);

    const handlePhoneChange = (value: string) => {
        const normalized = normalizePhone(value);
        handleInputChange('phone', normalized);
    };

    const handleReferrerInputChange = (value: string) => {
        setReferrerInputValue(value);
        if (value.startsWith('@')) {
            const searchTerm = value.slice(1).toLowerCase();
            const filtered = referrerContacts.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                c.phone.includes(searchTerm)
            );
            setFilteredReferrerContacts(filtered);
            setShowReferrerSuggestions(filtered.length > 0 && searchTerm.length > 0);
        } else {
            handleInputChange('referrer_name', value);
            handleInputChange('referrer_contact_id', undefined);
            setShowReferrerSuggestions(false);
        }
    };

    const handleSelectReferrer = (contact: { id: string; name: string; phone: string }) => {
        setReferrerInputValue(`@${contact.name}`);
        handleInputChange('referrer_contact_id', contact.id);
        handleInputChange('referrer_name', '');
        setShowReferrerSuggestions(false);
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
        setEvents([]);
        setPromises([]);
    };

    const handleSubmit = async () => {
        setErrors({});
        setLoading(true);

        try {
            let result;
            if (contactId) {
                // Asegurar que el status siempre se incluya en la actualización
                result = await updateContact(studioSlug, { 
                    ...formData, 
                    id: contactId,
                    status: formData.status || 'prospecto' // Asegurar que siempre haya un status
                });
            } else {
                // Asegurar que el status siempre se incluya en la creación
                result = await createContact(studioSlug, {
                    ...formData,
                    status: formData.status || 'prospecto' // Asegurar que siempre haya un status
                });
            }

            if (result.success && result.data) {
                toast.success(contactId ? 'Contacto actualizado exitosamente' : 'Contacto creado exitosamente');
                triggerRefresh();
                // Emitir evento de actualización para sincronizar otros componentes
                if (contactId) {
                    triggerContactUpdate(contactId, result.data);
                }
                onSuccess(result.data, !!contactId);
                onClose();
                resetForm();
            } else {
                if (result.error) {
                    if (typeof result.error === 'object' && result.error !== null) {
                        setErrors(result.error as Record<string, string>);
                    } else {
                        toast.error(result.error);
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

    const handleDeleteClick = async () => {
        if (!contactId) return;

        try {
            // Verificar asociaciones antes de mostrar el modal
            const checkResult = await checkContactAssociations(studioSlug, contactId);

            if (!checkResult.success) {
                toast.error(checkResult.error || 'Error al verificar asociaciones');
                return;
            }

            if (checkResult.hasAssociations) {
                // Mensaje de error específico según el tipo de asociación
                if (checkResult.hasPromises && checkResult.hasEvents) {
                    toast.error('No se puede borrar porque tiene promesas y eventos asociados.');
                } else if (checkResult.hasPromises) {
                    toast.error('No se puede borrar porque tiene promesas asociadas.');
                } else if (checkResult.hasEvents) {
                    toast.error('No se puede borrar porque tiene eventos asociados.');
                }
                return;
            }

            // Si no tiene asociaciones, abrir modal de confirmación
            setIsDeleteModalOpen(true);
        } catch (error) {
            console.error('Error checking contact associations:', error);
            toast.error('Error al verificar asociaciones del contacto');
        }
    };

    const handleConfirmDelete = async () => {
        if (!contactId) return;

        try {
            setIsDeleting(true);
            const result = await deleteContact(studioSlug, contactId);

            if (result.success) {
                toast.success('Contacto eliminado exitosamente');
                triggerRefresh();
                onSuccess(undefined, true);
                onClose();
                resetForm();
            } else {
                toast.error(result.error || 'Error al eliminar contacto');
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast.error('Error al eliminar contacto');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
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

    const isRedesSociales = formData.acquisition_channel_id === getRedesSocialesChannelId();
    const isReferidos = formData.acquisition_channel_id === getReferidosChannelId();

    return (
        <>
            <ZenDialog
                isOpen={isOpen}
                onClose={onClose}
                title={contactId ? 'Editar Contacto' : 'Nuevo Contacto'}
                onSave={handleSubmit}
                onCancel={onClose}
                onDelete={contactId ? handleDeleteClick : undefined}
                showDeleteButton={!!contactId}
                saveLabel={contactId ? 'Actualizar' : 'Crear'}
                cancelLabel="Cancelar"
                deleteLabel="Eliminar"
                isLoading={loading}
                maxWidth="2xl"
                closeOnClickOutside={false}
            >
                {loadingContact ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-10 w-full bg-zinc-700" />
                        <Skeleton className="h-10 w-full bg-zinc-700" />
                        <Skeleton className="h-10 w-full bg-zinc-700" />
                    </div>
                ) : (
                    <div className="p-6">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmit();
                            }}
                            noValidate
                        >
                            {/* Información Básica en Grid */}
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div className="col-span-1 flex items-center justify-center">
                                    <AvatarManager
                                        url={formData.avatar_url || null}
                                        onUpdate={handleAvatarUpdate}
                                        onLocalUpdate={handleAvatarLocalUpdate}
                                        studioSlug={studioSlug}
                                        category="clientes"
                                        size="md"
                                        showAdjustButton={false}
                                    />
                                </div>
                                <div className="col-span-3 space-y-4">
                                    <ZenInput
                                        label="Nombre"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="Nombre completo"
                                        required
                                        disabled={loading}
                                        error={errors.name}
                                    />
                                    <div className="grid grid-cols-[140px_1fr] gap-4">
                                        <ZenInput
                                            label="Teléfono"
                                            value={formData.phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            placeholder="10 dígitos"
                                            required
                                            disabled={loading}
                                            error={errors.phone}
                                            maxLength={10}
                                        />
                                        <ZenInput
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

                            {/* Dirección */}
                            <div className="mb-4">
                                <ZenTextarea
                                    label="Dirección"
                                    value={formData.address || ''}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    placeholder="Dirección completa"
                                    disabled={loading}
                                    error={errors.address}
                                    minRows={2}
                                />
                            </div>

                            {/* Canal de Adquisición, Red Social y Referidos en la misma fila */}
                            <div className={`mb-4 ${(isRedesSociales || isReferidos) ? 'grid grid-cols-2 gap-4' : ''}`}>
                                {/* Canal de Adquisición */}
                                <div>
                                    <label className="text-sm font-medium text-zinc-300 block mb-2">
                                        Canal de Adquisición
                                    </label>
                                    <select
                                        value={formData.acquisition_channel_id || 'none'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const newChannelId = value === 'none' ? undefined : value;
                                            handleInputChange('acquisition_channel_id', newChannelId);

                                            // Limpiar campos relacionados si cambia el canal
                                            const redesChannelId = getRedesSocialesChannelId();
                                            const referidosChannelId = getReferidosChannelId();
                                            if (value !== redesChannelId) {
                                                handleInputChange('social_network_id', undefined);
                                            }
                                            if (value !== referidosChannelId) {
                                                handleInputChange('referrer_contact_id', undefined);
                                                handleInputChange('referrer_name', undefined);
                                                setReferrerInputValue('');
                                                setShowReferrerSuggestions(false);
                                            }
                                        }}
                                        disabled={loading || acquisitionChannels.length === 0}
                                        className={`w-full h-10 px-3 py-2 bg-zinc-900 border rounded-lg text-base text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.acquisition_channel_id
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-zinc-700 hover:border-zinc-600'
                                            }`}
                                    >
                                        <option value="none">Ninguno</option>
                                        {acquisitionChannels.map((channel) => (
                                            <option key={channel.id} value={channel.id}>
                                                {channel.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.acquisition_channel_id && (
                                        <p className="mt-1 text-xs text-red-500">{errors.acquisition_channel_id}</p>
                                    )}
                                </div>

                                {/* Red Social (solo si canal es Redes Sociales) */}
                                {isRedesSociales && (
                                    <div>
                                        <label className="text-sm font-medium text-zinc-300 block mb-2">
                                            Red Social
                                        </label>
                                        <select
                                            value={formData.social_network_id || 'none'}
                                            onChange={(e) => handleInputChange('social_network_id', e.target.value === 'none' ? undefined : e.target.value)}
                                            disabled={loading || socialNetworks.length === 0}
                                            className={`w-full h-10 px-3 py-2 bg-zinc-900 border rounded-lg text-base text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.social_network_id
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-zinc-700 hover:border-zinc-600'
                                                }`}
                                        >
                                            <option value="none">Ninguno</option>
                                            {socialNetworks.map((network) => (
                                                <option key={network.id} value={network.id}>
                                                    {network.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.social_network_id && (
                                            <p className="mt-1 text-xs text-red-500">{errors.social_network_id}</p>
                                        )}
                                    </div>
                                )}

                                {/* Referido Por (solo si canal es Referidos) */}
                                {isReferidos && (
                                    <div className="relative">
                                        <ZenInput
                                            label="Referido Por"
                                            value={referrerInputValue}
                                            onChange={(e) => handleReferrerInputChange(e.target.value)}
                                            placeholder="@nombre o nombre manual"
                                            disabled={loading}
                                            error={errors.referrer_contact_id || errors.referrer_name}
                                        />
                                        {showReferrerSuggestions && filteredReferrerContacts.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredReferrerContacts.map((contact) => (
                                                    <button
                                                        key={contact.id}
                                                        type="button"
                                                        onClick={() => handleSelectReferrer(contact)}
                                                        className="w-full text-left px-4 py-2 hover:bg-zinc-700 transition-colors"
                                                    >
                                                        <div className="font-medium text-white">{contact.name}</div>
                                                        <div className="text-xs text-zinc-400">{contact.phone}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-zinc-300 block mb-2">
                                    Estado
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange('status', e.target.value as 'prospecto' | 'cliente')}
                                    disabled={loading}
                                    className={`w-full h-10 px-3 py-2 bg-zinc-900 border rounded-lg text-base text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.status
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-zinc-700 hover:border-zinc-600'
                                        }`}
                                >
                                    <option value="prospecto">Prospecto</option>
                                    <option value="cliente">Cliente</option>
                                </select>
                                {errors.status && (
                                    <p className="mt-1 text-xs text-red-500">{errors.status}</p>
                                )}
                            </div>

                            {/* Notas */}
                            <div className="mb-4">
                                <ZenTextarea
                                    label="Notas"
                                    value={formData.notes || ''}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    placeholder="Notas adicionales..."
                                    disabled={loading}
                                    minRows={3}
                                />
                            </div>

                            {/* Sección 4 y 5: Promesas y Eventos Asociados */}
                            {contactId && ((!loadingPromises && promises.length > 0) || (!loadingEvents && events.length > 0)) && (
                                <div className={`pt-2 border-t border-zinc-700 ${(!loadingPromises && promises.length > 0) && (!loadingEvents && events.length > 0) ? 'grid grid-cols-2 gap-4' : ''}`}>
                                    {/* Promesas Asociadas */}
                                    {!loadingPromises && promises.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-medium text-zinc-300">
                                                    Promesas Asociadas
                                                </h3>
                                                <span className="text-xs text-zinc-400">
                                                    {promises.length} {promises.length === 1 ? 'promesa' : 'promesas'}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {promises.map((promise) => (
                                                    <button
                                                        key={promise.id}
                                                        type="button"
                                                        onClick={() => {
                                                            router.push(`/${studioSlug}/studio/commercial/promises/${promise.id}`);
                                                            onClose();
                                                        }}
                                                        className="w-full text-left p-3 rounded-lg border border-zinc-700 hover:border-purple-500/50 hover:bg-zinc-800/50 transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                <Package className="h-4 w-4 text-purple-400 shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-white group-hover:text-purple-400 transition-colors truncate">
                                                                        {promise.event_type_name || 'Sin tipo de evento'}
                                                                    </div>
                                                                    {promise.pipeline_stage_name && (
                                                                        <div className="text-xs text-zinc-400 mt-0.5">
                                                                            {promise.pipeline_stage_name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-purple-400 transition-colors shrink-0" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Eventos Asociados */}
                                    {!loadingEvents && events.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-medium text-zinc-300">
                                                    Eventos Asociados
                                                </h3>
                                                <span className="text-xs text-zinc-400">
                                                    {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {events.map((event) => (
                                                    <button
                                                        key={event.id}
                                                        type="button"
                                                        onClick={() => {
                                                            router.push(`/${studioSlug}/studio/business/events/${event.id}`);
                                                            onClose();
                                                        }}
                                                        className="w-full text-left p-3 rounded-lg border border-zinc-700 bg-zinc-800/30 hover:border-blue-500/50 hover:bg-zinc-800/50 transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Calendar className="h-4 w-4 text-zinc-400 group-hover:text-blue-400 shrink-0 transition-colors" />
                                                                    <span className="font-medium text-white group-hover:text-blue-400 truncate transition-colors">
                                                                        {event.name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                                    <span>{formatDisplayDateShort(event.event_date)}</span>
                                                                    {event.event_type && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{event.event_type}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>
                )}
            </ZenDialog>

            {/* Modal de confirmación de eliminación */}
            <ZenConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar contacto"
                description="¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />
        </>
    );
}

export const ContactModal = React.memo(ContactModalComponent);

