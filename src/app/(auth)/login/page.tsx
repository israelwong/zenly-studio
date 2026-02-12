import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPathForUser } from '@/lib/auth/redirect-utils'
import { resolveRedirectFromDb, getStudioSlugBySupabaseId, getStudioSlugByOwnerId } from '@/lib/actions/auth/login.actions'
import { getDefaultRoute } from '@/types/auth'
import { LoginForm } from '@/components/forms/LoginForm'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthFooter } from '@/components/auth/auth-footer'

function isValidCallbackUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  const params = searchParams ? await searchParams : {}
  const callbackUrlParam = params?.callbackUrl
  const callbackUrl = typeof callbackUrlParam === 'string' && isValidCallbackUrl(callbackUrlParam)
    ? callbackUrlParam
    : null

  // Si hay sesión válida, redirigir directo al studio/dashboard (o callbackUrl si existe)
  if (user && !error) {
    let redirectPath = callbackUrl ?? '/onboarding'

    if (!callbackUrl) {
      const metaResult = getRedirectPathForUser(user)
      if (metaResult.shouldRedirect && metaResult.redirectPath && metaResult.redirectPath !== '/') {
        redirectPath = metaResult.redirectPath
      } else {
        const dbPath = await resolveRedirectFromDb(user.id)
        if (dbPath && dbPath !== '/') {
          redirectPath = dbPath
        } else {
          const profileSlug = await getStudioSlugBySupabaseId(user.id)
          if (profileSlug) {
            redirectPath = getDefaultRoute('suscriptor', profileSlug)
          } else {
            const ownerSlug = await getStudioSlugByOwnerId(user.id)
            if (ownerSlug) {
              redirectPath = getDefaultRoute('suscriptor', ownerSlug)
            }
          }
        }
      }
    }

    const target = redirectPath.trim() !== '' ? redirectPath : '/onboarding'
    redirect(target)
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

