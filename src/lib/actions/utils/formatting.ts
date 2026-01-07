import { CURRENCY_CONFIG } from "../constants/config";

// Función para formatear moneda
export function formatCurrency(
    amount: number,
    currency: string = CURRENCY_CONFIG.DEFAULT_CURRENCY
): string {
    const symbol = CURRENCY_CONFIG.CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_CONFIG.CURRENCY_SYMBOLS] || "$";

    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount).replace(currency, symbol);
}

// Función para formatear números
export function formatNumber(
    number: number,
    decimals: number = 0
): string {
    return new Intl.NumberFormat("es-MX", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(number);
}

// Función para formatear porcentajes
export function formatPercentage(
    value: number,
    decimals: number = 1
): string {
    return new Intl.NumberFormat("es-MX", {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
}

/**
 * Parsea una fecha de forma segura sin cambios por zona horaria
 * Si es string en formato YYYY-MM-DD o YYYY-MM-DD HH:MM:SS, lo parsea como fecha local
 */
function parseDateSafe(date: Date | string): Date {
    if (typeof date === "string") {
        // Si es formato YYYY-MM-DD o YYYY-MM-DD HH:MM:SS, extraer solo la fecha y parsear como local
        const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            // Crear fecha local a medianoche (ignorar hora si existe)
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Si no coincide, usar Date normal
        return new Date(date);
    }
    // Si es Date, extraer año, mes y día en hora LOCAL (no UTC) para evitar problemas de zona horaria
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day);
}

// Función para formatear fechas
export function formatDate(
    date: Date | string,
    options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
    }
): string {
    const dateObj = parseDateSafe(date);

    return new Intl.DateTimeFormat("es-MX", options).format(dateObj);
}

// Función para formatear fecha y hora
export function formatDateTime(
    date: Date | string,
    options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }
): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    return new Intl.DateTimeFormat("es-MX", options).format(dateObj);
}

// Función para formatear tiempo relativo
export function formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "hace un momento";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? "s" : ""}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `hace ${diffInHours} hora${diffInHours > 1 ? "s" : ""}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `hace ${diffInDays} día${diffInDays > 1 ? "s" : ""}`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `hace ${diffInWeeks} semana${diffInWeeks > 1 ? "s" : ""}`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `hace ${diffInMonths} mes${diffInMonths > 1 ? "es" : ""}`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `hace ${diffInYears} año${diffInYears > 1 ? "s" : ""}`;
}

// Función para formatear duración
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}

// Función para formatear tamaño de archivo
export function formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return `${size.toFixed(2)} ${sizes[i]}`;
}

// Función para formatear teléfono
export function formatPhone(phone: string): string {
    // Remover todos los caracteres no numéricos
    const cleaned = phone.replace(/\D/g, "");

    // Si tiene 10 dígitos, formatear como teléfono mexicano
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Si tiene 12 dígitos (incluyendo código de país), formatear con +52
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
        const withoutCountryCode = cleaned.slice(2);
        return `+52 (${withoutCountryCode.slice(0, 3)}) ${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6)}`;
    }

    // Si tiene 13 dígitos (incluyendo +52), formatear
    if (cleaned.length === 13 && cleaned.startsWith("521")) {
        const withoutCountryCode = cleaned.slice(2);
        return `+52 (${withoutCountryCode.slice(0, 3)}) ${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6)}`;
    }

    // Si no coincide con ningún patrón, devolver tal como está
    return phone;
}

// Función para formatear RFC
export function formatRFC(rfc: string): string {
    const cleaned = rfc.toUpperCase().replace(/\s/g, "");

    if (cleaned.length === 12) {
        // Persona moral
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 13) {
        // Persona física
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 10)}-${cleaned.slice(10)}`;
    }

    return rfc;
}

// Función para formatear código postal
export function formatPostalCode(postalCode: string): string {
    const cleaned = postalCode.replace(/\D/g, "");

    if (cleaned.length === 5) {
        return cleaned;
    }

    return postalCode;
}

// Función para capitalizar texto
export function capitalize(text: string): string {
    return text
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Función para truncar texto
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength) + "...";
}

// Función para formatear slug
export function formatSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remover acentos
        .replace(/[^a-z0-9\s-]/g, "") // Remover caracteres especiales
        .replace(/\s+/g, "-") // Reemplazar espacios con guiones
        .replace(/-+/g, "-") // Reemplazar múltiples guiones con uno solo
        .trim();
}

// Función para formatear iniciales
export function formatInitials(name: string): string {
    return name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2);
}
