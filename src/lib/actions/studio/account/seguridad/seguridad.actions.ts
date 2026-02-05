'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { PasswordChangeSchema, SetPasswordSchema, SecuritySettingsSchema } from '@/lib/actions/schemas/seguridad/seguridad-schemas';
import { revalidatePath } from 'next/cache';
import type { SecuritySettings, AccessLog, SecurityFormData } from '@/app/[slug]/studio/config/account/seguridad/types';

// ========================================
// TIPOS DE SEGURIDAD
// ========================================

interface SecurityActionDetails {
    ip_address?: string;
    user_agent?: string;
    settings?: Record<string, unknown>;
    action?: string;
    [key: string]: unknown;
}

// ========================================
// SERVER ACTIONS - SEGURIDAD
// ========================================

/**
 * Establecer contraseña para usuario que aún no tiene (ej. solo Google).
 * No requiere contraseña actual; Supabase updateUser({ password }) con sesión válida es suficiente.
 */
export async function establecerPassword(studioSlug: string, data: unknown) {
    try {
        const validatedData = SetPasswordSchema.parse(data);
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password: validatedData.newPassword,
        });

        if (updateError) {
            const userMessage = updateError.message?.includes('length') || updateError.message?.includes('characters')
                ? 'La contraseña no cumple los requisitos (mín. 8 caracteres, mayúscula, minúscula y número).'
                : updateError.message || 'Error al establecer la contraseña';
            return { success: false, error: userMessage };
        }

        await logSecurityAction(user.id, 'password_set', true, {});
        revalidatePath(`/${studioSlug}/studio/config/account`);
        return { success: true, message: 'Contraseña establecida. Ya puedes desconectar Google si lo deseas.' };
    } catch (error) {
        console.error('Error al establecer contraseña:', error);
        if (error instanceof Error && error.name === 'ZodError') {
            const zodError = error as unknown as { errors: Array<{ path: (string | number)[]; message: string }> };
            const msg = zodError.errors?.[0]?.message;
            return { success: false, error: msg || 'Datos inválidos' };
        }
        return { success: false, error: 'Error interno del servidor' };
    }
}

/**
 * Cambiar contraseña del usuario (requiere contraseña actual)
 */
export async function cambiarPassword(
    studioSlug: string,
    data: unknown
) {
    try {
        // Validar datos
        const validatedData = PasswordChangeSchema.parse(data);

        // Obtener usuario actual
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: 'Usuario no autenticado'
            };
        }

        // Verificar contraseña actual usando re-autenticación
        console.log('🔍 Verificando contraseña actual para:', user.email);

        // Crear una nueva instancia de Supabase para la verificación
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const verifySupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                }
            }
        );

        const { data: verifyData, error: verifyError } = await verifySupabase.auth.signInWithPassword({
            email: user.email!,
            password: validatedData.currentPassword
        });

        if (verifyError) {
            console.error('❌ Error al verificar contraseña:', verifyError.message);
            return {
                success: false,
                error: 'La contraseña actual es incorrecta'
            };
        }

        console.log('✅ Contraseña actual verificada correctamente');

        // Actualizar contraseña
        console.log('🔄 Actualizando contraseña...');
        const { error: updateError } = await supabase.auth.updateUser({
            password: validatedData.newPassword
        });

        if (updateError) {
            console.error('❌ Error al actualizar contraseña:', updateError.message);
            const userMessage = updateError.message?.includes('length') || updateError.message?.includes('characters')
                ? 'La nueva contraseña no cumple los requisitos de seguridad (mín. 8 caracteres, mayúscula, minúscula y número).'
                : updateError.message || 'Error al actualizar la contraseña';
            return { success: false, error: userMessage };
        }

        console.log('✅ Contraseña actualizada exitosamente');

        // Log del cambio de contraseña
        await logSecurityAction(user.id, 'password_change', true, {
            ip_address: 'N/A', // Se puede obtener del request
            user_agent: 'N/A'
        });

        revalidatePath(`/${studioSlug}/studio/config/account`);
        revalidatePath(`/${studioSlug}/studio/config/account/seguridad`);

        return {
            success: true,
            message: 'Contraseña actualizada exitosamente'
        };

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        if (error instanceof Error && error.name === 'ZodError') {
            const zodError = error as unknown as { errors: Array<{ path: (string | number)[]; message: string }> };
            const msg = zodError.errors?.[0]?.message;
            return { success: false, error: msg || 'Datos de contraseña inválidos' };
        }
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

/**
 * Obtener o crear usuario en la base de datos
 */
async function getOrCreateUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; email_confirmed_at?: string }) {
    // Buscar el usuario en nuestra tabla usando supabase_id
    let dbUser = await prisma.users.findUnique({
        where: { supabase_id: supabaseUser.id }
    });

    // Si no existe, buscar por email para ver si ya existe con otro supabase_id
    if (!dbUser) {
        const existingUser = await prisma.users.findUnique({
            where: { email: supabaseUser.email || 'no-email@example.com' }
        });

        if (existingUser) {
            // Usuario existe pero con diferente supabase_id, actualizar
            console.log('🔄 Actualizando supabase_id para usuario existente:', supabaseUser.email);
            dbUser = await prisma.users.update({
                where: { id: existingUser.id },
                data: {
                    supabase_id: supabaseUser.id,
                    full_name: (typeof supabaseUser.user_metadata?.full_name === 'string' ? supabaseUser.user_metadata.full_name : null) || existingUser.full_name,
                    email_verified: supabaseUser.email_confirmed_at ? true : existingUser.email_verified
                }
            });
            console.log('✅ Usuario actualizado:', dbUser.email);
        } else {
            // Usuario no existe, crear nuevo
            console.log('🔧 Creando usuario en base de datos:', supabaseUser.email);
            dbUser = await prisma.users.create({
                data: {
                    supabase_id: supabaseUser.id,
                    email: supabaseUser.email || 'no-email@example.com',
                    full_name: (typeof supabaseUser.user_metadata?.full_name === 'string' ? supabaseUser.user_metadata.full_name : null) || supabaseUser.email?.split('@')[0] || 'Usuario',
                    is_active: true,
                    email_verified: supabaseUser.email_confirmed_at ? true : false
                }
            });
            console.log('✅ Usuario creado:', dbUser.email);
        }
    }

    return dbUser;
}

/**
 * Obtener configuraciones de seguridad del usuario
 */
export async function obtenerConfiguracionesSeguridad(
    studioSlug: string
): Promise<SecuritySettings | null> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return null;
        }

        // Usar Promise.race para evitar bloqueos largos en queries de Prisma
        const dbUserPromise = getOrCreateUser(user);
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout obteniendo usuario')), 4000)
        );

        const dbUser = await Promise.race([dbUserPromise, timeoutPromise]);

        // Buscar configuraciones existentes con timeout
        const findSettingsPromise = prisma.user_security_settings.findUnique({
            where: { user_id: dbUser.id }
        });
        const findTimeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 3000)
        );

        let settings = await Promise.race([findSettingsPromise, findTimeoutPromise]);

        // Si no existen o fue timeout, usar upsert para evitar condición de carrera
        if (!settings) {
            try {
                // Usar upsert en lugar de create para evitar unique constraint error
                // Si existe, retorna el existente; si no, crea uno nuevo
                const upsertSettingsPromise = prisma.user_security_settings.upsert({
                    where: { user_id: dbUser.id },
                    update: {}, // No actualizar si ya existe
                    create: {
                        user_id: dbUser.id,
                        email_notifications: true,
                        device_alerts: true,
                        session_timeout: 30
                    }
                });
                const upsertTimeoutPromise = new Promise<null>((resolve) => 
                    setTimeout(() => resolve(null), 2000)
                );
                settings = await Promise.race([upsertSettingsPromise, upsertTimeoutPromise]);
            } catch (upsertError) {
                // Si falla el upsert, intentar obtener de nuevo por si otro proceso lo creó
                try {
                    settings = await prisma.user_security_settings.findUnique({
                        where: { user_id: dbUser.id }
                    });
                } catch (findError) {
                    // Si todo falla, retornar null (se usará default en el layout)
                    return null;
                }
            }
        }

        return settings;

    } catch (error) {
        // Silenciar errores de timeout para no bloquear el render
        if (error instanceof Error && error.message.includes('Timeout')) {
            return null;
        }
        console.error('Error al obtener configuraciones de seguridad:', error);
        return null;
    }
}

/**
 * Actualizar configuraciones de seguridad
 */
export async function actualizarConfiguracionesSeguridad(
    studioSlug: string,
    data: unknown
) {
    try {
        // Validar datos
        const validatedData = SecuritySettingsSchema.parse(data);

        // Obtener usuario actual
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: 'Usuario no autenticado'
            };
        }

        // Obtener o crear usuario en la base de datos
        const dbUser = await getOrCreateUser(user);

        // Actualizar o crear configuraciones
        const settings = await prisma.user_security_settings.upsert({
            where: { user_id: dbUser.id },
            update: {
                email_notifications: validatedData.email_notifications,
                device_alerts: validatedData.device_alerts,
                session_timeout: validatedData.session_timeout,
                updated_at: new Date()
            },
            create: {
                user_id: dbUser.id,
                email_notifications: validatedData.email_notifications,
                device_alerts: validatedData.device_alerts,
                session_timeout: validatedData.session_timeout
            }
        });

        // Log del cambio de configuraciones
        await logSecurityAction(dbUser.id, 'security_settings_updated', true, {
            settings: validatedData
        });

        revalidatePath(`/${studioSlug}/studio/config/account/seguridad`);

        return {
            success: true,
            data: settings,
            message: 'Configuraciones de seguridad actualizadas'
        };

    } catch (error) {
        console.error('Error al actualizar configuraciones:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

/**
 * Obtener historial de accesos del usuario
 */
export async function obtenerHistorialAccesos(
    studioSlug: string,
    limit: number = 20,
    offset: number = 0
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: 'Usuario no autenticado',
                data: []
            };
        }

        // Buscar el usuario en nuestra tabla usando supabase_id
        const dbUser = await prisma.users.findUnique({
            where: { supabase_id: user.id }
        });

        if (!dbUser) {
            return {
                success: false,
                error: 'Usuario no encontrado en la base de datos',
                data: []
            };
        }

        const logs = await prisma.user_access_logs.findMany({
            where: { user_id: dbUser.id },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset
        });

        return {
            success: true,
            data: logs
        };

    } catch (error) {
        console.error('Error al obtener historial de accesos:', error);
        return {
            success: false,
            error: 'Error interno del servidor',
            data: []
        };
    }
}

/**
 * Cerrar todas las sesiones excepto la actual
 */
export async function cerrarTodasLasSesiones(
    studioSlug: string
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                success: false,
                error: 'Usuario no autenticado'
            };
        }

        // Obtener o crear usuario en la base de datos
        const dbUser = await getOrCreateUser(user);

        // Supabase Auth no permite cerrar sesiones específicas
        // Solo podemos cerrar la sesión actual
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
            return {
                success: false,
                error: 'Error al cerrar sesiones'
            };
        }

        // Log del cierre de sesiones
        await logSecurityAction(dbUser.id, 'session_ended', true, {
            action: 'close_all_sessions'
        });

        return {
            success: true,
            message: 'Sesiones cerradas exitosamente'
        };

    } catch (error) {
        console.error('Error al cerrar sesiones:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

/**
 * Función auxiliar para loggear acciones de seguridad
 */
async function logSecurityAction(
    userId: string,
    action: string,
    success: boolean,
    details?: SecurityActionDetails
) {
    try {
        await prisma.user_access_logs.create({
            data: {
                user_id: userId,
                action,
                success,
                details: details ? JSON.parse(JSON.stringify(details)) : null,
                ip_address: details?.ip_address || 'N/A',
                user_agent: details?.user_agent || 'N/A'
            }
        });
    } catch (error) {
        console.error('Error al loggear acción de seguridad:', error);
    }
}
