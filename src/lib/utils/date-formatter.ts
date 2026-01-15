/**
 * Utilidades para formatear fechas como "Calendar-Only" (solo fecha de calendario)
 * Usa exclusivamente métodos UTC para evitar problemas de zona horaria
 */

/**
 * Formatea una fecha usando exclusivamente métodos UTC
 * NO usa .toLocaleDateString() directamente, sino que extrae componentes UTC
 * y luego los formatea para garantizar que el día calendario sea correcto
 * independientemente de la zona horaria del navegador
 */
export function formatDisplayDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  if (!date) {
    return 'Sin fecha';
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    // Si es string YYYY-MM-DD, parsear directamente
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      // Crear fecha usando UTC para evitar problemas de zona horaria
      dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }

  // Extraer componentes usando EXCLUSIVAMENTE métodos UTC
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();

  // Crear nueva fecha local con los componentes UTC para formatear
  // Esto garantiza que el día calendario sea correcto
  const localDate = new Date(year, month, day);

  return new Intl.DateTimeFormat('es-MX', options).format(localDate);
}

/**
 * Formatea una fecha en formato corto (día mes año)
 */
export function formatDisplayDateShort(
  date: Date | string | null | undefined
): string {
  return formatDisplayDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha en formato largo (día de semana, día mes año)
 */
export function formatDisplayDateLong(
  date: Date | string | null | undefined
): string {
  return formatDisplayDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
