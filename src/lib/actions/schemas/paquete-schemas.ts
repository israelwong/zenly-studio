import { z } from 'zod';

/**
 * Schema para validación de servicios en paquete
 */
export const PaqueteServicioSchema = z.object({
    servicioId: z.string().cuid('ID de servicio inválido'),
    servicioCategoriaId: z.string().cuid('ID de categoría inválido'),
    cantidad: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

/**
 * Schema para validación de paquetes
 */
export const PaqueteSchema = z.object({
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres')
        .trim(),
    descripcion: z
        .string()
        .max(500, 'La descripción no puede exceder 500 caracteres')
        .optional()
        .nullable(),
    eventoTipoId: z.string().cuid('ID de tipo de evento inválido'),
    precio: z
        .number()
        .min(0, 'El precio no puede ser negativo')
        .max(999999.99, 'El precio excede el máximo permitido'),
    servicios: z
        .array(PaqueteServicioSchema)
        .min(1, 'Debe incluir al menos un servicio en el paquete'),
});

/**
 * Schema para crear paquete
 */
export const CrearPaqueteSchema = PaqueteSchema;

/**
 * Schema para actualizar paquete
 */
export const ActualizarPaqueteSchema = PaqueteSchema.extend({
    id: z.string().cuid('ID de paquete inválido'),
});

/**
 * Interfaces TypeScript
 */

export interface PaqueteServicioData {
    servicioId: string;
    servicioCategoriaId: string;
    cantidad: number;
}

// Tipo que devuelve Prisma (puede incluir o no las relaciones)
export type PaqueteFromDB = {
    id: string;
    studio_id: string;
    event_type_id: string;
    name: string;
    description?: string | null;
    cover_url?: string | null;
    cover_storage_bytes?: bigint | null;
    is_featured?: boolean;
    cost?: number | null;
    expense?: number | null;
    utilidad?: number | null;
    precio?: number | null;
    status: string;
    position: number;
    created_at: Date;
    updated_at: Date;
} & {
    paquete_items?: Array<{
        id: string;
        item_id: string;
        service_category_id: string;
        quantity: number;
        position: number;
        visible_to_client: boolean;
        status: string;
        created_at: Date;
        updated_at: Date;
        items?: {
            name: string;
        };
        service_categories?: {
            name: string;
        };
    }>;
    event_types?: {
        id: string;
        name: string;
        order: number;
    };
};

// Tipo para uso en componentes (compatible con el schema original)
export interface PaqueteData {
    id: string;
    projectId: string;
    eventoTipoId: string;
    nombre: string;
    descripcion?: string | null;
    costo?: number | null;
    gasto?: number | null;
    utilidad?: number | null;
    precio: number;
    status: string;
    posicion: number;
    createdAt: Date;
    updatedAt: Date;
    servicios: PaqueteServicioData[];
}

export interface PaqueteFormData {
    id?: string;
    nombre: string;
    descripcion?: string | null;
    eventoTipoId: string;
    precio: number;
    servicios: PaqueteServicioData[];
}

export interface PaqueteConServiciosCompletos extends PaqueteData {
    serviciosDetalle: Array<{
        id: string;
        servicioId: string;
        nombre: string;
        costo: number;
        gasto: number;
        tipo_utilidad: string;
        cantidad: number;
        servicioCategoriaId: string;
        categoriaNombre: string;
        seccionId?: string;
        seccionNombre?: string;
    }>;
}

/**
 * Interface para cálculo de precios
 */
export interface ServicioConCantidad {
    id: string;
    nombre: string;
    costo: number;
    gasto: number;
    tipo_utilidad: string;
    cantidad: number;
}

export interface CalculoPaquete {
    totalCosto: number;
    totalGasto: number;
    totalUtilidad: number;
    precioSistema: number;
    precioVenta: number;
    descuentoPorcentaje: number;
    sobreprecioPorcentaje: number;
    descuentoMonto: number;
    sobreprecioMonto: number;
}

/**
 * Tipos de datos para formularios
 */
export type PaqueteForm = z.infer<typeof PaqueteSchema>;
export type CrearPaqueteForm = z.infer<typeof CrearPaqueteSchema>;
export type ActualizarPaqueteForm = z.infer<typeof ActualizarPaqueteSchema>;
export type PaqueteServicioForm = z.infer<typeof PaqueteServicioSchema>;

