'use server';

import { revalidatePath } from 'next/cache';
import { unstable_noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface AuthIdentities {
  hasPassword: boolean;
  hasGoogle: boolean;
  /** true si solo tiene Google (no puede cambiar contraseña) */
  googleOnly: boolean;
}

/**
 * Lee user.identities de la sesión de Supabase para saber si el usuario
 * tiene contraseña (email) y/o Google vinculados.
 * Usa unstable_noStore para evitar caché y leer datos frescos tras vinculación OAuth.
 */
export async function getAuthIdentities(): Promise<AuthIdentities | null> {
  unstable_noStore();
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const identities = user.identities ?? [];
  const hasPassword = identities.some((i) => i.provider === 'email');
  const hasGoogle = identities.some((i) => i.provider === 'google');
  const googleOnly = hasGoogle && !hasPassword;

  return { hasPassword, hasGoogle, googleOnly };
}

export type UnlinkGoogleResult = { success: true } | { success: false; error: string };

/**
 * Desvincula la identidad de Google del usuario actual.
 * Requiere que el usuario tenga otro método de acceso (contraseña); si solo tiene Google,
 * debe rechazarse en UI (googleOnly).
 */
export async function unlinkGoogleIdentity(studioSlug: string): Promise<UnlinkGoogleResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'No hay sesión activa' };
  }

  const identities = user.identities ?? [];
  const googleIdentity = identities.find((i) => i.provider === 'google');
  if (!googleIdentity) {
    return { success: false, error: 'No tienes cuenta de Google vinculada' };
  }

  const hasPassword = identities.some((i) => i.provider === 'email');
  if (!hasPassword) {
    return { success: false, error: 'No puedes desconectar Google porque es tu único método de acceso. Crea una contraseña primero.' };
  }

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
  if (unlinkError) {
    return { success: false, error: unlinkError.message };
  }

  revalidatePath(`/${studioSlug}/studio/config/account`);
  revalidatePath(`/${studioSlug}/studio`, 'layout');
  return { success: true };
}
