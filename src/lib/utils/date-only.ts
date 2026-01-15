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
