'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/client';

const UpdatePerfilSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  phone: z.string()
    .regex(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos numéricos'),
  email: z.union([
    z.string().email('Email inválido'),
    z.literal(''),
  ]).optional(),
  address: z.string().max(500, 'La dirección no puede exceder 500 caracteres').optional().or(z.literal('')),
  avatar_url: z.union([
    z.string().url(),
    z.literal(''),
    z.null(),
  ]).optional(),
});

export async function actualizarPerfilCliente(
  slug: string,
  data: z.infer<typeof UpdatePerfilSchema>
): Promise<ApiResponse<{ name: string; phone: string; email: string | null; address: string | null; avatar_url: string | null }>> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('cliente-session');

    if (!session) {
      return {
        success: false,
        message: 'Sesión no encontrada',
      };
    }

    const clienteData = JSON.parse(session.value) as { id: string; studio_id: string; phone: string; email: string | null };

    const validatedData = UpdatePerfilSchema.parse(data);

    const contact = await prisma.studio_contacts.update({
      where: { id: clienteData.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email && validatedData.email.trim() !== '' 
          ? validatedData.email.trim() 
          : null,
        address: validatedData.address && validatedData.address.trim() !== '' 
          ? validatedData.address.trim() 
          : null,
        avatar_url: validatedData.avatar_url && validatedData.avatar_url.trim() !== '' 
          ? validatedData.avatar_url 
          : null,
      },
      select: {
        name: true,
        email: true,
        address: true,
        avatar_url: true,
        phone: true,
      },
    });

    // Actualizar cookie de sesión con datos actualizados
    cookieStore.set(
      'cliente-session',
      JSON.stringify({
        id: clienteData.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        studio_id: clienteData.studio_id,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        path: '/',
      }
    );

    revalidatePath(`/${slug}/cliente/${clienteData.id}`, 'layout');

    return {
      success: true,
      data: {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        avatar_url: contact.avatar_url,
      },
      message: 'Perfil actualizado exitosamente',
    };
  } catch (error) {
    console.error('[actualizarPerfilCliente] Error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0]?.message || 'Datos inválidos',
      };
    }

    return {
      success: false,
      message: 'Error al actualizar el perfil',
    };
  }
}

