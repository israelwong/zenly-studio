import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

// ✅ SINGLETON: Cliente para componentes del cliente (navegador)
// Patrón Singleton estricto para evitar múltiples instancias
let clientInstance: SupabaseClient | undefined

export const createClientSupabase = (): SupabaseClient => {
    // ✅ SINGLETON: Reutilizar instancia existente
    if (clientInstance) {
        return clientInstance
    }
    
    // ✅ SINGLETON: Crear solo una vez (misma env que browser.ts para evitar crash en prod)
    clientInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    return clientInstance
}