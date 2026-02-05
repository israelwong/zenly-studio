import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  procesarUsuarioOAuth,
  vincularRecursoGoogle,
} from '@/lib/actions/auth/oauth.actions';
import { createClient as createAdminClient } from '@/lib/supabase/admin';
import {
  procesarCallbackGoogleCalendar,
  procesarCallbackGoogleDrive,
  procesarCallbackUnificado,
} from '@/lib/integrations/google';
import { prisma } from '@/lib/prisma';

/**
 * Callback de Supabase Auth OAuth
 * Distingue entre:
 * - Login de Usuario: Crea/actualiza usuario y opcionalmente guarda tokens
 * - Vinculación de Recurso: Solo actualiza tokens del Studio (independiente de cuenta de sesión)
 */
/**
 * Valida que una URL sea interna (seguridad contra Open Redirect)
 * Solo permite rutas relativas que empiecen con / o URLs absolutas del mismo host/localhost
 */
function isValidInternalUrl(url: string | null, allowedOrigin?: string): boolean {
  if (!url) return false;

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    return false;
  }

  // Bloquear protocol-relative (//evil.com)
  if (decodedUrl.startsWith('//')) return false;
  if (decodedUrl.includes('<') || decodedUrl.includes('>') || decodedUrl.includes('javascript:')) return false;

  // Si contiene protocolo (http://, https://), solo permitir mismo host o localhost
  if (decodedUrl.includes('://')) {
    try {
      const parsed = new URL(decodedUrl);
      const host = parsed.hostname?.toLowerCase();
      if (!host) return false;
      if (host === 'localhost' || host === '127.0.0.1') return true;
      if (allowedOrigin) {
        const allowedHost = new URL(allowedOrigin).hostname?.toLowerCase();
        return allowedHost ? host === allowedHost : false;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Ruta relativa: debe empezar por /
  if (!decodedUrl.startsWith('/')) return false;

  try {
    const parsed = new URL(decodedUrl, allowedOrigin ?? 'http://localhost');
    const host = parsed.hostname?.toLowerCase();
    if (host && host !== 'localhost' && host !== '127.0.0.1' && allowedOrigin) {
      const allowedHost = new URL(allowedOrigin).hostname?.toLowerCase();
      if (allowedHost && host !== allowedHost) return false;
    } else if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return false;
    }
  } catch {
    // path relativo sin base válida: aceptar si empieza por /
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
  const origin = new URL(request.url).origin;
  if (next && isValidInternalUrl(next, origin)) {
    try {
      const url = new URL(next, request.url);
      // Preservar pathname + search (ej. ?success=true) para flujos como vinculación Google
      return url.pathname + url.search;
    } catch {
      return next;
    }
  }
  return fallback;
}

/**
 * Construye URL de redirección con parámetros de error sin duplicar `?`.
 * Si basePath ya tiene query (ej. ?success=true), los nuevos params se añaden con `&`.
 * Incluye error_code y error_description para que la UI muestre mensajes específicos (ej. identity_already_exists).
 */
function buildErrorRedirectUrl(
  basePath: string,
  request: NextRequest,
  opts: {
    error?: string;
    error_code?: string | null;
    error_description?: string | null;
  }
): URL {
  const url = new URL(basePath, request.url);
  if (opts.error !== undefined) url.searchParams.set('error', opts.error);
  if (opts.error_code) url.searchParams.set('error_code', opts.error_code);
  if (opts.error_description) url.searchParams.set('error_description', opts.error_description);
  return url;
}

/**
 * Registra un log de acceso del usuario
 */
async function logUserAccess(
  supabaseUserId: string,
  action: string,
  success: boolean,
  request: NextRequest
) {
  try {
    // Buscar usuario por supabase_id
    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: supabaseUserId },
    });

    if (!dbUser) {
      console.warn('[Log Access] Usuario no encontrado en DB:', supabaseUserId);
      return;
    }

    // Obtener IP y User Agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               request.headers.get('x-real-ip') || 
               'N/A';
    const userAgent = request.headers.get('user-agent') || 'N/A';

    // Crear log con método de autenticación
    await prisma.user_access_logs.create({
      data: {
        user_id: dbUser.id,
        action,
        success,
        ip_address: ip,
        user_agent: userAgent,
        details: {
          provider: 'google',
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log('[Log Access] ✅ Log creado:', { action, success, userId: dbUser.id });
  } catch (error) {
    console.error('[Log Access] Error al crear log:', error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // State de OAuth directo (Google)
  const nextParam = searchParams.get('next'); // URL de origen para redirección
  const next = nextParam; // alias para resto del archivo
  const type = searchParams.get('type'); // Tipo de flujo: 'link_resource' o null (login)
  const studioSlug = searchParams.get('studioSlug'); // Slug del studio (solo para link_resource)
  const resourceType = searchParams.get('resourceType') as 'calendar' | 'drive' | null; // Tipo de recurso: 'calendar' | 'drive'

  console.log('--- [Callback Debug] ---');
  console.log('[Callback Debug] Incoming Next Param:', nextParam);
  console.log('[Callback Debug] Raw URL:', request.url);
  console.log('[Callback Debug] Parámetros:', { hasCode: !!code, hasError: !!error, hasState: !!state, type, studioSlug });
  console.log('------------------------');

  // Si hay state, es OAuth directo de Google (Calendar o Drive) - NO usa Supabase Auth
  // Esto NO interfiere con la sesión del usuario porque no pasa por Supabase Auth
  if (state && code) {
    console.log('[OAuth Callback] Flujo OAuth directo de Google (sin Supabase Auth)');
    
    try {
      // Decodificar state para obtener información
      let stateData: { studioSlug?: string; returnUrl?: string; resourceType?: string };
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        return NextResponse.redirect(
          new URL('/login?error=invalid_state', request.url)
        );
      }

      const studioSlugFromState = stateData.studioSlug;
      const returnUrl = stateData.returnUrl || null;
      const stateResourceType = stateData.resourceType;
      const isUnified = (stateData as any).unified === true;

      // Si es flujo unificado, procesar con función unificada
      if (isUnified && studioSlugFromState) {
        const result = await procesarCallbackUnificado(code, state);

        if (!result.success) {
          const redirectPath = getSafeRedirectUrl(
            returnUrl,
            `/${studioSlugFromState}/studio/config/integraciones`,
            request
          );
          return NextResponse.redirect(
            new URL(
              `${redirectPath}?error=${encodeURIComponent(result.error || 'Error al conectar')}`,
              request.url
            )
          );
        }

        // Redirigir con éxito (o con advertencia si hay error parcial)
        const redirectPath = getSafeRedirectUrl(
          result.returnUrl || returnUrl,
          `/${result.studioSlug || studioSlugFromState}/studio/config/integraciones`,
          request
        );
        const redirectUrl = new URL(redirectPath, request.url);
        
        if (result.error) {
          // Hay un error parcial (ej: Contacts no se pudo conectar)
          redirectUrl.searchParams.set('warning', encodeURIComponent(result.error));
          redirectUrl.searchParams.set('success', 'google_suite_partial');
        } else {
          redirectUrl.searchParams.set('success', 'google_suite_connected');
        }

        return NextResponse.redirect(redirectUrl);
      }

      // Si es Calendar, procesar con la función de Calendar
      if (stateResourceType === 'calendar' && studioSlugFromState) {
        const result = await procesarCallbackGoogleCalendar(code, state);
        
        if (!result.success) {
          const redirectPath = getSafeRedirectUrl(
            returnUrl,
            `/${studioSlugFromState}/studio/config/integraciones`,
            request
          );
          return NextResponse.redirect(
            new URL(`${redirectPath}?error=${encodeURIComponent(result.error || 'Error al conectar')}`, request.url)
          );
        }

        // Redirigir con éxito
        const redirectPath = getSafeRedirectUrl(
          result.returnUrl || returnUrl,
          `/${result.studioSlug || studioSlugFromState}/studio/config/integraciones`,
          request
        );
        const redirectUrl = new URL(redirectPath, request.url);
        redirectUrl.searchParams.set('success', 'google_connected');
        
        return NextResponse.redirect(redirectUrl);
      }

      // Si es Contacts, procesar con la función de Contacts
      if (stateResourceType === 'contacts' && studioSlugFromState) {
        const { procesarCallbackGoogleContacts } = await import(
          '@/lib/integrations/google'
        );
        const result = await procesarCallbackGoogleContacts(code, state);

        if (!result.success) {
          const redirectPath = getSafeRedirectUrl(
            returnUrl,
            `/${studioSlugFromState}/studio/config/integraciones`,
            request
          );
          return NextResponse.redirect(
            new URL(
              `${redirectPath}?error=${encodeURIComponent(result.error || 'Error al conectar')}`,
              request.url
            )
          );
        }

        // Redirigir con éxito
        const redirectPath = getSafeRedirectUrl(
          result.returnUrl || returnUrl,
          `/${result.studioSlug || studioSlugFromState}/studio/config/integraciones`,
          request
        );
        const redirectUrl = new URL(redirectPath, request.url);
        redirectUrl.searchParams.set('success', 'google_contacts_connected');

        return NextResponse.redirect(redirectUrl);
      }

      // Si es Drive o no tiene resourceType (compatibilidad con versiones anteriores)
      if ((stateResourceType === 'drive' || !stateResourceType) && studioSlugFromState) {
        const result = await procesarCallbackGoogleDrive(code, state);
        
        if (!result.success) {
          const redirectPath = getSafeRedirectUrl(
            returnUrl,
            `/${studioSlugFromState}/studio/config/integraciones`,
            request
          );
          return NextResponse.redirect(
            new URL(`${redirectPath}?error=${encodeURIComponent(result.error || 'Error al conectar')}`, request.url)
          );
        }

        // Redirigir con éxito
        const redirectPath = getSafeRedirectUrl(
          result.returnUrl || returnUrl,
          `/${result.studioSlug || studioSlugFromState}/studio/config/integraciones`,
          request
        );
        const redirectUrl = new URL(redirectPath, request.url);
        redirectUrl.searchParams.set('success', 'google_connected');
        
        return NextResponse.redirect(redirectUrl);
      }

      // Si no hay studioSlug, error
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', request.url)
      );
    } catch (error) {
      console.error('[OAuth Callback] Error procesando OAuth directo:', error);
      return NextResponse.redirect(
        new URL('/login?error=oauth_error', request.url)
      );
    }
  }

  // Manejar error de OAuth (usuario canceló o error del proveedor, ej. identity_already_exists)
  if (error) {
    const errorCode = searchParams.get('error_code');
    const errorDesc = searchParams.get('error_description');
    console.error('[OAuth Callback] Error de Google:', { error, error_code: errorCode, error_description: errorDesc });

    // Si es una vinculación de recurso, redirigir al studio
    if (type === 'link_resource' && studioSlug) {
      const redirectPath = getSafeRedirectUrl(
        next,
        `/${studioSlug}/studio/config/integraciones`,
        request
      );
      const errorUrl = buildErrorRedirectUrl(redirectPath, request, {
        error: 'oauth_failed',
        error_code: errorCode,
        error_description: errorDesc,
      });
      return NextResponse.redirect(errorUrl);
    }

    // Para login / link identity: usar next si es válido (preserva ?success=true y añade error con &)
    const loginRedirect = getSafeRedirectUrl(next, '/login', request);
    const errorUrl = buildErrorRedirectUrl(loginRedirect, request, {
      error: 'oauth_failed',
      error_code: errorCode,
      error_description: errorDesc,
    });
    return NextResponse.redirect(errorUrl);
  }

  // Validar que tenemos código
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', request.url)
    );
  }

  try {
    const allCookies = request.cookies.getAll();
    const sbCookies = allCookies.filter(c => c.name.startsWith('sb-'));
    console.log('[OAuth Callback] 📦 Cookies sb-*:', sbCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      len: (c.value ?? '').length,
      segmented: /\.\d+$/.test(c.name),
    })));

    // PRIORIDAD: code_verifier de URL > cookies
    const verifierFromUrl = searchParams.get('code_verifier');
    const codeVerifierCookie = allCookies.find(c => c.name.includes('code-verifier'));
    
    console.log('[OAuth Callback] 🔐 PKCE Verifier Sources:', {
      fromUrl: !!verifierFromUrl,
      fromCookie: !!codeVerifierCookie?.value,
      urlLength: verifierFromUrl?.length ?? 0,
      cookieLength: codeVerifierCookie?.value?.length ?? 0,
    });

    // Determinar qué verifier usar (priorizar URL)
    const finalVerifier = verifierFromUrl || codeVerifierCookie?.value;
    
    if (verifierFromUrl) {
      console.log('[OAuth Callback] ✅ Usando code_verifier desde URL (prioridad):', {
        length: verifierFromUrl.length,
        preview: verifierFromUrl.substring(0, 20) + '...',
      });
    } else if (codeVerifierCookie?.value) {
      console.log('[OAuth Callback] ✅ Usando code_verifier desde cookies (fallback)');
    } else {
      console.error('[OAuth Callback] ❌ CRÍTICO: No se encontró code_verifier');
      return NextResponse.redirect(
        new URL('/login?error=missing_verifier', request.url)
      );
    }

    // Log del código que se va a intercambiar
    console.log('[OAuth Callback] 🔄 Preparando intercambio:', {
      code: code.substring(0, 8) + '...' + code.substring(code.length - 4),
      codeLength: code.length,
      verifier: finalVerifier!.substring(0, 20) + '...',
      verifierLength: finalVerifier!.length,
      timestamp: new Date().toISOString(),
    });

    // IMPORTANTE: Para vinculación de recurso, guardar cookies originales antes de exchangeCodeForSession
    // porque exchangeCodeForSession sobrescribe las cookies con una sesión temporal
    let originalSessionCookies: { name: string; value: string }[] = [];
    if (type === 'link_resource') {
      // Guardar TODAS las cookies de Supabase excepto las de PKCE
      // Las cookies de PKCE se necesitan para exchangeCodeForSession
      request.cookies.getAll().forEach(cookie => {
        // Guardar cookies de sesión pero NO las de PKCE
        // PKCE cookies: sb-*-auth-token-code-verifier, sb-*-auth-token-code-challenge
        // Session cookies: sb-*-auth-token (sin code-verifier ni code-challenge)
        const isPkceCookie = 
          cookie.name.includes('code-verifier') || 
          cookie.name.includes('code-challenge')
        
        if (
          cookie.name.startsWith('sb-') && 
          !isPkceCookie
        ) {
          originalSessionCookies.push({ name: cookie.name, value: cookie.value });
        }
      });
      console.log('[OAuth Callback] Cookies de sesión originales guardadas:', originalSessionCookies.length);
      if (originalSessionCookies.length > 0) {
        console.log('[OAuth Callback] Nombres de cookies guardadas:', originalSessionCookies.map(c => c.name));
      } else {
        console.warn('[OAuth Callback] ⚠️ No se encontraron cookies de sesión originales - el usuario podría perder la sesión');
      }
    }

    const response = NextResponse.next();
    const cookieOptions = {
      path: '/' as const,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            let cookies = request.cookies.getAll();
            const verifierCookie = cookies.find(c => c.name.includes('code-verifier'));
            
            // PRIORIDAD: Si viene verifier en URL, SIEMPRE usarlo
            if (verifierFromUrl) {
              if (verifierCookie) {
                // Reemplazar cookie existente con valor de URL
                console.log('[OAuth Callback] 🔄 Reemplazando code_verifier con valor de URL (prioridad)');
                cookies = cookies.map(c =>
                  c.name === verifierCookie.name ? { name: c.name, value: verifierFromUrl } : c
                );
              } else {
                // Crear nueva cookie con el nombre estándar de Supabase
                const project = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0];
                const verifierName = `sb-${project}-auth-token-code-verifier`;
                console.log('[OAuth Callback] ➕ Creando code_verifier desde URL:', verifierName);
                cookies.push({ name: verifierName, value: verifierFromUrl });
              }
            } else if (!verifierCookie?.value) {
              // Si no hay verifier en URL ni en cookies, ERROR
              console.error('[OAuth Callback] ❌ CRÍTICO: No hay code_verifier disponible en cookies');
            }
            
            return cookies.map(cookie => {
              // Decodificar cookies que puedan estar encoded
              if (cookie.value && cookie.value.includes('%')) {
                try {
                  return { name: cookie.name, value: decodeURIComponent(cookie.value) };
                } catch {
                  return cookie;
                }
              }
              return cookie;
            });
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = { ...cookieOptions, ...options };
              request.cookies.set(name, value);
              response.cookies.set(name, value, opts);
            });
          },
        },
        auth: {
          persistSession: true,  // Cambiar a true para que Supabase maneje la sesión
          autoRefreshToken: false,
          detectSessionInUrl: true,  // Cambiar a true para detectar code en URL
          flowType: 'pkce',  // Explícitamente usar PKCE
        },
      }
    );

    // Helper para crear respuesta de redirección con cookies de Supabase
    // Se define aquí para poder usarlo después de exchangeCodeForSession
    const createRedirectResponse = (url: URL) => {
      const redirectResponse = NextResponse.redirect(url);
      // Copiar todas las cookies establecidas por Supabase durante exchangeCodeForSession
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      });
      return redirectResponse;
    };

    // Intercambiar código por sesión (ONE-SHOT)
    console.log('[OAuth Callback] 🚀 ONE-SHOT: Intentando intercambiar código por sesión...');
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[OAuth Callback] ❌ Error intercambiando código:', {
        code: exchangeError.code,
        message: exchangeError.message,
        status: exchangeError.status,
      });

      // Si el código ya se usó o expiró (flow_state_not_found)
      if (exchangeError.code === 'flow_state_not_found') {
        console.error('[OAuth Callback] ⏱️ Código OAuth expirado o ya usado (flow_state_not_found)');
        
        await supabase.auth.signOut();
        
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'timeout');
        
        const redirectRes = NextResponse.redirect(loginUrl);
        // Limpiar todas las cookies de Supabase
        const allCookies = request.cookies.getAll();
        allCookies.forEach((c) => {
          if (c.name.startsWith('sb-')) {
            redirectRes.cookies.set(c.name, '', { path: '/', maxAge: 0 });
          }
        });
        
        return redirectRes;
      }

      // Otros errores (validation_failed, etc.)
      await supabase.auth.signOut();

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'auth_failed');

      const redirectRes = NextResponse.redirect(loginUrl);
      const allCookies = request.cookies.getAll();
      allCookies.forEach((c) => {
        if (c.name.startsWith('sb-')) {
          redirectRes.cookies.set(c.name, '', { path: '/', maxAge: 0 });
          redirectRes.cookies.set(c.name, '', { path: '/auth', maxAge: 0 });
        }
      });

      return redirectRes;
    }

    console.log('[OAuth Callback] ✅ Intercambio exitoso - Sesión creada');

    const userId = data.user?.id ?? null;
    const studioSlugFromMetadata = data.user?.user_metadata?.studio_slug ?? null;
    console.log('--- [Callback Debug] Post-Exchange ---');
    console.log('[Callback Debug] User ID:', userId);
    console.log('[Callback Debug] Studio Slug (Metadata):', studioSlugFromMetadata);
    console.log('--------------------------------------');

    if (!data.user || !data.session) {
      console.error('[OAuth Callback] No se pudo obtener usuario o sesión');
      const loginRedirect = getSafeRedirectUrl(next, '/login', request);
      const errorUrl = buildErrorRedirectUrl(loginRedirect, request, { error: 'auth_failed' });
      return createRedirectResponse(errorUrl);
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
        data.session,
        resourceType || undefined // Pasar tipo de recurso si está disponible
      );

      if (!result.success) {
        console.log('[OAuth Callback] Error en vinculación, next URL:', next);

        const redirectPath = getSafeRedirectUrl(
          next,
          `/${studioSlug}/studio/config/integraciones`,
          request
        );
        console.log('[OAuth Callback] Redirigiendo a (error):', redirectPath);

        const errorUrl = buildErrorRedirectUrl(redirectPath, request, {
          error: result.error || 'Error al vincular recurso',
        });
        return createRedirectResponse(errorUrl);
      }

      // Redirigir a página de origen con éxito (o dashboard como fallback)
      console.log('[OAuth Callback] Vinculación exitosa:', {
        next,
        studioSlug,
      });
      
      // Validar y obtener URL segura de redirección
      const redirectPath = getSafeRedirectUrl(
        next,
        `/${studioSlug}/studio/commercial/dashboard`, // Fallback al dashboard del studio
        request
      );
      
      console.log('[OAuth Callback] Redirigiendo a (éxito):', redirectPath);
      
      // Construir URL completa con parámetro de éxito
      // IMPORTANTE: Limpiar cualquier parámetro de error previo antes de agregar success
      const redirectUrl = new URL(redirectPath, request.url);
      redirectUrl.searchParams.delete('error'); // Limpiar error si existe
      redirectUrl.searchParams.set('success', 'google_connected');
      
      // IMPORTANTE: Restaurar cookies de sesión originales para mantener la sesión del usuario
      // El OAuth creó una sesión temporal que sobrescribió las cookies de sesión originales
      const finalResponse = createRedirectResponse(redirectUrl);
      
      if (originalSessionCookies.length > 0) {
        console.log('[OAuth Callback] Restaurando cookies de sesión originales del usuario:', originalSessionCookies.length);
        // Restaurar cada cookie de sesión original con las mismas opciones que Supabase usa
        originalSessionCookies.forEach(cookie => {
          finalResponse.cookies.set(cookie.name, cookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            // Mantener maxAge si estaba presente (Supabase usa 60 días por defecto)
            maxAge: 60 * 60 * 24 * 60, // 60 días
          });
          console.log('[OAuth Callback] Cookie restaurada:', cookie.name);
        });
      } else {
        console.warn('[OAuth Callback] ⚠️ No se encontraron cookies de sesión originales');
        console.log('[OAuth Callback] Cookies disponibles en el request:', request.cookies.getAll().map(c => c.name));
        
        // Si no hay cookies originales, mantener las cookies de la sesión temporal de OAuth
        // Esto evita que el usuario pierda la sesión completamente
        // Las cookies de OAuth temporal se limpiarán cuando el usuario haga logout o expire
        const tempSessionCookies = response.cookies.getAll().filter(c => 
          c.name.startsWith('sb-') && 
          c.name.includes('auth-token') &&
          !c.name.includes('code-verifier') &&
          !c.name.includes('code-challenge')
        );
        
        if (tempSessionCookies.length > 0) {
          console.log('[OAuth Callback] Manteniendo cookies de sesión temporal de OAuth:', tempSessionCookies.length);
          tempSessionCookies.forEach(cookie => {
            finalResponse.cookies.set(cookie.name, cookie.value, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 60 * 60 * 24 * 60, // 60 días
            });
          });
        } else {
          console.log('[OAuth Callback] No hay cookies de sesión disponibles - el usuario necesitará iniciar sesión');
        }
      }
      
      return finalResponse;
    }

    // FLUJO: Login de Usuario (flujo normal)
    // Procesar usuario OAuth (pasar usuario Y sesión para Token Bridge)
    const result = await procesarUsuarioOAuth(data.user, data.session);

    if (!result.success) {
      console.error('[OAuth Callback] Error procesando usuario:', result.error);
      
      // Registrar intento fallido de login
      await logUserAccess(data.user.id, 'login', false, request);
      
      if (result.restricted) {
        await supabase.auth.signOut();
        return createRedirectResponse(
          new URL('/login?error=restricted', request.url)
        );
      }
      const loginRedirect = getSafeRedirectUrl(next, '/login', request);
      const errorUrl = buildErrorRedirectUrl(loginRedirect, request, { error: 'processing_failed' });
      return createRedirectResponse(errorUrl);
    }

    // Registrar login exitoso
    await logUserAccess(data.user.id, 'login', true, request);

    if (result.studioSlug) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(data.user.id, {
          user_metadata: { role: 'suscriptor', studio_slug: result.studioSlug },
        });
      } catch (e) {
        console.warn('[OAuth Callback] No se pudo adelgazar user_metadata:', e);
      }
    }

    // Jerarquía: 1) next → vuelve aquí  2) studio_slug → dashboard  3) último recurso → onboarding
    const requestOrigin = new URL(request.url).origin;

    // Prioridad 1 (crítica): next existe y es válido (empieza con /, interno) → REDIRIGIR AHÍ INMEDIATAMENTE
    const nextTrimmed = next?.trim();
    if (nextTrimmed && nextTrimmed.startsWith('/') && isValidInternalUrl(nextTrimmed, requestOrigin)) {
      const destination = getSafeRedirectUrl(nextTrimmed, '/login', request);
      const finalUrl = new URL(destination, request.url);
      finalUrl.searchParams.delete('code');
      finalUrl.searchParams.delete('state');
      console.log('--- [Callback Debug] DECISION ---');
      console.log('[Callback Debug] DECISION: Redirecting to (next):', finalUrl.pathname + finalUrl.search);
      console.log('---------------------------------');
      return createRedirectResponse(finalUrl);
    }

    // Prioridad 2: studio_slug en metadata o resultado → dashboard (no enviar a onboarding si tiene studio)
    const metaSlug = data.user?.user_metadata?.studio_slug ?? result.studioSlug;
    if (metaSlug && typeof metaSlug === 'string' && metaSlug.trim()) {
      const dashboardPath = `/${metaSlug.trim()}/studio/commercial/dashboard`;
      const url = new URL(dashboardPath, request.url);
      url.search = '';
      console.log('--- [Callback Debug] DECISION ---');
      console.log('[Callback Debug] DECISION: Redirecting to (studio_slug):', url.pathname + url.search);
      console.log('---------------------------------');
      return createRedirectResponse(url);
    }

    if (result.redirectPath) {
      const url = new URL(result.redirectPath, request.url);
      url.search = '';
      console.log('--- [Callback Debug] DECISION ---');
      console.log('[Callback Debug] DECISION: Redirecting to (redirectPath):', url.pathname + url.search);
      console.log('---------------------------------');
      return createRedirectResponse(url);
    }

    // Prioridad 3 (último recurso): solo si no hay studio → onboarding
    if (result.needsOnboarding) {
      const url = new URL('/onboarding/setup-studio', request.url);
      url.search = '';
      console.log('--- [Callback Debug] DECISION ---');
      console.log('[Callback Debug] DECISION: Redirecting to (needsOnboarding):', url.pathname + url.search);
      console.log('---------------------------------');
      return createRedirectResponse(url);
    }

    const fallbackRedirect = getSafeRedirectUrl(next, '/onboarding', request);
    const url = new URL(fallbackRedirect, request.url);
    url.search = '';
    console.log('--- [Callback Debug] DECISION ---');
    console.log('[Callback Debug] DECISION: Redirecting to (fallback):', url.pathname + url.search);
    console.log('---------------------------------');
    return createRedirectResponse(url);
  } catch (error) {
    console.error('[OAuth Callback] Error inesperado:', error);
    const loginRedirect = getSafeRedirectUrl(next, '/login', request);
    const errorUrl = buildErrorRedirectUrl(loginRedirect, request, { error: 'unexpected_error' });
    return NextResponse.redirect(errorUrl);
  }
}

