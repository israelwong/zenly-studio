import { z } from "zod";

// Función para validar datos con Zod
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.issues.map((err) => err.message).join(", ");
            throw new Error(`Datos inválidos: ${errorMessages}`);
        }
        throw error;
    }
}

// Función para validar datos de forma segura (no lanza error)
export function safeValidateData<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map((err) => err.message);
            return { success: false, errors };
        }
        return { success: false, errors: ["Error de validación desconocido"] };
    }
}

// Función para validar FormData
export function validateFormData<T>(
    schema: z.ZodSchema<T>,
    formData: FormData
): T {
    const data: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
        // Convertir strings a números si es necesario
        if (value === "true") {
            data[key] = true;
        } else if (value === "false") {
            data[key] = false;
        } else if (!isNaN(Number(value)) && value !== "") {
            data[key] = Number(value);
        } else {
            data[key] = value;
        }
    }

    return validateData(schema, data);
}

// Función para validar parámetros de URL
export function validateUrlParams<T>(
    schema: z.ZodSchema<T>,
    params: Record<string, string | string[] | undefined>
): T {
    const data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            data[key] = value[0]; // Tomar el primer valor si es array
        } else {
            data[key] = value;
        }
    }

    return validateData(schema, data);
}

// Función para validar query parameters
export function validateQueryParams<T>(
    schema: z.ZodSchema<T>,
    searchParams: URLSearchParams
): T {
    const data: Record<string, unknown> = {};

    for (const [key, value] of searchParams.entries()) {
        // Convertir strings a números si es necesario
        if (!isNaN(Number(value)) && value !== "") {
            data[key] = Number(value);
        } else if (value === "true") {
            data[key] = true;
        } else if (value === "false") {
            data[key] = false;
        } else {
            data[key] = value;
        }
    }

    return validateData(schema, data);
}

// Función para sanitizar strings
export function sanitizeString(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, "") // Remover caracteres HTML básicos
        .replace(/\s+/g, " "); // Normalizar espacios
}

// Función para validar email
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para validar teléfono mexicano
export function isValidMexicanPhone(phone: string): boolean {
    const phoneRegex = /^(\+52|52)?[1-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Función para validar RFC mexicano
export function isValidMexicanRFC(rfc: string): boolean {
    const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcRegex.test(rfc.toUpperCase());
}

// Función para validar código postal mexicano
export function isValidMexicanPostalCode(postalCode: string): boolean {
    const postalCodeRegex = /^[0-9]{5}$/;
    return postalCodeRegex.test(postalCode);
}

// Función para validar slug
export function isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && !slug.startsWith("-") && !slug.endsWith("-");
}

// Función para generar slug a partir de texto
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remover acentos
        .replace(/[^a-z0-9\s-]/g, "") // Remover caracteres especiales
        .replace(/\s+/g, "-") // Reemplazar espacios con guiones
        .replace(/-+/g, "-") // Reemplazar múltiples guiones con uno solo
        .trim();
}

// Función para validar archivo
export function validateFile(
    file: File,
    maxSize: number,
    allowedTypes: string[]
): { valid: boolean; error?: string } {
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `El archivo es demasiado grande. Tamaño máximo: ${maxSize / 1024 / 1024}MB`,
        };
    }

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(", ")}`,
        };
    }

    return { valid: true };
}

// Función para validar URL
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Función para validar fecha
export function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

// Función para validar rango de fechas
export function isValidDateRange(startDate: string, endDate: string): boolean {
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return start <= end;
}
