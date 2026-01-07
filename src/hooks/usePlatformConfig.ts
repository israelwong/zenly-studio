import { useState, useEffect } from 'react';

interface PlatformConfig {
    id: string;
    // Branding
    company_name: string; // Nombre legal: "Zen México"
    company_name_long: string | null; // Nombre largo: "ZEN México"
    commercial_name: string | null; // Nombre comercial: "Zen Studio"
    commercial_name_short: string | null; // Nombre corto: "ZEN"
    domain: string | null; // Dominio: "www.zenn.mx"
    // Assets
    logo_url: string | null;
    favicon_url: string | null;
    // Contacto comercial
    comercial_email: string | null;
    comercial_whatsapp: string | null;
    commercial_phone: string | null;
    // Soporte
    soporte_email: string | null;
    soporte_chat_url: string | null;
    support_phone: string | null;
    // Ubicación
    address: string | null;
    business_hours: string | null;
    timezone: string;
    // Redes sociales (deprecated)
    facebook_url: string | null;
    instagram_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    // Legal (deprecated)
    terminos_condiciones: string | null;
    politica_privacidad: string | null;
    aviso_legal: string | null;
    // SEO
    meta_description: string | null;
    meta_keywords: string | null;
    // Analytics (deprecated)
    google_analytics_id: string | null;
    google_tag_manager_id: string | null;
    // Timestamps
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
    company_name: 'Zenly México',
    company_name_long: 'Zenly México',
    commercial_name: 'Zenly Studio',
    commercial_name_short: 'ZENLY',
    domain: 'zenly.mx',
    logo_url: null,
    favicon_url: null,
    comercial_email: null,
    comercial_whatsapp: null,
    commercial_phone: null,
    soporte_email: null,
    soporte_chat_url: null,
    support_phone: null,
    address: null,
    business_hours: null,
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
    return config?.company_name || 'Zen México';
}

// Hook para obtener el nombre comercial
export function useCommercialName(): string {
    const { config } = usePlatformConfig();
    return config?.commercial_name || config?.company_name || 'Zenly Studio';
}

// Hook para obtener el nombre corto (para UI)
export function useCommercialNameShort(): string {
    const { config } = usePlatformConfig();
    return config?.commercial_name_short || 'ZEN';
}

// Hook para obtener el dominio
export function usePlatformDomain(): string {
    const { config } = usePlatformConfig();
    return config?.domain || 'www.zenn.mx';
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
        companyName: config?.company_name || 'Zenly México',
        companyNameLong: config?.company_name_long || 'Zenly México',
        commercialName: config?.commercial_name || 'Zenly Studio',
        commercialNameShort: config?.commercial_name_short || 'ZENLY',
        domain: config?.domain || 'zenly.mx',
        nombre: config?.commercial_name || config?.company_name || 'Zenly Studio',
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
            telefono: config?.commercial_phone || null,
            email: config?.comercial_email || null,
            whatsapp: config?.comercial_whatsapp || null,
        },
        soporte: {
            telefono: config?.support_phone || null,
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