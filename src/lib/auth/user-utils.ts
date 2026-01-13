import { createClient } from '@/lib/supabase/server'
import { UserRole, UserProfile, AuthUser } from '@/types/auth'

// =====================================================================
// FUNCIONES DE USUARIO Y ROLES
// =====================================================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error || !data) {
        return null
    }

    return data as UserProfile
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

    if (error || !data) {
        return null
    }

    return data as UserProfile
}

export async function createUserProfile(userData: {
    id: string
    email: string
    fullName?: string
    role: UserRole
    studioId?: string
}): Promise<UserProfile | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
            id: userData.id,
            email: userData.email,
            fullName: userData.fullName,
            role: userData.role,
            studioId: userData.studioId,
        }])
        .select()
        .single()

    if (error || !data) {
        console.error('Error creating user profile:', error)
        return null
    }

    return data as UserProfile
}

export async function updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
): Promise<UserProfile | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error || !data) {
        console.error('Error updating user profile:', error)
        return null
    }

    return data as UserProfile
}

export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const supabase = await createClient()

        // Obtener usuario de Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return null
        }

        // Obtener perfil del usuario
        const profile = await getUserProfile(user.id)

        if (!profile) {
            return null
        }

        return {
            id: user.id,
            email: user.email!,
            profile,
        }
    } catch (error) {
        // Si hay error al crear el cliente (por ejemplo, variables de entorno faltantes),
        // retornar null en lugar de lanzar el error
        console.warn('[getCurrentUser] Error al obtener usuario:', error instanceof Error ? error.message : error);
        return null
    }
}

export async function getUserStudio(userId: string) {
    const profile = await getUserProfile(userId)

    if (!profile || profile.role !== UserRole.SUSCRIPTOR || !profile.studioId) {
        return null
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('studios')
        .select('*')
        .eq('id', profile.studioId)
        .single()

    if (error || !data) {
        return null
    }

    return data
}

// =====================================================================
// FUNCIONES DE VALIDACIÓN
// =====================================================================

export function isValidRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole)
}

export function isSuperAdmin(profile: UserProfile): boolean {
    return profile.role === UserRole.SUPER_ADMIN
}

export function isAsesor(profile: UserProfile): boolean {
    return profile.role === UserRole.AGENTE
}

export function isSuscriptor(profile: UserProfile): boolean {
    return profile.role === UserRole.SUSCRIPTOR
}

export function canManageStudio(profile: UserProfile, studioId: string): boolean {
    if (isSuperAdmin(profile)) {
        return true
    }

    if (isSuscriptor(profile)) {
        return profile.studioId === studioId
    }

    return false
}

/**
 * Obtiene el usuario autenticado y su perfil
 * Útil para páginas que requieren autenticación
 */
export async function getAuthenticatedUser(slug?: string): Promise<AuthUser | null> {
    return await getCurrentUser();
}
