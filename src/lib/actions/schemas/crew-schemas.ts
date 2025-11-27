import { z } from 'zod';
import { PersonalType } from '@prisma/client';

/**
 * Schema para crear crew member
 */
export const CrewMemberCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .optional()
    .or(z.literal('')),

  tipo: z.enum(['OPERATIVO', 'ADMINISTRATIVO', 'PROVEEDOR'], {
    errorMap: () => ({ message: 'Tipo de personal inválido' }),
  }),

  fixed_salary: z
    .number()
    .positive('El salario fijo debe ser mayor a 0')
    .optional()
    .nullable(),

  variable_salary: z
    .number()
    .positive('El salario variable debe ser mayor a 0')
    .optional()
    .nullable(),

  skill_ids: z
    .array(z.string().cuid())
    .optional(),
});

export type CrewMemberCreateInput = z.infer<typeof CrewMemberCreateSchema>;

/**
 * Schema para actualizar crew member
 */
export const CrewMemberUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .optional()
    .or(z.literal('')),

  tipo: z.enum(['OPERATIVO', 'ADMINISTRATIVO', 'PROVEEDOR'], {
    errorMap: () => ({ message: 'Tipo de personal inválido' }),
  }),

  fixed_salary: z
    .number()
    .positive('El salario fijo debe ser mayor a 0')
    .optional()
    .nullable(),

  variable_salary: z
    .number()
    .positive('El salario variable debe ser mayor a 0')
    .optional()
    .nullable(),

  skill_ids: z
    .array(z.string().cuid())
    .optional(),
});

export type CrewMemberUpdateInput = z.infer<typeof CrewMemberUpdateSchema>;

/**
 * Schema para crear skill
 */
export const CrewSkillCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),

  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color en formato hex válido')
    .optional()
    .or(z.literal('')),

  icono: z
    .string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
});

export type CrewSkillCreateInput = z.infer<typeof CrewSkillCreateSchema>;

/**
 * Schema para actualizar skill
 */
export const CrewSkillUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),

  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color en formato hex válido')
    .optional()
    .or(z.literal('')),

  icono: z
    .string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
});

export type CrewSkillUpdateInput = z.infer<typeof CrewSkillUpdateSchema>;

/**
 * Schema para crear crew account (para panel personal)
 */
export const CrewAccountCreateSchema = z.object({
  email: z
    .string()
    .email('Email inválido'),
});

export type CrewAccountCreateInput = z.infer<typeof CrewAccountCreateSchema>;

