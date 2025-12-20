/**
 * STORAGE ADAPTER PARA SUPABASE
 * 
 * Respeta la preferencia "rememberMe" del usuario:
 * - Si rememberMe = true: usa localStorage (persistente)
 * - Si rememberMe = false: usa sessionStorage (se borra al cerrar navegador)
 * 
 * El adapter lee dinámicamente la preferencia en cada operación,
 * permitiendo cambiar el comportamiento sin recrear el cliente.
 */

const REMEMBER_ME_KEY = 'zen-remember-me'

export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const stored = localStorage.getItem(REMEMBER_ME_KEY)
    return stored === 'true'
  } catch {
    return false
  }
}

export function setRememberMePreference(value: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    if (value) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
  } catch {
    // Ignorar errores de localStorage
  }
}

export function clearRememberMePreference(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(REMEMBER_ME_KEY)
  } catch {
    // Ignorar errores
  }
}

/**
 * Storage adapter que respeta la preferencia rememberMe
 * Lee dinámicamente la preferencia en cada operación
 */
export function createRememberMeStorage(): Storage {
  return {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined') return null
      
      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        return storage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      if (typeof window === 'undefined') return
      
      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        storage.setItem(key, value)
      } catch {
        // Ignorar errores de storage
      }
    },
    removeItem: (key: string): void => {
      if (typeof window === 'undefined') return
      
      try {
        // Remover de ambos storages para asegurar limpieza completa
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch {
        // Ignorar errores
      }
    },
    get length(): number {
      if (typeof window === 'undefined') return 0
      
      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        return storage.length
      } catch {
        return 0
      }
    },
    clear(): void {
      if (typeof window === 'undefined') return
      
      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        storage.clear()
      } catch {
        // Ignorar errores
      }
    },
    key(index: number): string | null {
      if (typeof window === 'undefined') return null
      
      try {
        const rememberMe = getRememberMePreference()
        const storage = rememberMe ? localStorage : sessionStorage
        return storage.key(index)
      } catch {
        return null
      }
    },
  }
}

