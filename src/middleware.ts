import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { getRedirectPathForUser } from "@/lib/auth/redirect-utils";

// Función para verificar rutas reservadas
function isReservedPath(path: string): boolean {
  const reservedPaths = [
    "/admin", "/agente", "/api", "/login", "/sign-up", "/signin", "/signup",
    "/forgot-password", "/update-password", "/error", "/redirect", "/sign-up-success",
    "/complete-profile", "/confirm", "/unauthorized", "/protected", "/about",
    "/pricing", "/contact", "/features", "/blog", "/help", "/docs", "/demo",
    "/terms", "/privacy", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"
  ];

  return reservedPaths.some((reserved) => {
    if (reserved === "/demo") {
      return path === "/demo" || path.startsWith("/demo/");
    }
    return path.startsWith(reserved);
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirección para cualquier [slug]/login a /login
  const slugLoginMatch = pathname.match(/^\/([a-zA-Z0-9-]+)\/login$/);
  if (slugLoginMatch) {
    const slug = slugLoginMatch[1];
    console.log(`🔄 [ZEN.PRO] Redirecting /${slug}/login to /login`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirigir de /login si hay sesión activa
  if (pathname === '/login') {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Verificar sesión usando getUser() para autenticación segura
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!userError && user) {
      const redirectResult = getRedirectPathForUser(user);

      if (redirectResult.shouldRedirect && redirectResult.redirectPath) {
        return NextResponse.redirect(new URL(redirectResult.redirectPath, request.url));
      }
    }

    return response;
  }

  // Rutas que requieren autenticación
  const protectedRoutes = ["/admin", "/agente"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Verificar si es una ruta de studio dinámica [slug]/studio
  const isStudioRoute = pathname.match(/^\/([a-zA-Z0-9-]+)\/studio(\/.*)?$/);
  const isStudioProtected = isStudioRoute && !isReservedPath(pathname);

  // Verificar si es una ruta de cliente dinámica [slug]/client
  const isClienteRoute = pathname.match(/^\/([a-zA-Z0-9-]+)\/client(\/.*)?$/);
  const isClienteProtected = isClienteRoute && !isReservedPath(pathname);

  // Verificar si es una ruta de profile edit [slug]/profile/edit
  const isProfileEditRoute = pathname.match(/^\/([a-zA-Z0-9-]+)\/profile\/edit(\/.*)?$/);
  const isProfileEditProtected = isProfileEditRoute && !isReservedPath(pathname);

  if (isProtectedRoute || isStudioProtected || isClienteProtected || isProfileEditProtected) {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Verificar sesión usando getUser() para autenticación segura
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const userRole = user.user_metadata?.role;
    let studioSlug = user.user_metadata?.studio_slug;

    // Obtener slug de la URL si no está en metadata
    if (!studioSlug && isStudioProtected) {
      const studioSlugFromPath = pathname.match(/^\/([a-zA-Z0-9-]+)\/studio/)?.[1];
      if (studioSlugFromPath) {
        studioSlug = studioSlugFromPath;
      }
    }

    if (!userRole) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Verificar permisos
    const hasAccess = checkRouteAccess(userRole, pathname);

    // Verificar acceso a studio específico
    if (isStudioProtected && (userRole === 'suscriptor' || userRole === 'studio_owner')) {
      const studioSlugFromPath = pathname.match(/^\/([a-zA-Z0-9-]+)\/studio/)?.[1];

      if (!studioSlug) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if (studioSlugFromPath && studioSlug && studioSlugFromPath !== studioSlug) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    if (!hasAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Verificar cliente
    if (isClienteProtected) {
      const hasClienteAccess = await checkClienteAccess(user, pathname, request);
      if (!hasClienteAccess) {
        const studioSlug = pathname.match(/^\/([a-zA-Z0-9-]+)\/client/)?.[1];
        const loginUrl = new URL(`/${studioSlug}/client/login?redirect=${encodeURIComponent(pathname)}`, request.url);
        return NextResponse.redirect(loginUrl);
      }
    }

    return response;
  }

  // Rutas reservadas para marketing (no redirigir)
  const marketingRoutes = [
    "/about",
    "/pricing",
    "/contact",
    "/features",
    "/blog",
    "/login",
    "/sign-up",
    "/signin",
    "/signup",
    "/forgot-password",
    "/update-password",
    "/error",
    "/redirect",
    "/sign-up-success",
    "/complete-profile",
    "/confirm",
    "/unauthorized",
  ];

  // Si es una ruta de marketing, permitir
  if (marketingRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }


  // Manejar rutas de studio sin slug - redirigir al slug del usuario
  if (pathname.startsWith('/studio') && !pathname.match(/^\/([a-zA-Z0-9-]+)\/studio/)) {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.user_metadata?.studio_slug) {
      const studioSlug = user.user_metadata.studio_slug;
      const subPath = pathname.replace('/studio', '');
      const redirectUrl = new URL(`/${studioSlug}/studio${subPath}`, request.url);
      console.log(`🔄 [ZEN.PRO] Redirecting ${pathname} to ${redirectUrl.pathname}`);
      return NextResponse.redirect(redirectUrl);
    } else {
      // Si no hay usuario o slug, redirigir a login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Solo reescribir si es una ruta que no existe y no es reservada
  // NO reescribir /[slug] (página pública) ni /[slug]/studio (ya existe)
  const slugMatch = pathname.match(/^\/([a-zA-Z0-9-]+)(\/.*)?$/);
  if (slugMatch && pathname !== "/" && !isReservedPath(pathname)) {
    const [, slug, subPath = ""] = slugMatch;

    // No reescribir rutas que ya existen:
    // - /[slug] (página pública del studio)
    // - /[slug]/studio (panel privado del studio)  
    // - /[slug]/client (portal de clientes)
    // - /[slug]/preview (preview de promesas - pública)
    // - /[slug]/post (posts públicos)
    // - /[slug]/profile (perfil público)
    // - /[slug]/offer (ofertas públicas)
    if (!subPath || subPath.startsWith('/studio') || subPath.startsWith('/client') || subPath.startsWith('/preview') || subPath.startsWith('/post') || subPath.startsWith('/profile') || subPath.startsWith('/offer')) {
      return NextResponse.next();
    }

    // Solo reescribir si es una subruta que no existe
    const studioPath = `/${slug}/studio${subPath}`;
    console.log(`🔄 [ZEN.PRO] Rewriting ${pathname} to ${studioPath}`);
    return NextResponse.rewrite(new URL(studioPath, request.url));
  }

  return NextResponse.next();
}

function checkRouteAccess(userRole: string, pathname: string): boolean {
  switch (userRole) {
    case "super_admin":
      // Super admin puede acceder a todo
      return true;

    case "agente":
      // Agente solo puede acceder a rutas de agente
      return pathname.startsWith("/agente");

    case "suscriptor":
    case "studio_owner":
      // Suscriptor y studio_owner pueden acceder a rutas de studio dinámicas [slug]/studio y [slug]/profile/edit
      return pathname.match(/^\/([a-zA-Z0-9-]+)\/studio(\/.*)?$/) !== null ||
        pathname.match(/^\/([a-zA-Z0-9-]+)\/profile\/edit(\/.*)?$/) !== null;

    default:
      return false;
  }
}

async function checkClienteAccess(user: any, pathname: string, request: NextRequest): Promise<boolean> {
  try {
    // Extraer el slug del studio de la ruta
    const slugMatch = pathname.match(/^\/([a-zA-Z0-9-]+)\/client(\/.*)?$/);
    if (!slugMatch) return false;

    const studioSlug = slugMatch[1];

    // Verificar si el usuario tiene acceso a este studio específico
    // Esto se puede hacer verificando:
    // 1. Si el usuario es el propietario del studio (suscriptor)
    // 2. Si el usuario es un cliente con código de acceso válido
    // 3. Si el usuario tiene un token de acceso específico

    // Por ahora, implementar lógica básica
    // TODO: Implementar verificación real de acceso de cliente

    // Verificar si el usuario tiene metadata de cliente para este studio
    const clienteData = user.user_metadata?.cliente_access;
    if (clienteData && clienteData.studio_slug === studioSlug) {
      return true;
    }

    // Verificar si es el propietario del studio
    if (user.user_metadata?.role === 'suscriptor' && user.user_metadata?.studio_slug === studioSlug) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking cliente access:', error);
    return false;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};