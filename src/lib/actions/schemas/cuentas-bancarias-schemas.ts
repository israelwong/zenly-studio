import { z } from 'zod';

export const CuentaBancariaSchema = z.object({
    banco: z.string()
        .min(1, 'El nombre del banco es requerido')
        .min(2, 'El nombre del banco debe tener al menos 2 caracteres')
        .max(100, 'El nombre del banco no puede exceder 100 caracteres'),

    numeroCuenta: z.string()
        .min(1, 'El número de cuenta es requerido')
        .min(18, 'La CLABE debe tener exactamente 18 dígitos')
        .max(18, 'La CLABE debe tener exactamente 18 dígitos')
        .regex(/^[0-9]{18}$/, 'La CLABE debe contener exactamente 18 dígitos'),

    titular: z.string()
        .min(1, 'El nombre del titular es requerido')
        .min(2, 'El nombre del titular debe tener al menos 2 caracteres')
        .max(100, 'El nombre del titular no puede exceder 100 caracteres'),

    activo: z.boolean()
});

export type CuentaBancariaForm = z.infer<typeof CuentaBancariaSchema>;

export const CuentaBancariaUpdateSchema = CuentaBancariaSchema.partial().extend({
    id: z.string().min(1, 'El ID de la cuenta es requerido')
});

export type CuentaBancariaUpdate = z.infer<typeof CuentaBancariaUpdateSchema>;