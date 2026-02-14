import { z } from 'zod';

// =====================================================
// SCHEMAS ZOD - VALIDACIÓN
// =====================================================

/**
 * Schema de validación para Sección
 */
export const SeccionSchema = z.object({
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres')
        .trim(),
    descripcion: z
        .string()
        .max(500, 'La descripción no puede exceder 500 caracteres')
        .trim()
        .optional()
        .nullable(),
    order: z.number().int().min(0).default(0),
});

/**
 * Schema de validación para Categoría
 */
export const CategoriaSchema = z.object({
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres')
        .trim(),
    order: z.number().int().min(0).default(0),
});

/**
 * Schema de validación para Gasto de Servicio
 */
export const GastoServicioSchema = z.object({
    id: z.string().cuid().optional(),
    nombre: z.string().min(1, 'El nombre es requerido'),
    costo: z.number().min(0, 'El costo no puede ser negativo'),
});

/**
 * Schema de validación para Servicio
 */
export const ServicioSchema = z.object({
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(200, 'El nombre no puede exceder 200 caracteres')
        .trim(),
    costo: z
        .number()
        .min(0, 'El costo no puede ser negativo')
        .max(999999.99, 'El costo es demasiado alto'),
    gasto: z
        .number()
        .min(0, 'El gasto no puede ser negativo')
        .max(999999.99, 'El gasto es demasiado alto'),
    // utilidad: z
    //     .number()
    //     .min(0, 'La utilidad no puede ser negativa')
    //     .max(999999.99, 'La utilidad es demasiado alta'),
    // precio_publico: z
    //     .number()
    //     .min(0, 'El precio no puede ser negativo')
    //     .max(999999.99, 'El precio es demasiado alto'),
    tipo_utilidad: z.enum(["servicio", "producto"]).refine(val => val, {
        message: "Tipo de utilidad inválido"
    }).default('servicio'),
    servicioCategoriaId: z
        .string()
        .cuid('ID de categoría inválido'),
    status: z.enum(['active', 'inactive']).default('active'),
    order: z.number().int().min(0).default(0),
    gastos: z.array(GastoServicioSchema).optional(),
});

/**
 * Schema para actualizar orden en drag & drop
 */
export const ActualizarOrdenSchema = z.object({
    itemId: z.string().cuid('ID inválido'),
    itemType: z.enum(['seccion', 'categoria', 'servicio']),
    newIndex: z.number().int().min(0),
    parentId: z.string().cuid('ID de padre inválido').nullable(),
});

/**
 * Schema para actualizar orden de múltiples secciones
 */
export const ActualizarOrdenSeccionesSchema = z.object({
    secciones: z.array(
        z.object({
            id: z.string().cuid(),
            order: z.number().int().min(0),
        })
    ).min(1, 'Debe haber al menos una sección'),
});

/**
 * Schema para actualizar orden de múltiples categorías.
 * order = índice del array (0, 1, 2... N-1). Una sola fuente de verdad.
 */
export const ActualizarOrdenCategoriasSchema = z.object({
    categorias: z.array(
        z.object({
            id: z.string().cuid(),
            order: z.number().int().min(0),
        })
    ).min(1, 'Debe haber al menos una categoría'),
});

// =====================================================
// TIPOS TYPESCRIPT
// =====================================================

/**
 * Tipo para datos de Sección
 */
export interface SeccionData {
    id: string;
    nombre: string;
    descripcion?: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    categorias: CategoriaData[];
}

/**
 * Tipo para datos de Categoría.
 * order = índice (0, 1, 2... N-1). Una sola fuente de verdad.
 */
export interface CategoriaData {
    id: string;
    nombre: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    seccionId?: string; // ID de la sección a la que pertenece
    servicios: ServicioData[];
}

/**
 * Tipo para Gasto de Servicio
 */
export interface GastoServicioData {
    id?: string;
    nombre: string;
    costo: number;
}

/**
 * Tipo para datos de Servicio
 */
/** Categoría operativa para cronograma (Workflows Inteligentes) */
export type OperationalCategoryCatalog = 'PRODUCTION' | 'POST_PRODUCTION' | 'DELIVERY' | 'DIGITAL_DELIVERY' | 'PHYSICAL_DELIVERY' | 'LOGISTICS';

export interface ServicioData {
    id: string;
    studioId: string;
    servicioCategoriaId: string;
    nombre: string;
    costo: number;
    gasto: number;
    utilidad?: number; // Se calcula dinámicamente
    precio_publico?: number; // Se calcula dinámicamente
    tipo_utilidad: string;
    type: string; // Agregar campo type del enum
    billing_type?: 'HOUR' | 'SERVICE' | 'UNIT'; // Tipo de facturación dinámica
    operational_category?: OperationalCategoryCatalog | null;
    order: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    categoria?: CategoriaData;
    gastos?: GastoServicioData[];
}

/**
 * Tipos para formularios
 */
export type SeccionFormData = z.infer<typeof SeccionSchema>;
export type CategoriaFormData = z.infer<typeof CategoriaSchema>;
export type ServicioFormData = z.infer<typeof ServicioSchema>;
export type ActualizarOrdenData = z.infer<typeof ActualizarOrdenSchema>;

/**
 * Tipo de respuesta estándar de acciones
 */
export interface ActionResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
