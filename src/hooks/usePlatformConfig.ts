import { useState, useEffect } from 'react';

interface PlatformConfig {
    id: string;
    nombre_empresa: string;
    logo_url: string | null;
    favicon_url: string | null;
    comercial_telefono: string | null;
    comercial_email: string | null;
    comercial_whatsapp: string | null;
    soporte_telefono: string | null;
    soporte_email: string | null;
    soporte_chat_url: string | null;
    direccion: string | null;
    horarios_atencion: string | null;
    timezone: string;
    facebook_url: string | null;
    instagram_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    terminos_condiciones: string | null;
    politica_privacidad: string | null;
    aviso_legal: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    google_analytics_id: string | null;
    google_tag_manager_id: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface UsePlatformConfigReturn {
    config: PlatformConfig | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Cache global simple para evitar múltiples requests
let globalConfig: PlatformConfig | null = null;
let globalPromise: Promise<PlatformConfig | null> | null = null;

// Configuración por defecto
const getDefaultConfig = (): PlatformConfig => ({
    id: 'default',
    nombre_empresa: 'ProSocial Platform',
    logo_url: null,
    favicon_url: null,
    comercial_telefono: null,
    comercial_email: null,
    comercial_whatsapp: null,
    soporte_telefono: null,
    soporte_email: null,
    soporte_chat_url: null,
    direccion: null,
    horarios_atencion: null,
    timezone: 'America/Mexico_City',
    facebook_url: null,
    instagram_url: null,
    twitter_url: null,
    linkedin_url: null,
    terminos_condiciones: null,
    politica_privacidad: null,
    aviso_legal: null,
    meta_description: null,
    meta_keywords: null,
    google_analytics_id: null,
    google_tag_manager_id: null,
    createdAt: new Date(),
    updatedAt: new Date()
});

export function usePlatformConfig(): UsePlatformConfigReturn {
    const [config, setConfig] = useState<PlatformConfig | null>(globalConfig);
    const [loading, setLoading] = useState(!globalConfig);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = async (): Promise<PlatformConfig | null> => {
        // Si ya tenemos la configuración en cache, la devolvemos
        if (globalConfig) {
            setConfig(globalConfig);
            setLoading(false);
            setError(null);
            return globalConfig;
        }

        // Si ya hay una request en progreso, esperamos a que termine
        if (globalPromise) {
            try {
                const result = await globalPromise;
                setConfig(result);
                setLoading(false);
                setError(null);
                return result;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                setError(errorMessage);
                setLoading(false);
                return null;
            }
        }

        // Crear nueva request
        setLoading(true);
        setError(null);

        globalPromise = (async () => {
            try {
                const response = await fetch('/api/platform-config');

                if (!response.ok) {
                    // Intentar obtener el mensaje de error del servidor
                    let errorMessage = 'Error al cargar la configuración';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch {
                        // Si no se puede parsear el error, usar el mensaje por defecto
                    }

                    // Si es un error de conexión a la base de datos, usar configuración por defecto
                    if (response.status >= 500) {
                        console.warn('Error de servidor, usando configuración por defecto:', errorMessage);
                        const defaultConfig = getDefaultConfig();
                        globalConfig = defaultConfig;
                        return defaultConfig;
                    }

                    throw new Error(errorMessage);
                }

                const data = await response.json();
                globalConfig = data;
                return data;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                console.error('Error fetching platform config:', err);

                // Si es un error de red o conexión, usar configuración por defecto
                if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
                    console.warn('Error de conexión, usando configuración por defecto');
                    const defaultConfig = getDefaultConfig();
                    globalConfig = defaultConfig;
                    return defaultConfig;
                }

                throw new Error(errorMessage);
            }
        })();

        try {
            const result = await globalPromise;
            setConfig(result);
            setLoading(false);
            setError(null);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            setLoading(false);
            return null;
        } finally {
            globalPromise = null;
        }
    };

    const refetch = async () => {
        globalConfig = null; // Limpiar cache
        globalPromise = null; // Limpiar promise
        await fetchConfig();
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    return {
        config,
        loading,
        error,
        refetch
    };
}

// Hook para obtener solo el nombre de la empresa (más ligero)
export function usePlatformName(): string {
    const { config } = usePlatformConfig();
    return config?.nombre_empresa || 'ProSocial Platform';
}

// Hook para obtener solo el logo (más ligero)
export function usePlatformLogo(): string | null {
    const { config } = usePlatformConfig();
    return config?.logo_url || null;
}

// Hook para obtener el isotipo (solo ícono)
export function usePlatformIsotipo(): string | null {
    const { config } = usePlatformConfig();
    return config?.favicon_url || null; // Isotipo = solo el icono (favicon)
}

// Hook para obtener información completa del branding
export function usePlatformBranding() {
    const { config } = usePlatformConfig();
    return {
        nombre: config?.nombre_empresa || 'ProSocial Platform',
        isotipo: config?.favicon_url || null, // Isotipo = solo el icono (favicon)
        logotipo: config?.logo_url || null, // Logotipo = icono + nombre (logo_url)
        favicon: config?.favicon_url || null,
    };
}

// Hook para obtener información de contacto
export function usePlatformContact() {
    const { config } = usePlatformConfig();
    return {
        comercial: {
            telefono: config?.comercial_telefono || null,
            email: config?.comercial_email || null,
            whatsapp: config?.comercial_whatsapp || null,
        },
        soporte: {
            telefono: config?.soporte_telefono || null,
            email: config?.soporte_email || null,
            chat_url: config?.soporte_chat_url || null,
        }
    };
}

// Hook para obtener redes sociales
export function usePlatformSocialMedia() {
    const { config } = usePlatformConfig();
    return {
        facebook: config?.facebook_url || null,
        instagram: config?.instagram_url || null,
        twitter: config?.twitter_url || null,
        linkedin: config?.linkedin_url || null,
    };
}