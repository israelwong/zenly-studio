// Ruta: src/lib/actions/schemas/metodos-pago-schemas.ts

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
    
    // Configuración de transferencia bancaria
    banco: z.string().optional(),
    beneficiario: z.string().optional(),
    cuenta_clabe: z.string().regex(/^[0-9]{18}$/, { message: 'La CLABE debe tener exactamente 18 dígitos numéricos' }).optional().or(z.literal('')),
    
    // Flags de tipo de método
    is_manual: z.boolean().default(true),
    available_for_quotes: z.boolean().default(false),
}).refine((data) => {
    // Si es transferencia, validar que tenga configuración completa si está activo
    if (data.payment_method === 'transferencia' && data.status === 'active') {
        return !!(data.banco && data.beneficiario && data.cuenta_clabe && data.cuenta_clabe.length === 18);
    }
    return true;
}, {
    message: 'La transferencia requiere banco, beneficiario y cuenta CLABE para estar activa',
    path: ['cuenta_clabe'],
});

// Schema específico para configuración de transferencia
export const TransferConfigSchema = z.object({
    banco: z.string().min(1, 'El nombre del banco es requerido').min(2, 'El nombre del banco debe tener al menos 2 caracteres'),
    beneficiario: z.string().min(1, 'El beneficiario es requerido').min(2, 'El beneficiario debe tener al menos 2 caracteres'),
    cuenta_clabe: z.string().regex(/^[0-9]{18}$/, { message: 'La CLABE debe tener exactamente 18 dígitos numéricos' }),
});

export type MetodoPagoForm = z.infer<typeof MetodoPagoSchema>;

// Schema para actualización masiva
export const MetodosPagoBulkSchema = z.object({
    metodos: z.array(MetodoPagoSchema),
});

export type MetodosPagoBulkForm = z.infer<typeof MetodosPagoBulkSchema>;
export type TransferConfigForm = z.infer<typeof TransferConfigSchema>;
