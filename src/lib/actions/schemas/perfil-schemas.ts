import { z } from 'zod';

export const PerfilSchema = z.object({
    name: z.string()
        .min(1, 'El nombre es requerido')
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres'),

    email: z.string()
        .min(1, 'El correo electrónico es requerido')
        .email('Debe ser un correo electrónico válido')
        .max(255, 'El correo electrónico no puede exceder 255 caracteres'),

    phone: z.string()
        .min(1, 'El teléfono es requerido')
        .min(10, 'El teléfono debe tener al menos 10 dígitos')
        .max(20, 'El teléfono no puede exceder 20 caracteres')
        .regex(/^[\d\s\-\+\(\)]+$/, 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el símbolo +'),

    avatarUrl: z.string()
        .url('Debe ser una URL válida')
        .max(500, 'La URL del avatar no puede exceder 500 caracteres')
        .optional()
        .or(z.literal(''))
});

export type PerfilForm = z.infer<typeof PerfilSchema>;
