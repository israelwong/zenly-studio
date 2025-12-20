import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDefaultRoute, UserRole } from '@/types/auth'

export default async function ProtectedPage() {
  const supabase = await createClient()

  // Verificar autenticación
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/login')
  }

  // Obtener información del usuario
  const user = data.claims
  const userRole = user.user_metadata?.role

  console.log('🔍 ProtectedPage - Usuario autenticado:', user.email)
  console.log('🔍 ProtectedPage - Rol del usuario:', userRole)

  // Si no hay rol, redirigir a login
  if (!userRole) {
    console.log('🔍 ProtectedPage - No se encontró rol, redirigiendo a login')
    redirect('/login')
  }

  // Determinar la ruta de destino según el rol
  let redirectPath: string

  switch (userRole) {
    case UserRole.SUPER_ADMIN:
    case 'super_admin':
      redirectPath = '/admin'
      break
    case UserRole.AGENTE:
    case 'agente':
      redirectPath = '/agente'
      break
    case UserRole.SUSCRIPTOR:
    case 'suscriptor':
      // Para suscriptores, necesitamos obtener el studio_slug
      const studioSlug = user.user_metadata?.studio_slug
      redirectPath = studioSlug ? `/${studioSlug}` : '/unauthorized'
      break
    default:
      redirectPath = '/unauthorized'
  }

  console.log('🔍 ProtectedPage - Redirigiendo a:', redirectPath)
  redirect(redirectPath)
}
