'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch } from '@/components/ui/zen';
import { Phone, Mail, Globe, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { crearTelefono, actualizarTelefono } from '@/lib/actions/studio/profile/telefonos';
import { actualizarEmailStudio } from '@/lib/actions/studio/profile/email';
import { actualizarUbicacion } from '@/lib/actions/studio/profile/ubicacion';
import { actualizarWebsite } from '@/lib/actions/studio/profile/website';

interface ContactInfoCardProps {
    studioSlug: string;
    telefonos?: Array<{
        id: string;
        numero: string;
        tipo: 'llamadas' | 'whatsapp' | 'ambos';
        is_active: boolean;
    }>;
    email?: string | null;
    website?: string | null;
    direccion?: string | null;
    google_maps_url?: string | null;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function ContactInfoCard({
    studioSlug,
    telefonos: initialTelefonos = [],
    email: initialEmail,
    website: initialWebsite,
    direccion: initialDireccion,
    google_maps_url: initialGoogleMapsUrl,
    loading = false,
    onDataChange
}: ContactInfoCardProps) {
    const [telefono, setTelefono] = useState('');
    const [llamadasEnabled, setLlamadasEnabled] = useState(false);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [direccion, setDireccion] = useState('');
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');

    // Estados de carga por campo
    const [savingTelefono, setSavingTelefono] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [savingWebsite, setSavingWebsite] = useState(false);
    const [savingDireccion, setSavingDireccion] = useState(false);
    const [savingGoogleMaps, setSavingGoogleMaps] = useState(false);

    // Estados de error por campo
    const [errorTelefono, setErrorTelefono] = useState<string | undefined>();
    const [errorEmail, setErrorEmail] = useState<string | undefined>();
    const [errorWebsite, setErrorWebsite] = useState<string | undefined>();

    // Refs para debounce
    const telefonoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const websiteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const direccionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const googleMapsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Obtener el primer teléfono activo o el primero disponible
    const telefonoActual = initialTelefonos.find(t => t.is_active) || initialTelefonos[0];

    useEffect(() => {
        if (telefonoActual) {
            setTelefono(telefonoActual.numero);
            setLlamadasEnabled(telefonoActual.tipo === 'llamadas' || telefonoActual.tipo === 'ambos');
            setWhatsappEnabled(telefonoActual.tipo === 'whatsapp' || telefonoActual.tipo === 'ambos');
        } else {
            setTelefono('');
            setLlamadasEnabled(false);
            setWhatsappEnabled(false);
        }
    }, [telefonoActual]);

    useEffect(() => {
        setEmail(initialEmail || '');
    }, [initialEmail]);

    useEffect(() => {
        setWebsite(initialWebsite || '');
    }, [initialWebsite]);

    useEffect(() => {
        setDireccion(initialDireccion || '');
    }, [initialDireccion]);

    useEffect(() => {
        setGoogleMapsUrl(initialGoogleMapsUrl || '');
    }, [initialGoogleMapsUrl]);

    // Limpiar timeouts al desmontar
    useEffect(() => {
        return () => {
            if (telefonoTimeoutRef.current) clearTimeout(telefonoTimeoutRef.current);
            if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
            if (websiteTimeoutRef.current) clearTimeout(websiteTimeoutRef.current);
            if (direccionTimeoutRef.current) clearTimeout(direccionTimeoutRef.current);
            if (googleMapsTimeoutRef.current) clearTimeout(googleMapsTimeoutRef.current);
        };
    }, []);

    // Validar teléfono: solo números, 10 dígitos
    const validateTelefono = (numero: string): boolean => {
        const soloNumeros = numero.replace(/\D/g, '');
        if (soloNumeros.length === 0) {
            setErrorTelefono(undefined);
            return true; // Permitir campo vacío
        }
        if (soloNumeros.length !== 10) {
            setErrorTelefono('El teléfono debe tener exactamente 10 dígitos');
            return false;
        }
        setErrorTelefono(undefined);
        return true;
    };

    // Validar email
    const validateEmail = (email: string): boolean => {
        if (!email.trim()) {
            setErrorEmail(undefined);
            return true; // Permitir campo vacío
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email.trim());
        setErrorEmail(isValid ? undefined : 'Email inválido');
        return isValid;
    };

    // Función para guardar teléfono
    const saveTelefono = useCallback(async (numero: string, tipo: string) => {
        const soloNumeros = numero.replace(/\D/g, '');

        // Validar antes de guardar
        if (soloNumeros.length > 0 && soloNumeros.length !== 10) {
            setErrorTelefono('El teléfono debe tener exactamente 10 dígitos');
            return;
        }

        setSavingTelefono(true);
        setErrorTelefono(undefined);

        try {
            if (telefonoActual) {
                await actualizarTelefono(studioSlug, telefonoActual.id, {
                    numero: soloNumeros,
                    tipo: tipo as 'WHATSAPP' | 'LLAMADAS' | 'AMBOS',
                    etiqueta: undefined,
                    is_active: true
                });
            } else {
                await crearTelefono(studioSlug, {
                    numero: soloNumeros,
                    tipo: tipo as 'WHATSAPP' | 'LLAMADAS' | 'AMBOS',
                    etiqueta: undefined,
                    is_active: true
                });
            }
            toast.success('Teléfono actualizado correctamente');
            await onDataChange?.();
        } catch (error) {
            console.error('Error saving telefono:', error);
            toast.error('Error al actualizar teléfono');
        } finally {
            setSavingTelefono(false);
        }
    }, [studioSlug, telefonoActual, onDataChange]);

    // Función para guardar email
    const saveEmail = useCallback(async (emailValue: string) => {
        setSavingEmail(true);
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailValue.trim())) {
                toast.error('Email inválido');
                setSavingEmail(false);
                return;
            }
            await actualizarEmailStudio(studioSlug, emailValue.trim());
            toast.success('Correo electrónico actualizado correctamente');
            await onDataChange?.();
        } catch (error) {
            console.error('Error saving email:', error);
            toast.error('Error al actualizar correo electrónico');
        } finally {
            setSavingEmail(false);
        }
    }, [studioSlug, onDataChange]);

    // Validar website
    const validateWebsite = (websiteValue: string): boolean => {
        if (websiteValue.trim().length === 0) {
            setErrorWebsite(undefined);
            return true; // Permitir campo vacío
        }
        try {
            // Intentar crear URL válida
            const url = websiteValue.trim();
            // Si no tiene protocolo, agregar https://
            const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://')
                ? url
                : `https://${url}`;
            new URL(urlWithProtocol);
            setErrorWebsite(undefined);
            return true;
        } catch {
            setErrorWebsite('URL inválida');
            return false;
        }
    };

    // Función para guardar website
    const saveWebsite = useCallback(async (websiteValue: string) => {
        // Validar antes de guardar
        if (!validateWebsite(websiteValue)) {
            return;
        }

        setSavingWebsite(true);
        setErrorWebsite(undefined);

        try {
            let urlToSave = websiteValue.trim() || null;
            // Si tiene valor y no tiene protocolo, agregar https://
            if (urlToSave && !urlToSave.startsWith('http://') && !urlToSave.startsWith('https://')) {
                urlToSave = `https://${urlToSave}`;
            }
            await actualizarWebsite(studioSlug, urlToSave);
            toast.success('Página web actualizada correctamente');
            await onDataChange?.();
        } catch (error) {
            console.error('Error saving website:', error);
            toast.error('Error al actualizar página web');
        } finally {
            setSavingWebsite(false);
        }
    }, [studioSlug, onDataChange]);

    // Función para guardar ubicación
    const saveUbicacion = useCallback(async (direccionValue: string, googleMapsValue: string) => {
        setSavingDireccion(true);
        try {
            await actualizarUbicacion(studioSlug, {
                direccion: direccionValue.trim() || undefined,
                google_maps_url: googleMapsValue.trim() || undefined,
            });
            toast.success('Dirección actualizada correctamente');
            await onDataChange?.();
        } catch (error) {
            console.error('Error saving ubicacion:', error);
            toast.error('Error al actualizar dirección');
        } finally {
            setSavingDireccion(false);
        }
    }, [studioSlug, onDataChange]);

    // Función para guardar Google Maps
    const saveGoogleMaps = useCallback(async (googleMapsValue: string) => {
        setSavingGoogleMaps(true);
        try {
            await actualizarUbicacion(studioSlug, {
                direccion: direccion.trim() || undefined,
                google_maps_url: googleMapsValue.trim() || undefined,
            });
            toast.success('Enlace de Google Maps actualizado correctamente');
            await onDataChange?.();
        } catch (error) {
            console.error('Error saving google maps:', error);
            toast.error('Error al actualizar enlace de Google Maps');
        } finally {
            setSavingGoogleMaps(false);
        }
    }, [studioSlug, direccion, onDataChange]);

    if (loading) {
        return (
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <ZenCardTitle>Información de Contacto</ZenCardTitle>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    <div className="space-y-4 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-10 bg-zinc-800/50 rounded-lg"></div>
                        ))}
                    </div>
                </ZenCardContent>
            </ZenCard>
        );
    }

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <ZenCardTitle>Información de Contacto</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="p-6 space-y-4">
                {/* Teléfono */}
                <div>
                    <div className="relative">
                        <ZenInput
                            label="Teléfono"
                            value={telefono}
                            onChange={(e) => {
                                // Solo permitir números
                                const value = e.target.value.replace(/\D/g, '');
                                // Limitar a 10 dígitos
                                const limitedValue = value.slice(0, 10);
                                setTelefono(limitedValue);

                                // Validar en tiempo real
                                validateTelefono(limitedValue);

                                // Limpiar timeout anterior
                                if (telefonoTimeoutRef.current) {
                                    clearTimeout(telefonoTimeoutRef.current);
                                }

                                // Guardar después de 1 segundo de inactividad solo si es válido
                                telefonoTimeoutRef.current = setTimeout(() => {
                                    if (limitedValue.length === 10 && (llamadasEnabled || whatsappEnabled)) {
                                        const tipo = llamadasEnabled && whatsappEnabled ? 'AMBOS' :
                                            llamadasEnabled ? 'LLAMADAS' : 'WHATSAPP';
                                        saveTelefono(limitedValue, tipo);
                                    }
                                }, 1000);
                            }}
                            onBlur={(e) => {
                                // Validar al perder foco
                                const soloNumeros = e.target.value.replace(/\D/g, '');
                                validateTelefono(soloNumeros);

                                // Guardar inmediatamente al perder foco si es válido
                                if (telefonoTimeoutRef.current) {
                                    clearTimeout(telefonoTimeoutRef.current);
                                }
                                if (soloNumeros.length === 10 && (llamadasEnabled || whatsappEnabled)) {
                                    const tipo = llamadasEnabled && whatsappEnabled ? 'AMBOS' :
                                        llamadasEnabled ? 'LLAMADAS' : 'WHATSAPP';
                                    saveTelefono(soloNumeros, tipo);
                                }
                            }}
                            placeholder="5512345678"
                            type="tel"
                            icon={Phone}
                            error={errorTelefono}
                        />
                        {savingTelefono && (
                            <div className="absolute right-3 top-[42px] flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-3">
                            <ZenSwitch
                                checked={llamadasEnabled}
                                onCheckedChange={(checked) => {
                                    setLlamadasEnabled(checked);
                                    // Guardar inmediatamente al cambiar switch
                                    if (telefono.trim() && (checked || whatsappEnabled)) {
                                        const tipo = checked && whatsappEnabled ? 'AMBOS' :
                                            checked ? 'LLAMADAS' : 'WHATSAPP';
                                        saveTelefono(telefono, tipo);
                                    }
                                }}
                                variant="green"
                            />
                            <span className="text-sm text-zinc-300">Llamadas</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ZenSwitch
                                checked={whatsappEnabled}
                                onCheckedChange={(checked) => {
                                    setWhatsappEnabled(checked);
                                    // Guardar inmediatamente al cambiar switch solo si el teléfono es válido
                                    const soloNumeros = telefono.replace(/\D/g, '');
                                    if (soloNumeros.length === 10 && (llamadasEnabled || checked)) {
                                        const tipo = llamadasEnabled && checked ? 'AMBOS' :
                                            llamadasEnabled ? 'LLAMADAS' : 'WHATSAPP';
                                        saveTelefono(soloNumeros, tipo);
                                    }
                                }}
                                variant="green"
                            />
                            <span className="text-sm text-zinc-300">WhatsApp</span>
                        </div>
                    </div>
                </div>

                {/* Email */}
                <div className="relative">
                    <ZenInput
                        label="Correo electrónico"
                        value={email}
                        onChange={(e) => {
                            const value = e.target.value;
                            setEmail(value);

                            // Validar en tiempo real
                            validateEmail(value);

                            // Limpiar timeout anterior
                            if (emailTimeoutRef.current) {
                                clearTimeout(emailTimeoutRef.current);
                            }

                            // Guardar después de 1 segundo de inactividad solo si es válido
                            emailTimeoutRef.current = setTimeout(() => {
                                if (value.trim() && value !== initialEmail && validateEmail(value)) {
                                    saveEmail(value);
                                }
                            }, 1000);
                        }}
                        onBlur={(e) => {
                            // Validar al perder foco
                            validateEmail(e.target.value);

                            // Guardar inmediatamente al perder foco si es válido
                            if (emailTimeoutRef.current) {
                                clearTimeout(emailTimeoutRef.current);
                            }
                            if (e.target.value.trim() && e.target.value !== initialEmail && validateEmail(e.target.value)) {
                                saveEmail(e.target.value);
                            }
                        }}
                        placeholder="contacto@estudio.com"
                        type="email"
                        icon={Mail}
                        error={errorEmail}
                    />
                    {savingEmail && (
                        <div className="absolute right-3 top-[42px] flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        </div>
                    )}
                </div>

                {/* Website */}
                <div className="relative">
                    <ZenInput
                        label="Página web"
                        value={website}
                        onChange={(e) => {
                            setWebsite(e.target.value);
                            // Limpiar timeout anterior
                            if (websiteTimeoutRef.current) {
                                clearTimeout(websiteTimeoutRef.current);
                            }
                            // Guardar después de 1 segundo de inactividad
                            websiteTimeoutRef.current = setTimeout(() => {
                                if (e.target.value !== initialWebsite) {
                                    saveWebsite(e.target.value);
                                }
                            }, 1000);
                        }}
                        onBlur={(e) => {
                            // Guardar inmediatamente al perder foco
                            if (websiteTimeoutRef.current) {
                                clearTimeout(websiteTimeoutRef.current);
                            }
                            if (e.target.value !== initialWebsite) {
                                saveWebsite(e.target.value);
                            }
                        }}
                        placeholder="https://www.estudio.com"
                        type="url"
                        icon={Globe}
                    />
                    {savingWebsite && (
                        <div className="absolute right-3 top-9 flex items-center gap-1 text-xs text-zinc-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Actualizando...</span>
                        </div>
                    )}
                </div>

                {/* Dirección */}
                <div className="relative">
                    <ZenTextarea
                        label="Dirección"
                        value={direccion}
                        onChange={(e) => {
                            setDireccion(e.target.value);
                            // Limpiar timeout anterior
                            if (direccionTimeoutRef.current) {
                                clearTimeout(direccionTimeoutRef.current);
                            }
                            // Guardar después de 1 segundo de inactividad
                            direccionTimeoutRef.current = setTimeout(() => {
                                if (e.target.value !== initialDireccion) {
                                    saveUbicacion(e.target.value, googleMapsUrl);
                                }
                            }, 1000);
                        }}
                        onBlur={(e) => {
                            // Guardar inmediatamente al perder foco
                            if (direccionTimeoutRef.current) {
                                clearTimeout(direccionTimeoutRef.current);
                            }
                            if (e.target.value !== initialDireccion) {
                                saveUbicacion(e.target.value, googleMapsUrl);
                            }
                        }}
                        placeholder="Dirección completa de tu estudio"
                        rows={3}
                    />
                    {savingDireccion && (
                        <div className="absolute right-3 top-9 flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        </div>
                    )}
                </div>

                {/* Google Maps */}
                <div className="relative">
                    <ZenInput
                        label="Enlace de Google Maps"
                        value={googleMapsUrl}
                        onChange={(e) => {
                            setGoogleMapsUrl(e.target.value);
                            // Limpiar timeout anterior
                            if (googleMapsTimeoutRef.current) {
                                clearTimeout(googleMapsTimeoutRef.current);
                            }
                            // Guardar después de 1 segundo de inactividad
                            googleMapsTimeoutRef.current = setTimeout(() => {
                                if (e.target.value !== initialGoogleMapsUrl) {
                                    saveGoogleMaps(e.target.value);
                                }
                            }, 1000);
                        }}
                        onBlur={(e) => {
                            // Guardar inmediatamente al perder foco
                            if (googleMapsTimeoutRef.current) {
                                clearTimeout(googleMapsTimeoutRef.current);
                            }
                            if (e.target.value !== initialGoogleMapsUrl) {
                                saveGoogleMaps(e.target.value);
                            }
                        }}
                        placeholder="https://maps.google.com/..."
                        type="url"
                        icon={MapPin}
                    />
                    {savingGoogleMaps && (
                        <div className="absolute right-3 top-[42px] flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        </div>
                    )}
                    {googleMapsUrl && (
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Abrir en Google Maps
                        </a>
                    )}
                </div>

            </ZenCardContent>
        </ZenCard>
    );
}
