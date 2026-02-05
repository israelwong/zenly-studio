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
    
    // ✅ Prioridad: DB → user_metadata → identities (Google picture tras linkIdentity suele estar en identity_data).
    const avatarCandidates: (string | null | undefined)[] = [
      studioProfile?.avatar_url,
      dbUser?.avatar_url,
      (user.user_metadata as Record<string, unknown>)?.avatar_url,
      (user.user_metadata as Record<string, unknown>)?.picture,
    ];
    const identities = user.identities ?? [];
    for (const id of identities) {
      const data = id.identity_data as { picture?: string; avatar_url?: string } | undefined;
      if (data?.picture) avatarCandidates.push(data.picture);
      if (data?.avatar_url) avatarCandidates.push(data.avatar_url);
    }
    const normalizedAvatarUrl = (() => {
      for (const c of avatarCandidates) {
        if (c != null && typeof c === 'string' && c.trim() !== '') return c.trim();
      }
      return null;
    })();

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
