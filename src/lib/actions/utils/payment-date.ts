/**
 * Utilidades para normalizar fechas de pago evitando problemas de zona horaria
 */

/**
 * Normaliza una fecha de pago a fecha local sin hora para evitar problemas de zona horaria
 * Extrae solo año, mes y día en hora local y crea una nueva fecha a medianoche local
 * 
 * @param date - Fecha como Date, string o undefined/null
 * @returns Date normalizado a fecha local sin hora
 */
export function normalizePaymentDate(date: Date | string | undefined | null): Date {
    if (!date) {
        return new Date();
    }
    
    if (typeof date === 'string') {
        // Si es string con formato YYYY-MM-DD o YYYY-MM-DD HH:MM:SS, extraer solo la fecha
        const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            // Crear fecha local a medianoche
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Si no coincide, intentar parsear normalmente
        return new Date(date);
    }
    
    // Si es Date, extraer año, mes y día en hora LOCAL (no UTC)
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Crear nueva fecha local a medianoche
    return new Date(year, month, day);
}

