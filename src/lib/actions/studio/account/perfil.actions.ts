'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PerfilSchema } from '@/lib/actions/schemas/perfil-schemas';
import type { PerfilData } from '@/app/[slug]/studio/config/account/types';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@/lib/supabase/admin';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Record<string, string[]>;
  message?: string;
}

/**
 * Obtener perfil del usuario autenticado (users + studio_user_profiles para el estudio actual).
 */
export async function obtenerPerfil(studioSlug: string): Promise<ActionResult<PerfilData>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: user.id },
    });

    if (!dbUser) {
      return { success: false, error: 'Usuario no encontrado en la base de datos' };
    }

    const studioProfile = await prisma.studio_user_profiles.findFirst({
      where: { supabase_id: user.id, studio_id: studio.id },
    });

    const name =
      studioProfile?.full_name ?? dbUser.full_name ?? dbUser.email?.split('@')[0] ?? '';
    
    // ✅ Prioridad avatar: studio_user_profiles → users → metadatos de Supabase Auth (Google OAuth)
    const avatarUrl =
      (studioProfile?.avatar_url as string | undefined) ?? 
      (dbUser.avatar_url as string | undefined) ??
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined);

    const perfilData: PerfilData = {
      id: dbUser.id,
      name,
      email: dbUser.email,
      phone: dbUser.phone ?? '',
      avatarUrl: avatarUrl ?? undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    return { success: true, data: perfilData };
  } catch (error: unknown) {
    console.error('Error al obtener perfil:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Actualizar perfil del usuario (users + studio_user_profiles para el estudio actual).
 * No escribe user_metadata en Supabase Auth (avatar, nombre largo, etc. se consultan desde DB).
 * Solo role y studio_slug se guardan en JWT (signup/OAuth callback) para mantener el token pequeño.
 */
export async function actualizarPerfil(
  studioSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult<PerfilData>> {
  try {
    const validatedData = PerfilSchema.parse(data);

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: user.id },
    });

    if (!dbUser) {
      return { success: false, error: 'Usuario no encontrado en la base de datos' };
    }

    if (validatedData.email && validatedData.email !== dbUser.email) {
      const emailEnUso = await prisma.users.findFirst({
        where: { email: validatedData.email, id: { not: dbUser.id } },
      });
      if (emailEnUso) {
        return { success: false, error: 'Ya existe una cuenta con este correo electrónico' };
      }

      const supabaseAdmin = createAdminClient();
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const otroEnAuth = authUsers?.users.find(
        (u) => u.email === validatedData.email && u.id !== user.id
      );
      if (otroEnAuth) {
        return { success: false, error: 'Este correo electrónico ya está registrado en otra cuenta' };
      }

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: validatedData.email,
        email_confirm: true,
      });
      if (updateAuthError) {
        console.error('Error al actualizar correo en Supabase Auth:', updateAuthError);
        return { success: false, error: 'Error al actualizar el correo de autenticación' };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: dbUser.id },
        data: {
          full_name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          avatar_url: validatedData.avatarUrl ?? null,
        },
      });

      const profile = await tx.studio_user_profiles.findFirst({
        where: { supabase_id: user.id, studio_id: studio.id },
      });

      if (profile) {
        await tx.studio_user_profiles.update({
          where: { id: profile.id },
          data: {
            full_name: validatedData.name,
            email: validatedData.email,
            avatar_url: validatedData.avatarUrl ?? null,
          },
        });
      } else {
        await tx.studio_user_profiles.create({
          data: {
            supabase_id: user.id,
            studio_id: studio.id,
            email: validatedData.email,
            full_name: validatedData.name,
            avatar_url: validatedData.avatarUrl ?? null,
            role: 'SUSCRIPTOR',
          },
        });
      }
    });

    const updated = await prisma.users.findUnique({
      where: { id: dbUser.id },
    });
    const studioProfile = await prisma.studio_user_profiles.findFirst({
      where: { supabase_id: user.id, studio_id: studio.id },
    });

    if (!updated) {
      return { success: false, error: 'Error al leer perfil actualizado' };
    }

    const name =
      studioProfile?.full_name ?? updated.full_name ?? updated.email?.split('@')[0] ?? '';
    
    // ✅ Prioridad avatar: studio_user_profiles → users → metadatos de Supabase Auth (Google OAuth)
    const avatarUrl =
      (studioProfile?.avatar_url as string | undefined) ?? 
      (updated.avatar_url as string | undefined) ??
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined);

    const perfilData: PerfilData = {
      id: updated.id,
      name,
      email: updated.email,
      phone: updated.phone ?? '',
      avatarUrl: avatarUrl ?? undefined,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    revalidatePath(`/${studioSlug}/studio/config/account`);
    revalidatePath(`/${studioSlug}/studio/config/account/perfil`);
    revalidatePath(`/${studioSlug}/studio`, 'layout');

    return { success: true, data: perfilData, message: 'Perfil actualizado exitosamente' };
  } catch (error: unknown) {
    console.error('Error al actualizar perfil:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as unknown as { errors: Array<{ path: string[]; message: string }> };
      return {
        success: false,
        error: zodError.errors.reduce(
          (acc, err) => {
            acc[err.path[0]] = [err.message];
            return acc;
          },
          {} as Record<string, string[]>
        ),
      };
    }

    return { success: false, error: 'Error interno del servidor' };
  }
}
