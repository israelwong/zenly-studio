import { z } from "zod";

// Enum para días de la semana
export const DiaSemanaSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

export type DiaSemana = z.infer<typeof DiaSemanaSchema>;

// Schema para crear horario
export const HorarioCreateSchema = z.object({
  day_of_week: DiaSemanaSchema,
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  is_active: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export type HorarioCreateForm = z.infer<typeof HorarioCreateSchema>;

// Schema para actualizar horario
export const HorarioUpdateSchema = z.object({
  id: z.string().cuid(),
  studio_slug: z.string().min(1),
  day_of_week: DiaSemanaSchema,
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  is_active: z.boolean(),
  order: z.number().int().min(0).optional(),
});

export type HorarioUpdateForm = z.infer<typeof HorarioUpdateSchema>;

// Schema para toggle estado
export const HorarioToggleSchema = z.object({
  id: z.string().cuid(),
  studio_slug: z.string().min(1),
  is_active: z.boolean(),
});

export type HorarioToggleForm = z.infer<typeof HorarioToggleSchema>;

// Schema para filtros
export const HorariosFiltersSchema = z.object({
  day_of_week: DiaSemanaSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
});

export type HorariosFiltersForm = z.infer<typeof HorariosFiltersSchema>;

// Schema para bulk update
export const HorariosBulkUpdateSchema = z.object({
  studio_slug: z.string().min(1),
  horarios: z.array(z.object({
    id: z.string().cuid(),
    day_of_week: DiaSemanaSchema,
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    is_active: z.boolean(),
    order: z.number().int().min(0),
  })),
});

export type HorariosBulkUpdateForm = z.infer<typeof HorariosBulkUpdateSchema>;

// Tipo para el horario completo
export interface Horario {
  id: string;
  day_of_week: string; // Cambiado de DiaSemana a string para mayor flexibilidad
  start_time: string;
  end_time: string;
  is_active: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

// Mapeo de días en español
export const DIAS_SEMANA_MAP = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
} as const;

// Opciones para formularios
export const DIAS_SEMANA_OPTIONS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
] as const;