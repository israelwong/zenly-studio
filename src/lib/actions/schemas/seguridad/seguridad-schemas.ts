import { z } from 'zod';

// ========================================
// SCHEMAS DE VALIDACIÓN - SEGURIDAD
// ========================================

// Schema para cambio de contraseña
export const PasswordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
        .string()
        .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
});

// Schema para configuraciones de seguridad
export const SecuritySettingsSchema = z.object({
    email_notifications: z.boolean(),
    device_alerts: z.boolean(),
    session_timeout: z.number().min(15).max(120) // Entre 15 y 120 minutos
});

// Schema para filtros de logs de acceso
export const AccessLogFiltersSchema = z.object({
    action: z.string().optional(),
    success: z.boolean().optional(),
    date_from: z.date().optional(),
    date_to: z.date().optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0)
});

// Tipos exportados
export type PasswordChangeForm = z.infer<typeof PasswordChangeSchema>;
export type SecuritySettingsForm = z.infer<typeof SecuritySettingsSchema>;
export type AccessLogFiltersForm = z.infer<typeof AccessLogFiltersSchema>;
