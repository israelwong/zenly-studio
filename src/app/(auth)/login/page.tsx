import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPathForUser } from '@/lib/auth/redirect-utils'
import { resolveRedirectFromDb, getStudioSlugBySupabaseId, getStudioSlugByOwnerId } from '@/lib/actions/auth/login.actions'
import { getDefaultRoute } from '@/types/auth'
import { LoginForm } from '@/components/forms/LoginForm'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'
import { SessionActiveCard } from '@/components/auth/session-active-card'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Si hay sesión válida, mostrar UI "Sesión Activa" (sin auto-redirect para evitar loops)
  if (user && !error) {
    let redirectPath = '/onboarding'

    // 1) Metadata (más rápido)
    const metaResult = getRedirectPathForUser(user)
    if (metaResult.shouldRedirect && metaResult.redirectPath && metaResult.redirectPath !== '/') {
      redirectPath = metaResult.redirectPath
    } else {
      // 2) DB: user_studio_roles / platform roles
      const dbPath = await resolveRedirectFromDb(user.id)
      if (dbPath && dbPath !== '/') {
        redirectPath = dbPath
      } else {
        // 3) Fallback: platform_user_profiles (slug por supabase_id)
        const profileSlug = await getStudioSlugBySupabaseId(user.id)
        if (profileSlug) {
          redirectPath = getDefaultRoute('suscriptor', profileSlug)
        } else {
          // 4) Fallback final: owner check (user_studio_roles.role = OWNER)
          const ownerSlug = await getStudioSlugByOwnerId(user.id)
          if (ownerSlug) {
            redirectPath = getDefaultRoute('suscriptor', ownerSlug)
          }
        }
      }
    }

    const continueHref = redirectPath.trim() !== '' ? redirectPath : '/onboarding'
    console.log('Login Page - continueHref (Continuar al Estudio):', continueHref)

    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
        <div className="w-full max-w-sm">
          <AuthHeader subtitle="Ya tienes una sesión activa" />
          <SessionActiveCard
            email={user.email ?? 'Usuario'}
            continueHref={continueHref}
          />
          <AuthFooter />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-zinc-950">
      <div className="w-full max-w-sm">
        <AuthHeader subtitle="Ingresa a tu cuenta para acceder al panel de administración" />
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        <AuthFooter />
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="h-4 w-48 bg-zinc-800 rounded" />
      </div>
      <div className="space-y-4">
        <div className="h-10 w-full bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-zinc-800 rounded" />
      </div>
    </div>
  )
}

