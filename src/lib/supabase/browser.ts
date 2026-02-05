/**
 * SUPABASE CLIENT - BROWSER
 * Cliente singleton para el navegador.
 * Usa cookies (document.cookie) para que la sesión coincida con la del servidor/proxy.
 * Así getSession() y linkIdentity() ven la misma sesión que el proxy escribió en la respuesta.
 */

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

let client: SupabaseClient | undefined

function getBrowserCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined' || !document.cookie) return []
  return document.cookie.split(';').map((s) => {
    const [name, ...v] = s.trim().split('=')
    return { name: name ?? '', value: v.join('=').trim() }
  }).filter((c) => c.name.length > 0)
}

function setBrowserCookies(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
  const base = { path: '/', sameSite: 'lax' as const, secure: typeof window !== 'undefined' && window.location?.protocol === 'https:' }
  cookiesToSet.forEach(({ name, value, options }) => {
    const opts = { ...base, ...options }
    let cookie = `${name}=${value}; path=${opts.path}; samesite=${opts.sameSite}`
    if (opts.secure) cookie += '; secure'
    if (opts.maxAge != null) cookie += `; max-age=${opts.maxAge}`
    if (opts.expires) cookie += `; expires=${opts.expires}`
    document.cookie = cookie
  })
}

/**
 * Origen para redirectTo de OAuth. Usa localhost en lugar de 127.0.0.1
 * para no duplicar cookies entre ambos hosts.
 */
export function getOAuthOrigin(): string {
  if (typeof window === 'undefined') return ''
  const { hostname, port, protocol } = window.location
  if (hostname === '127.0.0.1') {
    return `${protocol}//localhost${port ? ':' + port : ''}`
  }
  return window.location.origin
}

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getBrowserCookies()
        },
        setAll(cookiesToSet) {
          setBrowserCookies(cookiesToSet)
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )

  return client
}
