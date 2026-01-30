export const parseDateOnlyToUtc = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  // Usar mediodía (12 PM) UTC como buffer para evitar que cualquier offset de zona horaria (+/- 12h) cambie el día
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
};

export const normalizeDateToUtcDateOnly = (value: Date): Date =>
  // Usar mediodía (12 PM) UTC como buffer para evitar que cualquier offset de zona horaria (+/- 12h) cambie el día
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0));

export const toUtcDateOnly = (value: string | Date): Date | null => {
  if (value instanceof Date) {
    return normalizeDateToUtcDateOnly(value);
  }

  const parsedDateOnly = parseDateOnlyToUtc(value);
  if (parsedDateOnly) {
    return parsedDateOnly;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return normalizeDateToUtcDateOnly(parsed);
};

/**
 * Convierte un Date a string YYYY-MM-DD usando métodos UTC
 * Útil para normalizar fechas antes de serializar desde server actions
 */
export const dateToDateOnlyString = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Dado un instante y una zona horaria (ej. America/Mexico_City), devuelve el día
 * calendario en esa zona como Date a mediodía UTC, para mostrar como "fecha legal"
 * (ej. firma el jueves 29 a las 22:50 México → mostrar "jueves, 29 de enero").
 */
export function getDateOnlyInTimezone(value: Date | string, timeZone: string): Date | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
  } catch {
    return null;
  }
}

/**
 * Formatea una fecha usando métodos UTC para extraer los componentes de fecha
 * Evita problemas de zona horaria al usar getUTCDate(), getUTCMonth(), getUTCFullYear()
 */
export const formatDateOnlyUtc = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string => {
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Extraer componentes usando métodos UTC para evitar problemas de zona horaria
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();

  // Crear nueva fecha local con los componentes UTC para formatear
  const localDate = new Date(year, month, day);

  return new Intl.DateTimeFormat('es-MX', options).format(localDate);
};
