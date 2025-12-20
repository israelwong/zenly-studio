'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { getDefaultRoute } from '@/types/auth'
import { RedirectLoading } from '@/components/auth/redirect-loading'

export default function RedirectPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasRedirected, setHasRedirected] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Prevenir múltiples ejecuciones
        if (hasRedirected) {
            console.log('🔍 Redirect - Ya se redirigió, ignorando re-ejecución')
            return
        }

        const handleRedirect = async () => {
            try {
                const supabase = createClient()

                // Obtener el usuario autenticado
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    console.log('🔍 Redirect - Usuario no autenticado, redirigiendo a login')
                    router.push('/login')
                    return
                }

                console.log('🔍 Redirect - Usuario ID:', user.id)
                console.log('🔍 Redirect - User metadata:', user.user_metadata)

                // Obtener el rol del usuario desde user_metadata
                let userRole = user.user_metadata?.role

                // Si no hay rol, intentar detectar por email (fallback para super admin)
                if (!userRole) {
                    console.log('🔍 Redirect - No se encontró rol en metadata, verificando por email...')

                    // Lista de emails de super admin (fallback)
                    const superAdminEmails = ['admin@prosocial.mx']

                    if (superAdminEmails.includes(user.email || '')) {
                        console.log('🔍 Redirect - Detectado super admin por email:', user.email)
                        userRole = 'super_admin'
                    } else {
                        console.log('🔍 Redirect - No se pudo determinar el rol, redirigiendo a login')
                        router.push('/login?error=no-role')
                        return
                    }
                }

                console.log('🔍 Redirect - Rol encontrado:', userRole)

                // Redirigir según el rol del usuario
                let redirectPath: string

                // Para suscriptores, necesitamos obtener el slug del studio
                if (userRole === 'suscriptor') {
                    // Obtener el slug del studio desde user_metadata
                    const studioSlug = user.user_metadata?.studio_slug
                    if (studioSlug) {
                        console.log('🔍 Redirect - Studio slug encontrado:', studioSlug)
                        redirectPath = getDefaultRoute(userRole, studioSlug)
                    } else {
                        console.log('🔍 Redirect - No se encontró studio_slug para suscriptor')
                        router.push('/unauthorized')
                        return
                    }
                } else {
                    // Para otros roles (super_admin, agente), no necesitan slug
                    redirectPath = getDefaultRoute(userRole)
                }

                console.log('🔍 Redirect - Redirigiendo a:', redirectPath)

                // Marcar como redirigido para prevenir re-ejecuciones
                setHasRedirected(true)

                // Esperar a que la sesión se sincronice completamente
                // Luego usar router.push para evitar hard refresh que causa race condition
                setTimeout(() => {
                    router.push(redirectPath)
                    router.refresh()
                }, 1500)

            } catch (err) {
                console.error('🔍 Redirect - Error:', err)
                setError('Error al procesar la redirección')
                setIsLoading(false)
            }
        }

        handleRedirect()
    }, [router, hasRedirected])

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                    <p className="text-zinc-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Volver al Login
                    </button>
                </div>
            </div>
        )
    }

    return <RedirectLoading />
}
