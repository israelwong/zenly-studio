'use client'

/**
 * LOGIN FORM - Login por contraseña u OAuth.
 * Redirección resuelta desde user_metadata o desde DB (user_studio_roles) si falta metadata.
 */

import { useState, FormEvent, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getOAuthOrigin } from '@/lib/supabase/browser'
import { setRememberMePreference, getRememberMePreference } from '@/lib/supabase/storage-adapter'
import { loginAction } from '@/lib/actions/auth/login.actions'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { ZenButton } from '@/components/ui/zen'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Mostrar errores que vienen en la URL (p. ej. tras OAuth)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'restricted') {
      setError('Acceso restringido. El registro de nuevos estudios estará disponible próximamente.')
    } else if (errorParam === 'timeout') {
      setError('El proceso de autenticación expiró o fue usado. Por favor intenta nuevamente.')
    } else if (errorParam === 'auth_failed') {
      setError('Error al autenticar con Google. Por favor intenta nuevamente.')
    } else if (errorParam === 'missing_verifier') {
      setError('Error técnico en la autenticación. Limpia el caché del navegador e intenta nuevamente.')
    }
  }, [searchParams])

  // Limpieza de sesión zombie: si hay error en URL (restricted, oauth_cancelled, etc.), cerrar sesión para que el siguiente login sea limpio
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      createClient().auth.signOut().catch(() => {})
    }
  }, [searchParams])

  // Cargar preferencia guardada al montar
  useEffect(() => {
    setRememberMe(getRememberMePreference())
  }, [])

  async function handleGoogleSignIn() {
    // Prevenir clics múltiples
    if (googleLoading) {
      console.log('[OAuth] ⚠️ Ya hay un proceso de OAuth en curso')
      return
    }

    setError('')
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      
      // NO hacer signOut - interfiere con el code_verifier
      // Solo limpiar sesiones expiradas si es necesario
      
      const origin = getOAuthOrigin()
      const currentPath = window.location.pathname + window.location.search
      // Redirigir directamente al callback del servidor (Supabase maneja PKCE internamente)
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(currentPath)}`

      console.log('[OAuth] 🚀 ONE-SHOT: Iniciando flujo de autenticación con Google')
      console.log('[OAuth] localStorage antes de OAuth:', {
        length: localStorage.length,
        keys: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)),
      })

      const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      })

      if (oauthError) {
        console.error('[OAuth] ❌ Error iniciando OAuth:', oauthError)
        setError(oauthError.message)
        setGoogleLoading(false)
        return
      }

      // Verificar que se generó el code_verifier antes de la redirección
      if (oauthData?.url) {
        console.log('[OAuth] ✅ URL de OAuth generada:', oauthData.url.substring(0, 100) + '...')
        
        // Esperar un momento para que el interceptor de localStorage se ejecute
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log('[OAuth] localStorage después de OAuth:', {
          length: localStorage.length,
          keys: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)),
        })
      }
      
      // No hacer setGoogleLoading(false) aquí - la redirección ocurre automáticamente
    } catch (err) {
      console.error('[OAuth] ❌ Error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión con Google'
      )
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      setRememberMePreference(rememberMe)

      const result = await loginAction(email, password)

      if (!result.success) {
        setError(result.error ?? 'Error al iniciar sesión')
        setLoading(false)
        return
      }

      if (result.redirectTo) {
        window.location.href = result.redirectTo
      } else {
        setError('No se pudo determinar la ruta de redirección')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-zinc-100">Iniciar Sesión</CardTitle>
        <CardDescription className="text-zinc-400">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
              <Link href="/forgot-password" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={loading}
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-normal cursor-pointer text-zinc-400"
            >
              Mantener sesión iniciada
            </Label>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/20 p-3 rounded border border-red-900/20">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
            disabled={loading || googleLoading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900/50 px-2 text-zinc-500">O</span>
            </div>
          </div>

          <ZenButton
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            loading={googleLoading}
            loadingText="Conectando con Google..."
            className="w-full"
          >
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </ZenButton>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            disabled={loading}
          >
            Cancelar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

