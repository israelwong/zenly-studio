// Ruta: src/lib/actions/schemas/metodos-schemas.ts

import { z } from 'zod';

export const MetodoPagoSchema = z.object({
    id: z.string().optional(),
    metodo_pago: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),

    // Tratamos los números como strings para el formulario
    comision_porcentaje_base: z.string().optional(),
    comision_fija_monto: z.string().optional(),

    payment_method: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    orden: z.number(),
});

export type MetodoPagoForm = z.infer<typeof MetodoPagoSchema>;

// Schema para actualización masiva
export const MetodosPagoBulkSchema = z.object({
    metodos: z.array(MetodoPagoSchema),
});

export type MetodosPagoBulkForm = z.infer<typeof MetodosPagoBulkSchema>;
