import { z } from 'zod';

/**
 * Schema para validación de tipos de evento (enriquecido con multimedia)
 */
export const TipoEventoSchema = z.object({
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(50, 'El nombre no puede exceder 50 caracteres')
        .trim(),
    description: z
        .string()
        .max(500, 'La descripción no puede exceder 500 caracteres')
        .trim()
        .optional()
        .nullable(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/i, 'El color debe ser un código hex válido (ej: #FF5733)')
        .optional()
        .nullable(),
    icon: z
        .string()
        .max(50, 'El nombre del icono no puede exceder 50 caracteres')
        .trim()
        .optional()
        .nullable(),
    cover_image_url: z
        .string()
        .url('Debe ser una URL válida')
        .optional()
        .nullable(),
    cover_video_url: z
        .string()
        .url('Debe ser una URL válida')
        .optional()
        .nullable(),
    cover_media_type: z
        .enum(['image', 'video'], {
            errorMap: () => ({ message: 'El tipo de media debe ser "image" o "video"' }),
        })
        .optional()
        .nullable(),
    cover_design_variant: z
        .enum(['solid', 'gradient'], {
            errorMap: () => ({ message: 'La variante de diseño debe ser "solid" o "gradient"' }),
        })
        .optional()
        .nullable(),
    status: z
        .enum(['active', 'inactive'], {
            errorMap: () => ({ message: 'Estado inválido' }),
        })
        .default('active'),
}).refine(
    (data) => {
        // Si hay cover_video_url, debe haber cover_media_type = 'video'
        if (data.cover_video_url && data.cover_media_type !== 'video') {
            return false;
        }
        // Si hay cover_image_url, debe haber cover_media_type = 'image'
        if (data.cover_image_url && data.cover_media_type !== 'image') {
            return false;
        }
        // No puede haber ambos covers al mismo tiempo
        if (data.cover_image_url && data.cover_video_url) {
            return false;
        }
        return true;
    },
    {
        message: 'Los covers deben ser consistentes: image_url requiere media_type="image", video_url requiere media_type="video", y no pueden coexistir ambos',
    }
);

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
    studio_id?: string;
    projectId?: string;
    nombre: string;
    status: string;
    orden: number;
    // Campos multimedia y diseño
    cover_image_url?: string | null;
    cover_video_url?: string | null;
    cover_media_type?: 'image' | 'video' | null;
    cover_design_variant?: 'solid' | 'gradient' | null;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    // Campos legacy (mantener para compatibilidad)
    icono?: string | null; // Deprecated: usar 'icon'
    descripcion?: string | null; // Deprecated: usar 'description'
    createdAt: Date;
    updatedAt: Date;
    // Relaciones
    paquetes?: PaqueteData[];
    _count?: {
        eventos: number;
    };
}

export interface TipoEventoFormData {
    id?: string;
    nombre: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    cover_image_url?: string | null;
    cover_video_url?: string | null;
    cover_media_type?: 'image' | 'video' | null;
    cover_design_variant?: 'solid' | 'gradient' | null;
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
