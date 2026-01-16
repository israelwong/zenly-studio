/**
 * SUPABASE CLIENT - BROWSER
 * Cliente singleton para el navegador con persistencia automática
 * Respeta la preferencia "rememberMe" del usuario
 * 
 * IMPORTANTE: Para PKCE (OAuth), usa localStorage directamente sin storage adapter
 * para evitar interferencias con el flujo de Supabase
 */

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import { createRememberMeStorage } from './storage-adapter'
import { getSupabaseEnv } from './env'

let client: SupabaseClient | undefined
let clientForOAuth: SupabaseClient | undefined // Cliente separado para OAuth sin storage personalizado

/**
 * Sincroniza code_verifier de localStorage a cookies HTTP
 * Necesario porque createBrowserClient no sincroniza automáticamente
 */
let pkceSyncSetup = false
function setupPkceSync() {
  if (typeof window === 'undefined' || pkceSyncSetup) return
  pkceSyncSetup = true

  // Interceptar localStorage.setItem para sincronizar PKCE a cookies
  const originalSetItem = Storage.prototype.setItem
  Storage.prototype.setItem = function(key: string, value: string) {
    // Llamar al método original primero
    originalSetItem.call(this, key, value)

    // Si es una cookie de PKCE, sincronizar a cookies HTTP
    if (
      key.includes('code-verifier') &&
      key.startsWith('sb-') &&
      this === window.localStorage &&
      value && // Asegurar que el valor no esté vacío
      value.length > 0
    ) {
      const isSecure = window.location.protocol === 'https:'
      const secureFlag = isSecure ? '; Secure' : ''
      const maxAge = 60 * 10 // 10 minutos
      
      // CRÍTICO: NO usar encodeURIComponent - el navegador lo maneja automáticamente
      // Si codificamos manualmente, puede causar problemas al leer
      // El valor debe guardarse tal cual está en localStorage
      document.cookie = `${key}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`
      
      // Logs detallados para debugging
      console.log('🔐 [OAuth Client] Code verifier sincronizado automáticamente:', {
        key,
        valueLength: value.length,
        valuePreview: value.substring(0, 30) + '...',
        timestamp: new Date().toISOString(),
      })
      
      // Verificar que se guardó correctamente (leer sin decodificar)
      const cookieValue = document.cookie
        .split(';')
        .find(c => c.trim().startsWith(key + '='))
        ?.split('=')[1]
        ?.trim()
      
      if (!cookieValue) {
        console.error('❌ [OAuth Client] La cookie no se guardó correctamente - no se encontró en document.cookie')
        console.error('❌ [OAuth Client] Todas las cookies:', document.cookie)
      } else if (cookieValue !== value) {
        console.warn('⚠️ [OAuth Client] La cookie tiene un valor diferente:', {
          key,
          expectedLength: value.length,
          actualLength: cookieValue.length,
          expectedPreview: value.substring(0, 30),
          actualPreview: cookieValue.substring(0, 30),
        })
      } else {
        console.log('✅ [OAuth Client] Cookie verificada correctamente - valor coincide')
      }
    }
  }
}

/**
 * Cliente para operaciones OAuth (Calendar, Drive)
 * Usa localStorage directamente sin storage adapter para PKCE
 * Con sincronización automática a cookies HTTP
 */
export function createOAuthClient() {
  if (clientForOAuth) {
    return clientForOAuth
  }

  // Configurar sincronización automática de PKCE
  setupPkceSync()

  const { url, anonKey } = getSupabaseEnv()

  // Cliente sin storage adapter - Supabase maneja PKCE directamente
  clientForOAuth = createBrowserClient(
    url,
    anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // NO usar storage personalizado - Supabase maneja PKCE en localStorage directamente
      }
    }
  )

  return clientForOAuth
}

export function createClient() {
  // Si ya existe, devolverlo
  if (client) {
    return client
  }

  const { url, anonKey } = getSupabaseEnv()

  // Crear storage adapter que respeta preferencia rememberMe
  const storage = createRememberMeStorage()

  // Crear nuevo cliente con persistencia habilitada y storage personalizado
  client = createBrowserClient(
    url,
    anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: storage,
      }
    }
  )

  return client
}
