"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

        // Cerrar sesión en Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error al cerrar sesión:", error);
            throw new Error("Error al cerrar sesión");
        }

        console.log("✅ Sesión cerrada exitosamente");

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
