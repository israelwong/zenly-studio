"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Cierra la sesión del usuario y redirige
 * 
 * @param redirectTo - Ruta opcional a donde redirigir (default: /login)
 * 
 * Nota: La limpieza de la preferencia "rememberMe" se hace en el cliente
 * porque requiere acceso a localStorage. El componente LogoutButton
 * maneja esto antes de llamar a esta función.
 */
export async function logout(redirectTo?: string) {
    try {
        const supabase = await createClient();
        
        // Obtener usuario antes de cerrar sesión para registrar el log
        const { data: { user } } = await supabase.auth.getUser();

        // Cerrar sesión en Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error al cerrar sesión:", error);
            throw new Error("Error al cerrar sesión");
        }

        console.log("✅ Sesión cerrada exitosamente");

        // Registrar logout en el log de accesos
        if (user) {
            try {
                const dbUser = await prisma.users.findUnique({
                    where: { supabase_id: user.id },
                });
                if (dbUser) {
                    // Detectar provider desde identities
                    const supabase = await createClient();
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    const identities = currentUser?.identities ?? [];
                    const hasGoogle = identities.some(i => i.provider === 'google');
                    const provider = hasGoogle ? 'google' : 'email';
                    
                    await prisma.user_access_logs.create({
                        data: {
                            user_id: dbUser.id,
                            action: 'logout',
                            success: true,
                            ip_address: 'N/A',
                            user_agent: 'N/A',
                            details: {
                                provider,
                                timestamp: new Date().toISOString(),
                            },
                        },
                    });
                }
            } catch (logError) {
                console.error('Error registrando log de logout:', logError);
            }
        }

        // Redirigir a la ruta especificada o al login por defecto
        // redirect() lanza NEXT_REDIRECT que es parte del funcionamiento normal de Next.js
        redirect(redirectTo || "/login");

    } catch (error) {
        // Verificar si es un error de redirección de Next.js (NEXT_REDIRECT)
        // Si es así, re-lanzarlo porque es parte del funcionamiento normal
        if (error && typeof error === 'object' && 'digest' in error) {
            const nextError = error as { digest?: string };
            if (nextError.digest?.startsWith('NEXT_REDIRECT')) {
                throw error; // Re-lanzar el error de redirección
            }
        }

        // Solo loggear errores reales, no redirecciones
        console.error("Error en logout:", error);
        // Aún así redirigir en caso de error real
        redirect(redirectTo || "/login");
    }
}
