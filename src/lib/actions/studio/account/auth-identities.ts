'use server';

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
 */
export async function getAuthIdentities(): Promise<AuthIdentities | null> {
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
