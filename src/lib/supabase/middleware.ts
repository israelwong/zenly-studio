/**
 * SUPABASE CLIENT PARA MIDDLEWARE
 * 
 * Lee y escribe cookies HTTP para sincronización con el cliente.
 * El middleware refresca automáticamente la sesión desde cookies.
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export function createClient(request: NextRequest, response: NextResponse) {
  // createServerClient de @supabase/ssr:
  // - Lee cookies HTTP del request
  // - Escribe cookies HTTP en la response
  // - Refresca automáticamente la sesión si es necesario
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Leer todas las cookies del request
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribir cookies en request y response
          // Esto sincroniza la sesión entre cliente y servidor
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  return { supabase, response }
}