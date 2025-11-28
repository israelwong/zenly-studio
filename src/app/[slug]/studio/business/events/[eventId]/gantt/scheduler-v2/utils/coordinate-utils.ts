import { differenceInDays, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const COLUMN_WIDTH = 60; // px

/**
 * Calcula la posición X (en píxeles) de una fecha dentro del rango
 * @param date - Fecha a calcular
 * @param dateRange - Rango de fechas del evento
 * @returns Posición en píxeles
 */
export function getPositionFromDate(date: Date, dateRange: DateRange): number {
  if (!dateRange?.from) return 0;
  
  const dayIndex = differenceInDays(new Date(date), new Date(dateRange.from));
  return dayIndex * COLUMN_WIDTH;
}

/**
 * Convierte una posición X (píxeles) a una fecha
 * @param x - Posición en píxeles
 * @param dateRange - Rango de fechas del evento
 * @returns Fecha calculada
 */
export function getDateFromPosition(x: number, dateRange: DateRange): Date {
  if (!dateRange?.from) return new Date();
  
  const dayIndex = Math.round(x / COLUMN_WIDTH);
  return addDays(new Date(dateRange.from), dayIndex);
}

/**
 * Calcula el ancho de una tarea en píxeles basado en su duración
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Ancho en píxeles
 */
export function getWidthFromDuration(startDate: Date, endDate: Date): number {
  const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  return days * COLUMN_WIDTH;
}

/**
 * Normaliza una fecha a las 00:00:00
 */
export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Valida que una fecha esté dentro del rango permitido
 */
export function isDateInRange(date: Date, dateRange: DateRange): boolean {
  if (!dateRange?.from || !dateRange?.to) return false;
  
  const normalizedDate = normalizeDate(date);
  const from = normalizeDate(dateRange.from);
  const to = normalizeDate(dateRange.to);
  
  return normalizedDate >= from && normalizedDate <= to;
}

/**
 * Obtiene el total de días en el rango
 */
export function getTotalDays(dateRange: DateRange): number {
  if (!dateRange?.from || !dateRange?.to) return 0;
  return differenceInDays(new Date(dateRange.to), new Date(dateRange.from)) + 1;
}

/**
 * Obtiene el ancho total del grid (en píxeles)
 */
export function getTotalGridWidth(dateRange: DateRange): number {
  return getTotalDays(dateRange) * COLUMN_WIDTH;
}

