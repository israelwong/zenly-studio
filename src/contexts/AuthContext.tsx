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
    console.log('[AuthContext] 🚀 Inicializando...')
    const supabase = createClient()
    
    // Debug: Ver qué hay en localStorage
    console.log('[AuthContext] 📦 localStorage keys:', 
      Object.keys(localStorage).filter(k => k.startsWith('sb-'))
    )
    
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[AuthContext] 🔍 Sesión inicial:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        email: session?.user?.email,
        hasMetadata: !!session?.user?.user_metadata,
        avatar: session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture,
        error: error?.message
      })
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] 🔄 Auth state change:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user,
        email: session?.user?.email 
      })
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Refrescar router cuando cambie la sesión
      if (event === 'SIGNED_IN') {
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

