import { z } from 'zod';

/**
 * Schema para validación de tipos de evento
 */
export const TipoEventoSchema = z.object({
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(50, 'El nombre no puede exceder 50 caracteres')
        .trim(),
    status: z
        .enum(['active', 'inactive'], {
            errorMap: () => ({ message: 'Estado inválido' }),
        })
        .default('active'),
});

/**
 * Schema para actualizar tipos de evento
 */
export const ActualizarTipoEventoSchema = TipoEventoSchema.partial();

/**
 * Schema para actualizar orden de tipos de evento
 */
export const ActualizarOrdenTiposEventoSchema = z.object({
    tipos: z.array(
        z.object({
            id: z.string().cuid(),
            orden: z.number().int().min(0),
        })
    ),
});

/**
 * Interfaces TypeScript
 */
export interface TipoEventoData {
    id: string;
    projectId: string;
    nombre: string;
    status: string;
    orden: number;
    createdAt: Date;
    updatedAt: Date;
    icono?: string;
    descripcion?: string;
    // Relaciones
    paquetes?: PaqueteData[];
}

export interface TipoEventoFormData {
    id?: string;
    nombre: string;
    status: 'active' | 'inactive';
}

export interface PaqueteData {
    id: string;
    nombre: string;
    precio: number;
    status: string;
}


/**
 * Tipos de datos para formularios
 */
export type TipoEventoForm = z.infer<typeof TipoEventoSchema>;
export type ActualizarTipoEventoForm = z.infer<typeof ActualizarTipoEventoSchema>;
export type ActualizarOrdenTiposEventoForm = z.infer<typeof ActualizarOrdenTiposEventoSchema>;
