/**
 * Utilidades para formatear fechas como "Calendar-Only" (solo fecha de calendario)
 * y etiquetas relativas (Hoy, Mañana, En X días).
 *
 * IMPORTANTE - Fechas relativas ("Hoy", "Mañana"):
 * "Hoy" debe ser el día actual en la zona horaria del usuario, no en UTC.
 * Si se usa UTC para "today", en zonas negativas (ej. México UTC-6) a las 18:00
 * del 28 ene ya es 29 ene en UTC, y se mostraría "Hoy · 29 ene" cuando el usuario
 * aún está en el 28. Por eso getRelativeDateLabel usa getFullYear/getMonth/getDate
 * (fecha local) para "hoy" y el día calendario del evento para la diferencia.
 */

import { toUtcDateOnly } from '@/lib/utils/date-only';

export type RelativeDateVariant = 'destructive' | 'warning' | 'success' | 'default';

export interface RelativeDateLabelOptions {
  /** Etiqueta para fecha pasada: "Vencido" (seguimiento) o "Vencida" (agenda) */
  pastLabel?: 'Vencido' | 'Vencida';
  /** Variante para fechas futuras (En X días, Próx. semana): 'default' o 'success' (agenda) */
  futureVariant?: 'default' | 'success';
}

/**
 * Devuelve etiqueta relativa + fecha corta y variante para UI (colores).
 * Usa el día actual LOCAL del usuario para que "Hoy" coincida con su calendario.
 */
export function getRelativeDateLabel(
  date: Date | string | null | undefined,
  options: RelativeDateLabelOptions = {}
): { text: string; variant: RelativeDateVariant } {
  const { pastLabel = 'Vencido', futureVariant = 'default' } = options;
  const dateUtc = date != null ? toUtcDateOnly(date) : null;
  if (!dateUtc) return { text: '—', variant: 'default' };

  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetLocal = new Date(
    dateUtc.getUTCFullYear(),
    dateUtc.getUTCMonth(),
    dateUtc.getUTCDate()
  );
  const diffDays = Math.round(
    (targetLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dateStr = formatDisplayDate(dateUtc, { day: 'numeric', month: 'short' });

  if (diffDays < 0) return { text: `${pastLabel} · ${dateStr}`, variant: 'destructive' };
  if (diffDays === 0) return { text: `Hoy · ${dateStr}`, variant: 'warning' };
  if (diffDays === 1) return { text: `Mañana · ${dateStr}`, variant: 'warning' };
  if (diffDays <= 7) return { text: `En ${diffDays} días · ${dateStr}`, variant: futureVariant };
  if (diffDays <= 14) return { text: `Próx. semana · ${dateStr}`, variant: futureVariant };
  return { text: dateStr, variant: 'default' };
}

/**
 * Días desde "hoy" (local) hasta la fecha indicada.
 * > 0 = futuro, 0 = hoy, < 0 = pasado. Usa fecha local del usuario para "hoy".
 */
export function getRelativeDateDiffDays(date: Date | string | null | undefined): number | null {
  const dateUtc = date != null ? toUtcDateOnly(date) : null;
  if (!dateUtc) return null;
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetLocal = new Date(
    dateUtc.getUTCFullYear(),
    dateUtc.getUTCMonth(),
    dateUtc.getUTCDate()
  );
  return Math.round(
    (targetLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)
  );
}

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

/**
 * Formatea un instante (fecha + hora) en la zona horaria indicada.
 * Usar para "fecha de firma" con hora (MASTER_DATE_SSOT_GUIDE: studio.timezone o America/Mexico_City).
 */
export function formatDisplayDateTimeInTimezone(
  value: Date | string | null | undefined,
  timeZone: string = 'America/Mexico_City'
): string {
  if (value == null) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Prueba interna de certificación SSoT: una fecha ISO de medianoche UTC
 * (ej. 2025-04-25T00:00:00.000Z) debe devolver siempre el mismo día calendario
 * formateado (sábado, 25 de abril de 2025) sin importar la zona horaria del entorno.
 * Valida que toUtcDateOnly + formatDisplayDateLong son seguros para fechas legales.
 */
export function runDateOnlyLegalDisplayTest(): { ok: boolean; message: string } {
  const ISO_MIDNIGHT = '2025-04-25T00:00:00.000Z';
  const EXPECTED = 'sábado, 25 de abril de 2025';

  const normalized = toUtcDateOnly(ISO_MIDNIGHT);
  if (!normalized) {
    return { ok: false, message: 'toUtcDateOnly(ISO_MIDNIGHT) returned null' };
  }

  const formatted = formatDisplayDateLong(normalized);
  if (formatted !== EXPECTED) {
    return {
      ok: false,
      message: `Expected "${EXPECTED}", got "${formatted}" (ISO midnight UTC must render as 25 April 2025 regardless of TZ)`,
    };
  }

  // También validar string YYYY-MM-DD y Date de medianoche
  const fromDateOnlyString = formatDisplayDateLong(toUtcDateOnly('2025-04-25'));
  if (fromDateOnlyString !== EXPECTED) {
    return {
      ok: false,
      message: `Date-only string "2025-04-25": expected "${EXPECTED}", got "${fromDateOnlyString}"`,
    };
  }

  const midnightDate = new Date(ISO_MIDNIGHT);
  const fromMidnightDate = formatDisplayDateLong(toUtcDateOnly(midnightDate));
  if (fromMidnightDate !== EXPECTED) {
    return {
      ok: false,
      message: `Date(ISO_MIDNIGHT) via toUtcDateOnly: expected "${EXPECTED}", got "${fromMidnightDate}"`,
    };
  }

  return {
    ok: true,
    message:
      'Certificación SSoT fechas legales: ISO medianoche y YYYY-MM-DD devuelven siempre "sábado, 25 de abril de 2025" (independiente de zona horaria).',
  };
}
