'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

/**
 * Obtener perfil del usuario actual para el header (users + studio_user_profiles).
 * Misma lógica que obtenerPerfil en perfil.actions.ts: studio_profile ?? users.
 * Fallback avatar: studio_user_profiles.avatar_url ?? users.avatar_url.
 */
export async function getCurrentUserProfile(studioSlug?: string) {
  try {
    if (!studioSlug || typeof studioSlug !== 'string' || studioSlug.trim() === '') {
      return { success: false, error: 'studioSlug inválido' };
    }

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
      return { success: false, error: 'Studio no encontrado' };
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

    const fullName =
      studioProfile?.full_name ??
      dbUser.full_name ??
      dbUser.email?.split('@')[0] ??
      'Usuario';
    
    // ✅ Prioridad avatar: studio_user_profiles → users → metadatos de Supabase Auth (Google OAuth)
    const avatarUrl =
      (studioProfile?.avatar_url as string | undefined) ??
      (dbUser.avatar_url as string | undefined) ??
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined);
    
    const normalizedAvatarUrl =
      avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== ''
        ? avatarUrl.trim()
        : null;

    return {
      success: true,
      data: {
        id: dbUser.id,
        email: dbUser.email,
        fullName,
        avatarUrl: normalizedAvatarUrl,
        phone: dbUser.phone ?? null,
        isActive: dbUser.is_active,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
      },
    };
  } catch {
    return { success: false, error: 'Error interno del servidor' };
  }
}
