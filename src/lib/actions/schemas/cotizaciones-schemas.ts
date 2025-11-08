import { z } from 'zod';

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

export interface CotizacionResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
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

