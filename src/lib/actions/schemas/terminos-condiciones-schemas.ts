// Ruta: src/lib/actions/schemas/terminos-condiciones-schemas.ts

import { z } from 'zod';

export const TerminosCondicionesSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }),
    content: z.string().min(1, { message: 'El contenido es obligatorio.' }).min(10, { message: 'El contenido debe tener al menos 10 caracteres.' }),
    order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    is_required: z.boolean().optional(),
});

export type TerminosCondicionesForm = z.infer<typeof TerminosCondicionesSchema>;

