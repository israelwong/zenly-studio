// Ruta: app/admin/_lib/actions/agenda/agenda.schemas.ts

import { z } from 'zod';
import { AGENDA_STATUS } from '../../constants/status';

// Schema para crear una nueva agenda
export const AgendaCreateSchema = z.object({
    fecha: z.string()
        .min(1, 'La fecha es requerida'),

    hora: z.string()
        .min(1, 'La hora es requerida')
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),

    concepto: z.string()
        .min(2, 'El concepto debe tener al menos 2 caracteres')
        .max(200, 'El concepto no puede exceder 200 caracteres')
        .optional(),

    agendaTipo: z.enum(['Evento', 'Sesion', 'Cita virtual'])
        .refine((val) => val !== undefined, 'Debe seleccionar un tipo de agenda'),

    eventoId: z.string()
        .min(1, 'Debe seleccionar un evento'),

    userId: z.string()
        .min(1, 'Usuario requerido'),

    status: z.enum([
        AGENDA_STATUS.POR_CONFIRMAR,
        AGENDA_STATUS.PENDIENTE,
        AGENDA_STATUS.CONFIRMADO,
        AGENDA_STATUS.CANCELADO,
        AGENDA_STATUS.COMPLETADO,
        AGENDA_STATUS.REAGENDADO
    ])
        .default(AGENDA_STATUS.PENDIENTE),
});

// Schema para actualizar una agenda
export const AgendaUpdateSchema = AgendaCreateSchema.extend({
    id: z.string().min(1, 'ID requerido'),
}).partial().required({ id: true });

// Schema para búsqueda de agenda
export const AgendaBusquedaSchema = z.object({
    search: z.string().optional(),
    status: z.enum([
        AGENDA_STATUS.POR_CONFIRMAR,
        AGENDA_STATUS.PENDIENTE,
        AGENDA_STATUS.CONFIRMADO,
        AGENDA_STATUS.CANCELADO,
        AGENDA_STATUS.COMPLETADO,
        AGENDA_STATUS.REAGENDADO
    ]).optional(),
    agendaTipo: z.enum(['Evento', 'Sesion', 'Cita virtual']).optional(),
    eventoId: z.string().optional(),
    fechaDesde: z.string().optional(),
    fechaHasta: z.string().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
});

// Schema para cambiar status de agenda
export const AgendaStatusSchema = z.object({
    id: z.string().min(1, 'ID requerido'),
    status: z.enum([
        AGENDA_STATUS.POR_CONFIRMAR,
        AGENDA_STATUS.PENDIENTE,
        AGENDA_STATUS.CONFIRMADO,
        AGENDA_STATUS.CANCELADO,
        AGENDA_STATUS.COMPLETADO,
        AGENDA_STATUS.REAGENDADO
    ]),
});

// Tipos inferidos
export type AgendaCreateForm = z.infer<typeof AgendaCreateSchema>;
export type AgendaUpdateForm = z.infer<typeof AgendaUpdateSchema>;
export type AgendaBusquedaForm = z.infer<typeof AgendaBusquedaSchema>;
export type AgendaStatusForm = z.infer<typeof AgendaStatusSchema>;
