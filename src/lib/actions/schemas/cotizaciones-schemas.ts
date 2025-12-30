import { z } from 'zod';

/**
 * Estados de cotización (studio_cotizaciones.status):
 * 
 * FLUJO NORMAL:
 * - "pendiente" → Cotización creada, esperando autorización del prospecto
 * - "preautorizada" → Prospecto autorizó desde portal público
 * - "contract_pending" → Studio autorizó, esperando confirmación de datos del cliente
 * - "contract_generated" → Cliente confirmó datos, contrato generado automáticamente
 * - "contract_signed" → Cliente firmó contrato, esperando autorización final del studio
 * - "autorizada" / "aprobada" → Studio autorizó evento, contrato vinculado
 * 
 * ESTADOS ESPECIALES:
 * - "cancelada" → Cotización cancelada
 * - "archived" → Cotización archivada (campo separado: archived = true)
 * 
 * LEGACY (importación de clientes):
 * - Studio puede autorizar directamente sin pasar por flujo de contrato
 */

export const createCotizacionSchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  promise_id: z.string().cuid().optional().nullable(),
  contact_id: z.string().cuid().optional().nullable(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  items: z.record(z.string(), z.number().int().min(1)).refine(
    (items) => Object.values(items).some((qty) => qty > 0),
    'Debe incluir al menos un item con cantidad mayor a 0'
  ),
});

export type CreateCotizacionData = z.infer<typeof createCotizacionSchema>;

export const updateCotizacionSchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  cotizacion_id: z.string().cuid('ID de cotización inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  items: z.record(z.string(), z.number().int().min(1)).refine(
    (items) => Object.values(items).some((qty) => qty > 0),
    'Debe incluir al menos un item con cantidad mayor a 0'
  ),
});

export type UpdateCotizacionData = z.infer<typeof updateCotizacionSchema>;

export interface CotizacionResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    evento_id?: string;
    cotizacion?: {
      id: string;
      name: string;
      price: number;
      status: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
      order: number | null;
      archived: boolean;
    };
  };
  error?: string;
}

export const autorizarCotizacionSchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  cotizacion_id: z.string().cuid('ID de cotización inválido'),
  promise_id: z.string().cuid('ID de promesa inválido'),
  condiciones_comerciales_id: z.string().cuid('ID de condiciones comerciales inválido'),
  monto: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
});

export type AutorizarCotizacionData = z.infer<typeof autorizarCotizacionSchema>;

// Schema para crear revisión de cotización
export const crearRevisionCotizacionSchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  cotizacion_original_id: z.string().cuid('ID de cotización original inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  items: z.record(z.string(), z.number().int().min(1)).refine(
    (items) => Object.values(items).some((qty) => qty > 0),
    'Debe incluir al menos un item con cantidad mayor a 0'
  ),
});

export type CrearRevisionCotizacionData = z.infer<typeof crearRevisionCotizacionSchema>;

// Schema para autorizar revisión con migración de dependencias
export const autorizarRevisionCotizacionSchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  revision_id: z.string().cuid('ID de revisión inválido'),
  promise_id: z.string().cuid('ID de promesa inválido'),
  condiciones_comerciales_id: z.string().cuid('ID de condiciones comerciales inválido'),
  monto: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
  migrar_dependencias: z.boolean().default(true), // Si migrar scheduler tasks y crew assignments
});

export type AutorizarRevisionCotizacionData = z.infer<typeof autorizarRevisionCotizacionSchema>;

