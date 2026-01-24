// Configuración global de la aplicación
export const APP_CONFIG = {
    // Paginación por defecto
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // Límites de archivos
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB (genérico, usar límites específicos por tipo)
    MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20MB para imágenes
    MAX_VIDEO_SIZE: 200 * 1024 * 1024, // 200MB para videos
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
    ALLOWED_DOCUMENT_TYPES: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],

    // Configuración de cache
    CACHE_DURATION: 300, // 5 minutos
    REVALIDATE_DURATION: 60, // 1 minuto

    // Configuración de reintentos
    MAX_RETRIES: 3,
    BASE_DELAY: 1000, // 1 segundo
    MAX_DELAY: 5000, // 5 segundos

    // Configuración de notificaciones
    NOTIFICATION_DURATION: 5000, // 5 segundos
    MAX_NOTIFICATIONS: 5,

    // Configuración de validación
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,

    // Configuración de leads
    MAX_LEADS_PER_STUDIO: 10000,
    MAX_NOTES_LENGTH: 2000,

    // Configuración de cotizaciones
    QUOTE_EXPIRY_DAYS: 30,
    MAX_QUOTE_ITEMS: 50,

    // Configuración de reportes
    MAX_REPORT_RANGE_DAYS: 365,
    DEFAULT_REPORT_RANGE_DAYS: 30,
} as const;

// Configuración de URLs y endpoints
export const API_ENDPOINTS = {
    // Webhooks
    STRIPE_WEBHOOK: "/api/webhooks/stripe",
    EMAIL_WEBHOOK: "/api/webhooks/email",

    // Integraciones
    STRIPE_API: "/api/integrations/stripe",
    EMAIL_API: "/api/integrations/email",

    // APIs públicas
    HEALTH_CHECK: "/api/public/health",
    STATUS: "/api/public/status",
} as const;

// Configuración de moneda
export const CURRENCY_CONFIG = {
    DEFAULT_CURRENCY: "MXN",
    SUPPORTED_CURRENCIES: ["MXN", "USD", "EUR"],
    CURRENCY_SYMBOLS: {
        MXN: "$",
        USD: "$",
        EUR: "€",
    },
} as const;

// Configuración de zonas horarias
export const TIMEZONE_CONFIG = {
    DEFAULT_TIMEZONE: "America/Mexico_City",
    SUPPORTED_TIMEZONES: [
        "America/Mexico_City",
        "America/New_York",
        "America/Los_Angeles",
        "Europe/Madrid",
    ],
} as const;

// Configuración de idiomas
export const LANGUAGE_CONFIG = {
    DEFAULT_LANGUAGE: "es",
    SUPPORTED_LANGUAGES: ["es", "en"],
    LANGUAGE_NAMES: {
        es: "Español",
        en: "English",
    },
} as const;
