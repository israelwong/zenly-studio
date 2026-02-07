import { z } from 'zod';

// =============================================================================
// SCHEMAS PARA GESTIÓN DE CONTACTOS (PROSPECTOS)
// =============================================================================

export const createContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().max(200, 'La dirección es demasiado larga').optional().or(z.literal('')),
  avatar_url: z.string().url('URL inválida').optional().or(z.literal('')),
  status: z.enum(['prospecto', 'cliente']).default('prospecto'),
  acquisition_channel_id: z.string().optional(),
  social_network_id: z.string().optional(),
  referrer_contact_id: z.string().optional(),
  referrer_name: z.string().max(100, 'Nombre del referente es demasiado largo').optional().or(z.literal('')),
  notes: z.string().max(500, 'Las notas son demasiado largas').optional().or(z.literal(''))
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().min(1, 'ID es requerido'),
  event_id: z.string().optional(), // Para revalidar detalle del evento tras actualizar contacto
});

export const getContactsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['prospecto', 'cliente', 'all']).default('all'),
  acquisition_channel_id: z.string().optional()
});

// =============================================================================
// TYPES
// =============================================================================

export type CreateContactData = z.infer<typeof createContactSchema>;
export type UpdateContactData = z.infer<typeof updateContactSchema>;
export type GetContactsParams = z.infer<typeof getContactsSchema>;

export interface Contact {
  id: string;
  studio_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  avatar_url: string | null;
  status: string;
  acquisition_channel_id: string | null;
  social_network_id: string | null;
  referrer_contact_id: string | null;
  referrer_name: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  acquisition_channel?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
  social_network?: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  } | null;
  referrer_contact?: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

export interface ContactsListResponse {
  success: boolean;
  data?: {
    contacts: Contact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

export interface ContactResponse {
  success: boolean;
  data?: Contact;
  error?: string;
}

