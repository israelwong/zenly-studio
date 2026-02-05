'use server';

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Gatekeeper Cross-Studio: verifica que el usuario autenticado sea miembro del studio (por slug).
 * Uso: llamar al inicio del layout de /[slug]/studio antes de cualquier data fetch.
 *
 * - Sin sesión -> redirect a login con returnUrl.
 * - Studio inexistente o inactivo -> notFound().
 * - Usuario no miembro (user_studio_roles) -> notFound() (seguridad por ofuscación).
 */
export async function assertStudioAccess(slug: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const returnPath = `/${slug}/studio`;
    redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }

  const studio = await prisma.studios.findUnique({
    where: { slug },
    select: { id: true, is_active: true },
  });

  if (!studio || !studio.is_active) {
    notFound();
  }

  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: user.id },
    select: { id: true },
  });

  if (!dbUser) {
    notFound();
  }

  const membership = await prisma.user_studio_roles.findFirst({
    where: {
      user_id: dbUser.id,
      studio_id: studio.id,
      is_active: true,
    },
    select: { id: true },
  });

  if (!membership) {
    notFound();
  }
}
