'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Genera la URL de OAuth para vincular Google al usuario actual.
 * Se ejecuta en el servidor para usar la sesión de las cookies (httpOnly), evitando
 * tokens obsoletos en el cliente y errores "invalid claim".
 */
export async function generateGoogleLinkUrl(redirectTo: string): Promise<{ url: string | null; error: string | null }> {
  try {
    if (!redirectTo || typeof redirectTo !== 'string' || redirectTo.trim() === '') {
      return { url: null, error: 'redirectTo es requerido' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: redirectTo.trim() },
    });

    if (error) {
      return { url: null, error: error.message };
    }

    const url = data?.url ?? null;
    return { url, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { url: null, error: message };
  }
}
