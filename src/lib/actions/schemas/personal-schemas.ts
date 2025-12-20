import { z } from 'zod';

// =============================================================================
// SCHEMAS PARA GESTIÓN DE PERSONAL SIMPLIFICADA
// =============================================================================

// Schema para crear personal - alineado exactamente con el modelo Prisma
export const createPersonalSchema = z.object({
  // Campos básicos requeridos
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  categoriaId: z.string().min(1, 'Categoría es requerida'),

  // Campos opcionales que existen en Prisma
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').optional().or(z.literal('')),
  tipo: z.enum(['OPERATIVO', 'ADMINISTRATIVO', 'PROVEEDOR']).optional(), // Se obtendrá de la categoría si no se proporciona
  status: z.enum(['activo', 'inactivo']).default('activo'),
  telefono_emergencia: z.string().optional().or(z.literal('')),
  cuenta_clabe: z.string().optional().or(z.literal('')),

  // Campos de integración opcionales
  platformUserId: z.string().optional(),
  honorarios_fijos: z.number().optional(),
  honorarios_variables: z.number().optional(),
  orden: z.number().optional(),

  // Campo virtual para manejar perfiles (no existe en Prisma)
  perfilesIds: z.array(z.string()).optional().default([])
});

// Schema para actualizar personal
export const updatePersonalSchema = createPersonalSchema.partial().extend({
  id: z.string().min(1, 'ID es requerido')
});

// Schema para crear categorías de personal
export const createCategoriaPersonalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre es demasiado largo'),
  descripcion: z.string().max(200, 'La descripción es demasiado larga').optional(),
  tipo: z.enum(['OPERATIVO', 'ADMINISTRATIVO', 'PROVEEDOR']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser un código hex válido').optional(),
  icono: z.string().max(50, 'Nombre del icono es demasiado largo').optional(),
  esDefault: z.boolean().default(false),
  orden: z.number().int().min(0, 'El orden no puede ser negativo').default(0),
  isActive: z.boolean().default(true)
});

// Schema para actualizar categorías
export const updateCategoriaPersonalSchema = createCategoriaPersonalSchema.partial().extend({
  id: z.string().min(1, 'ID es requerido')
});

// Schema para actualizar orden de categorías
export const updateOrdenCategoriasSchema = z.object({
  categorias: z.array(z.object({
    id: z.string(),
    orden: z.number().int().min(0)
  })).min(1, 'Debe haber al menos una categoría')
});

// =============================================================================
// SCHEMAS PARA PERFILES DE PERSONAL
// =============================================================================

// Schema para crear perfiles
export const createPerfilPersonalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre es demasiado largo'),
  descripcion: z.string().max(200, 'La descripción es demasiado larga').optional(),
  orden: z.number().int().min(0, 'El orden no puede ser negativo').default(0),
  isActive: z.boolean().default(true)
});

// Schema para actualizar perfiles
export const updatePerfilPersonalSchema = createPerfilPersonalSchema.partial().extend({
  id: z.string().min(1, 'ID es requerido')
});

// Schema para actualizar orden de perfiles
export const updateOrdenPerfilesSchema = z.object({
  perfiles: z.array(z.object({
    id: z.string(),
    orden: z.number().int().min(0)
  })).min(1, 'Debe haber al menos un perfil')
});

// =============================================================================
// TIPOS TYPESCRIPT
// =============================================================================

export type CreatePersonalData = z.infer<typeof createPersonalSchema>;
export type UpdatePersonalData = z.infer<typeof updatePersonalSchema>;
export type CreateCategoriaPersonalData = z.infer<typeof createCategoriaPersonalSchema>;
export type UpdateCategoriaPersonalData = z.infer<typeof updateCategoriaPersonalSchema>;
export type UpdateOrdenCategoriasData = z.infer<typeof updateOrdenCategoriasSchema>;
export type CreatePerfilPersonalData = z.infer<typeof createPerfilPersonalSchema>;
export type UpdatePerfilPersonalData = z.infer<typeof updatePerfilPersonalSchema>;
export type UpdateOrdenPerfilesData = z.infer<typeof updateOrdenPerfilesSchema>;

// Tipos de respuesta
export interface PersonalData {
  id: string;
  projectId: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  tipo: 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR';
  categoriaId: string;
  status: string;
  platformUserId?: string | null;
  honorarios_fijos?: number | null;
  honorarios_variables?: number | null;
  notas?: string | null;
  orden?: number | null;
  telefono_emergencia?: string | null;
  cuenta_clabe?: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoria: {
    id: string;
    nombre: string;
    tipo: 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR';
    color?: string | null;
    icono?: string | null;
  };
  platformUser?: {
    id: string;
    fullName?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface CategoriaPersonalData {
  id: string;
  projectId: string;
  nombre: string;
  descripcion?: string | null;
  tipo: 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR';
  color?: string | null;
  icono?: string | null;
  esDefault: boolean;
  orden: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    personal: number;
  };
}

export interface PerfilPersonalData {
  id: string;
  projectId: string;
  nombre: string;
  descripcion?: string | null;
  orden: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    personal_perfiles: number;
  };
}

// Respuestas de API
export interface PersonalListResponse {
  success: boolean;
  data?: PersonalData[];
  error?: string;
}

export interface CategoriaPersonalListResponse {
  success: boolean;
  data?: CategoriaPersonalData[];
  error?: string;
}

export interface PersonalResponse {
  success: boolean;
  data?: PersonalData;
  error?: string;
}

export interface CategoriaPersonalResponse {
  success: boolean;
  data?: CategoriaPersonalData;
  error?: string;
}