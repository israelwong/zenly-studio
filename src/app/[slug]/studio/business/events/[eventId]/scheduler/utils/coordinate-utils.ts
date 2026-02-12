import { differenceInDays, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export const COLUMN_WIDTH = 60; // px (valor por defecto, usar columnWidth dinámico para zoom)
export const COLUMN_WIDTH_MIN = 20;
export const COLUMN_WIDTH_MAX = 150;

/**
 * Posición X de una fecha en el grid. Usa toLocalDateOnly para que la columna
 * coincida con el día local (misma lógica que calculateTaskStatus y el Header).
 */
export function getPositionFromDate(date: Date, dateRange: DateRange, columnWidth = COLUMN_WIDTH): number {
  if (!dateRange?.from) return 0;
  const dateLocal = toLocalDateOnly(date);
  const fromLocal = toLocalDateOnly(dateRange.from);
  const dayIndex = differenceInDays(dateLocal, fromLocal);
  return dayIndex * columnWidth;
}

/**
 * Fecha correspondiente a una posición X. Misma lógica local que getPositionFromDate.
 */
export function getDateFromPosition(x: number, dateRange: DateRange, columnWidth = COLUMN_WIDTH): Date {
  if (!dateRange?.from) return new Date();
  const dayIndex = Math.floor(x / columnWidth);
  const fromLocal = toLocalDateOnly(dateRange.from);
  return addDays(fromLocal, dayIndex);
}

/**
 * Ancho en píxeles de una tarea por duración. Días en local para coincidir con posición y estado.
 */
export function getWidthFromDuration(startDate: Date, endDate: Date, columnWidth = COLUMN_WIDTH): number {
  const startLocal = toLocalDateOnly(startDate);
  const endLocal = toLocalDateOnly(endDate);
  const days = differenceInDays(endLocal, startLocal) + 1;
  return days * columnWidth;
}

/**
 * Normaliza una fecha usando métodos UTC con mediodía como buffer
 * Evita problemas de zona horaria al comparar fechas
 */
export function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0
  ));
}

/**
 * Fecha 00:00:00 del día indicado en la zona horaria local del usuario (sin UTC).
 * Usar para comparar "qué día es" de forma consistente en el scheduler.
 */
export function toLocalDateOnly(date: Date): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * "Hoy" como 00:00:00 en la zona local del usuario.
 * Misma referencia que usa el Header para pintar el día actual en verde.
 */
export function getTodayLocalDateOnly(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Valida que una fecha esté dentro del rango (por día local).
 */
export function isDateInRange(date: Date, dateRange: DateRange): boolean {
  if (!dateRange?.from || !dateRange?.to) return false;
  const d = toLocalDateOnly(date);
  const from = toLocalDateOnly(dateRange.from);
  const to = toLocalDateOnly(dateRange.to);
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

/**
 * Total de días en el rango (por día local).
 */
export function getTotalDays(dateRange: DateRange): number {
  if (!dateRange?.from || !dateRange?.to) return 0;
  const fromLocal = toLocalDateOnly(dateRange.from);
  const toLocal = toLocalDateOnly(dateRange.to);
  return differenceInDays(toLocal, fromLocal) + 1;
}

/**
 * Obtiene el ancho total del grid (en píxeles)
 */
export function getTotalGridWidth(dateRange: DateRange, columnWidth = COLUMN_WIDTH): number {
  return getTotalDays(dateRange) * columnWidth;
}

/**
 * Posición X de la línea "HOY": (días desde inicio del scheduler hasta hoy local) * ancho de columna.
 * Usa la misma noción de "hoy" que el Header (toLocalDateOnly / getTodayLocalDateOnly).
 */
export function getTodayPosition(dateRange: DateRange, columnWidth = COLUMN_WIDTH): number | null {
  if (!dateRange?.from || !dateRange?.to) return null;

  const today = getTodayLocalDateOnly();
  const fromLocal = toLocalDateOnly(dateRange.from);
  const toLocal = toLocalDateOnly(dateRange.to);

  if (today.getTime() < fromLocal.getTime() || today.getTime() > toLocal.getTime()) {
    return null;
  }

  const dayIndex = differenceInDays(today, fromLocal);
  return dayIndex * columnWidth;
}

