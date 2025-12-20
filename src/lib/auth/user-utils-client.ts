"use client";

import { createClient } from '@/lib/supabase/browser';
import { getCurrentUserProfile } from '@/lib/actions/auth/user-profile.action';

/**
 * Obtener el usuario actual con su perfil (versión cliente)
 * @param studioSlug - Opcional: slug del studio para buscar el lead por studio_id
 */
export async function getCurrentUserClient(studioSlug?: string) {
    try {
        const supabase = createClient();

        // Obtener usuario de Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return null;
        }

        // Obtener perfil del usuario desde Server Action
        const profileResult = await getCurrentUserProfile(studioSlug);

        if (!profileResult.success || !profileResult.data) {
            return null;
        }

        const result = {
            id: user.id,
            email: user.email!,
            profile: profileResult.data,
        };

        return result;
    } catch (error) {
        console.error('[getCurrentUserClient] Error:', error);
        return null;
    }
}
