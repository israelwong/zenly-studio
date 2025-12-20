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
        redirect(redirectTo || "/login");

    } catch (error) {
        console.error("Error en logout:", error);
        // Aún así redirigir en caso de error
        redirect(redirectTo || "/login");
    }
}
