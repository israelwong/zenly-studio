'use client'

/**
 * AUTH CONTEXT - VERSIÓN LIMPIA
 * Solo maneja estado de sesión, sin lógica compleja
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth event:', event)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Refrescar router cuando cambie la sesión
      if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] Usuario cerró sesión')
        // No hacemos router.refresh() aquí porque el server action ya redirige
      } else if (event === 'SIGNED_IN') {
        console.log('[AuthContext] Usuario inició sesión')
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

