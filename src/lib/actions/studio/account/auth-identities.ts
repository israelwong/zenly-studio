'use server';

import { revalidatePath } from 'next/cache';
import { unstable_noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface AuthIdentities {
  hasPassword: boolean;
  hasGoogle: boolean;
  /** true si solo tiene Google (no puede cambiar contraseña) */
  googleOnly: boolean;
  /** Email de la cuenta de Google conectada (para mostrar en UI) */
  googleEmail: string | null;
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

  // DEBUG: ver exactamente qué devuelve Supabase para diagnosticar hasPassword
  console.log('--- DEBUG AUTH IDENTITY ---');
  console.log('User ID:', user.id);
  console.log('App Metadata:', JSON.stringify(user.app_metadata, null, 2));
  console.log('Identities Array:', JSON.stringify(user.identities, null, 2));
  console.log('---------------------------');

  const identities = user.identities ?? [];
  const appMetadata = (user.app_metadata ?? {}) as { providers?: string[] };
  const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
  const hasPassword =
    providers.includes('email') || identities.some((i) => i.provider === 'email');
  const hasGoogle =
    providers.includes('google') || identities.some((i) => i.provider === 'google');
  if (process.env.NODE_ENV === 'development') {
    console.log('[getAuthIdentities] User providers:', appMetadata.providers ?? 'none');
  }
  const googleOnly = hasGoogle && !hasPassword;
  const googleIdentity = identities.find((i) => i.provider === 'google');
  const googleEmail =
    (googleIdentity?.identity_data && typeof googleIdentity.identity_data === 'object' && 'email' in googleIdentity.identity_data)
      ? String((googleIdentity.identity_data as { email?: string }).email ?? '')
      : user.email ?? null;
  const googleEmailDisplay = googleEmail && googleEmail.length > 0 ? googleEmail : null;

  return { hasPassword, hasGoogle, googleOnly, googleEmail: googleEmailDisplay };
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

  const appMetadata = (user.app_metadata ?? {}) as { providers?: string[] };
  const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
  const hasPassword =
    providers.includes('email') || identities.some((i) => i.provider === 'email');
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
