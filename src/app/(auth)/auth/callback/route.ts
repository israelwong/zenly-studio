import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  procesarUsuarioOAuth,
  vincularRecursoGoogle,
} from '@/lib/actions/auth/oauth.actions';

/**
 * Callback de Supabase Auth OAuth
 * Distingue entre:
 * - Login de Usuario: Crea/actualiza usuario y opcionalmente guarda tokens
 * - Vinculación de Recurso: Solo actualiza tokens del Studio (independiente de cuenta de sesión)
 */
/**
 * Valida que una URL sea interna (seguridad contra Open Redirect)
 * Solo permite rutas relativas que empiecen con /
 */
function isValidInternalUrl(url: string | null): boolean {
  if (!url) return false;
  
  // Decodificar si está codificado
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    return false;
  }
  
  // Debe empezar con / (ruta relativa interna)
  if (!decodedUrl.startsWith('/')) return false;
  
  // No debe contener protocolos (http://, https://, etc.)
  if (decodedUrl.includes('://')) return false;
  
  // No debe contener caracteres peligrosos
  if (decodedUrl.includes('<') || decodedUrl.includes('>') || decodedUrl.includes('javascript:')) {
    return false;
  }
  
  // No debe ser una URL absoluta externa
  try {
    // Intentar parsear como URL absoluta
    const parsed = new URL(decodedUrl);
    // Si tiene hostname y no es localhost, es externa
    if (parsed.hostname && parsed.hostname !== 'localhost') {
      return false;
    }
  } catch {
    // Si falla el parseo como URL absoluta, es una ruta relativa (válida)
  }
  
  return true;
}

/**
 * Obtiene la URL de destino segura (next) o fallback
 */
function getSafeRedirectUrl(
  next: string | null,
  fallback: string,
  request: NextRequest
): string {
  if (next && isValidInternalUrl(next)) {
    return next;
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const next = searchParams.get('next'); // URL de origen para redirección
  const type = searchParams.get('type'); // Tipo de flujo: 'link_resource' o null (login)
  const studioSlug = searchParams.get('studioSlug'); // Slug del studio (solo para link_resource)

  // Debug: Log de parámetros recibidos
  console.log('[OAuth Callback] Parámetros recibidos:', {
    hasCode: !!code,
    hasError: !!error,
    next,
    type,
    studioSlug,
  });

  // Manejar error de OAuth (usuario canceló)
  if (error) {
    console.error('[OAuth Callback] Error de Google:', error);
    
    // Si es una vinculación de recurso, redirigir al studio
    if (type === 'link_resource' && studioSlug) {
      const redirectPath = getSafeRedirectUrl(
        next,
        `/${studioSlug}/studio/config/integraciones`,
        request
      );
      
      return NextResponse.redirect(
        new URL(
          `${redirectPath}?error=oauth_cancelled`,
          request.url
        )
      );
    }
    
    // Para login: usar next si es válido, sino redirigir a login
    const loginRedirect = getSafeRedirectUrl(next, '/login', request);
    return NextResponse.redirect(
      new URL(`${loginRedirect}?error=oauth_cancelled`, request.url)
    );
  }

  // Validar que tenemos código
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', request.url)
    );
  }

  try {
    // IMPORTANTE: Para vinculación de recurso, guardar cookies originales antes de exchangeCodeForSession
    // porque exchangeCodeForSession sobrescribe las cookies con una sesión temporal
    let originalCookies: { name: string; value: string }[] = [];
    if (type === 'link_resource') {
      // Guardar todas las cookies de sesión originales
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
          originalCookies.push({ name: cookie.name, value: cookie.value });
        }
      });
      console.log('[OAuth Callback] Cookies originales guardadas:', originalCookies.length);
    }

    const supabase = await createClient();

    // Intercambiar código por sesión
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error(
        '[OAuth Callback] Error intercambiando código:',
        exchangeError
      );
      const loginRedirect = getSafeRedirectUrl(next, '/login', request);
      return NextResponse.redirect(
        new URL(`${loginRedirect}?error=auth_failed`, request.url)
      );
    }

    if (!data.user || !data.session) {
      console.error('[OAuth Callback] No se pudo obtener usuario o sesión');
      const loginRedirect = getSafeRedirectUrl(next, '/login', request);
      return NextResponse.redirect(
        new URL(`${loginRedirect}?error=auth_failed`, request.url)
      );
    }

    // Verificar si es una vinculación de recurso (no login)
    // Usar parámetros de URL en lugar de state personalizado
    if (type === 'link_resource' && studioSlug) {
      console.log('[OAuth Callback] Flujo de vinculación de recurso:', {
        type,
        studioSlug,
        next,
      });

      // FLUJO: Vinculación de Recurso a Studio
      // No crea usuario, solo actualiza tokens del Studio
      const result = await vincularRecursoGoogle(
        studioSlug,
        data.session
      );

      if (!result.success) {
        console.log('[OAuth Callback] Error en vinculación, next URL:', next);
        
        const redirectPath = getSafeRedirectUrl(
          next,
          `/${studioSlug}/studio/config/integraciones`,
          request
        );
        
        console.log('[OAuth Callback] Redirigiendo a (error):', redirectPath);
        
        return NextResponse.redirect(
          new URL(
            `${redirectPath}?error=${encodeURIComponent(
              result.error || 'Error al vincular recurso'
            )}`,
            request.url
          )
        );
      }

      // Redirigir a página de origen con éxito (o dashboard como fallback)
      console.log('[OAuth Callback] Vinculación exitosa:', {
        next,
        studioSlug,
      });
      
      // Validar y obtener URL segura de redirección
      const redirectPath = getSafeRedirectUrl(
        next,
        `/${studioSlug}/studio/dashboard`, // Fallback al dashboard del studio
        request
      );
      
      console.log('[OAuth Callback] Redirigiendo a (éxito):', redirectPath);
      
      // Construir URL completa con parámetro de éxito
      const redirectUrl = new URL(redirectPath, request.url);
      redirectUrl.searchParams.set('success', 'google_connected');
      
      // IMPORTANTE: Restaurar cookies originales para mantener la sesión del usuario
      // El OAuth creó una sesión temporal que sobrescribió las cookies originales
      const response = NextResponse.redirect(redirectUrl);
      
      if (originalCookies.length > 0) {
        console.log('[OAuth Callback] Restaurando cookies originales del usuario');
        // Restaurar cada cookie original
        originalCookies.forEach(cookie => {
          response.cookies.set(cookie.name, cookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        });
      }
      
      return response;
    }

    // FLUJO: Login de Usuario (flujo normal)
    // Procesar usuario OAuth (pasar usuario Y sesión para Token Bridge)
    const result = await procesarUsuarioOAuth(data.user, data.session);

    if (!result.success) {
      console.error('[OAuth Callback] Error procesando usuario:', result.error);
      const loginRedirect = getSafeRedirectUrl(next, '/login', request);
      return NextResponse.redirect(
        new URL(`${loginRedirect}?error=processing_failed`, request.url)
      );
    }

    // Redirigir según resultado
    if (result.needsOnboarding) {
      // Para onboarding, no usar next (debe ir a la página de setup)
      return NextResponse.redirect(
        new URL('/onboarding/setup-studio', request.url)
      );
    }

    if (result.redirectPath) {
      // Si hay un redirectPath del procesamiento, usarlo (tiene prioridad)
      return NextResponse.redirect(new URL(result.redirectPath, request.url));
    }

    // Si hay next válido y el usuario está autenticado, redirigir allí
    // Sino, usar fallback seguro
    const safeRedirect = getSafeRedirectUrl(
      next,
      result.redirectPath || '/login',
      request
    );
    
    return NextResponse.redirect(
      new URL(safeRedirect, request.url)
    );
  } catch (error) {
    console.error('[OAuth Callback] Error inesperado:', error);
    const loginRedirect = getSafeRedirectUrl(next, '/login', request);
    return NextResponse.redirect(
      new URL(`${loginRedirect}?error=unexpected_error`, request.url)
    );
  }
}

