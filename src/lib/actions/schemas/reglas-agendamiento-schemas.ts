import { z } from 'zod';

// =============================================================================
// SCHEMAS DE VALIDACIÓN PARA REGLAS DE AGENDAMIENTO
// =============================================================================

/**
 * Schema para crear una nueva regla de agendamiento
 */
export const createReglaAgendamientoSchema = z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    descripcion: z.string().optional(),
    recurrencia: z.enum(['por_dia', 'por_hora']).refine(
        (val) => ['por_dia', 'por_hora'].includes(val),
        { message: 'La recurrencia debe ser "por_dia" o "por_hora"' }
    ),
    capacidadOperativa: z.number().min(1, 'La capacidad operativa debe ser al menos 1'),
    status: z.enum(['active', 'inactive']).default('active'),
    orden: z.number().min(0).default(0)
});

/**
 * Schema para actualizar una regla de agendamiento existente
 */
export const updateReglaAgendamientoSchema = createReglaAgendamientoSchema.partial();

/**
 * Schema para actualizar el orden de las reglas
 */
export const updateOrdenReglasSchema = z.array(
    z.object({
        id: z.string(),
        orden: z.number().min(0)
    })
);

// =============================================================================
// TIPOS TYPESCRIPT
// =============================================================================

export type CreateReglaAgendamiento = z.infer<typeof createReglaAgendamientoSchema>;
export type UpdateReglaAgendamiento = z.infer<typeof updateReglaAgendamientoSchema>;
export type UpdateOrdenReglas = z.infer<typeof updateOrdenReglasSchema>;

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

export interface ReglaAgendamientoResponse {
    success: boolean;
    data?: {
        id: string;
        projectId: string;
        nombre: string;
        descripcion?: string | null;
        recurrencia: 'por_dia' | 'por_hora';
        capacidadOperativa: number;
        status: 'active' | 'inactive';
        orden: number;
        createdAt: Date;
        updatedAt: Date;
    };
    error?: string;
}

export interface ReglasAgendamientoListResponse {
    success: boolean;
    data?: Array<{
        id: string;
        projectId: string;
        nombre: string;
        descripcion?: string | null;
        recurrencia: 'por_dia' | 'por_hora';
        capacidadOperativa: number;
        status: 'active' | 'inactive';
        orden: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    error?: string;
}
