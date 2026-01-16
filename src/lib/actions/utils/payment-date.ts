/**
 * Utilidades para normalizar fechas de pago evitando problemas de zona horaria
 * Usa métodos UTC exclusivamente para garantizar fechas absolutas independientes de zona horaria
 */

/**
 * Normaliza una fecha de pago usando métodos UTC para evitar problemas de zona horaria
 * Extrae solo año, mes y día usando UTC y crea una nueva fecha con mediodía UTC como buffer
 * 
 * @param date - Fecha como Date, string o undefined/null
 * @returns Date normalizado usando UTC con mediodía como buffer
 */
export function normalizePaymentDate(date: Date | string | undefined | null): Date {
    if (!date) {
        // Si no hay fecha, usar fecha actual en UTC con mediodía como buffer
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    }
    
    if (typeof date === 'string') {
        // Si es string con formato YYYY-MM-DD, parsear usando UTC con mediodía como buffer
        const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            // Crear fecha usando UTC con mediodía como buffer
            return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
        }
        // Si no coincide, parsear y normalizar usando UTC
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) {
            // Si no se puede parsear, usar fecha actual
            const now = new Date();
            return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
        }
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0));
    }
    
    // Si es Date, extraer año, mes y día usando métodos UTC
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    // Crear nueva fecha usando UTC con mediodía como buffer
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

