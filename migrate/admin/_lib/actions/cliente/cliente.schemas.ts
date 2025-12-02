import { z } from 'zod'

// Schema base para cliente
export const ClienteBaseSchema = z.object({
    id: z.string().optional(),
    nombre: z.string().min(1, 'Nombre es requerido'),
    telefono: z.string().nullable(),
    email: z.string().email('Email inválido').or(z.literal('')).nullable(),
    direccion: z.string().nullable(),
    status: z.string().default('prospecto'),
    canalId: z.string().nullable(),
    userId: z.string().nullable(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
})

// Schema para actualizar cliente
export const ActualizarClienteSchema = z.object({
    id: z.string().min(1, 'ID es requerido'),
    nombre: z.string().min(1, 'Nombre es requerido'),
    telefono: z.string().nullable(),
    email: z.string().email('Email inválido').or(z.literal('')).nullable(),
    direccion: z.string().nullable(),
    status: z.string(),
    canalId: z.string().nullable().transform(val => {
        // Convertir cadenas vacías, espacios en blanco, o valores inválidos a null
        if (val === null || val === undefined) {
            return null;
        }
        const trimmed = val.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
            return null;
        }
        return trimmed;
    })
})

// Schema para cliente completo
export const ClienteCompletoSchema = ClienteBaseSchema.extend({
    id: z.string().min(1, 'ID es requerido'),
    createdAt: z.date(),
    updatedAt: z.date(),
    Canal: z.object({
        nombre: z.string()
    }).nullable()
})

// Tipos derivados
export type ClienteBase = z.infer<typeof ClienteBaseSchema>
export type ActualizarCliente = z.infer<typeof ActualizarClienteSchema>
export type ClienteCompleto = z.infer<typeof ClienteCompletoSchema>
