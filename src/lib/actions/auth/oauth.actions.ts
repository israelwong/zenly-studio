'use server';

import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/utils/encryption';
import type { User, Session } from '@supabase/supabase-js';

const RESTRICTED_MESSAGE =
  'Acceso restringido. El registro de nuevos estudios estará disponible próximamente.';

export interface ProcesarUsuarioOAuthResult {
  success: boolean;
  needsOnboarding?: boolean;
  redirectPath?: string;
  studioSlug?: string;
  error?: string;
  /** true cuando el usuario no existe en nuestra DB (solo login para existentes) */
  restricted?: boolean;
}

export interface VincularRecursoGoogleResult {
  success: boolean;
  studioSlug?: string;
  error?: string;
}

/**
 * Procesa usuario autenticado vía OAuth (Google)
 * - Crea/actualiza en users y studio_user_profiles (integridad dual)
 * - Verifica si tiene studio asociado
 * - Token Bridge: Guarda tokens de Google si aplica
 */
export async function procesarUsuarioOAuth(
  user: User,
  session: Session
): Promise<ProcesarUsuarioOAuthResult> {
  try {
    const supabaseId = user.id;
    const email = user.email;
    const userMetadata = user.user_metadata || {};

    if (!email) {
      return {
        success: false,
        error: 'Email no disponible en usuario OAuth',
      };
    }

    // Solo usuarios existentes: debe existir en users (por supabase_id o email) o en studio_user_profiles (por email)
    const existingBySupabaseId = await prisma.users.findUnique({
      where: { supabase_id: supabaseId },
      select: { id: true },
    });
    const existingByEmail = await prisma.users.findFirst({
      where: { email },
      select: { id: true },
    });
    const existingLegacyByEmail = await prisma.studio_user_profiles.findUnique({
      where: { email },
      select: { id: true },
    });
    const isExistingUser =
      !!existingBySupabaseId || !!existingByEmail || !!existingLegacyByEmail;
    if (!isExistingUser) {
      return {
        success: false,
        error: RESTRICTED_MESSAGE,
        restricted: true,
      };
    }

    // Extraer datos de Google
    const fullName =
      userMetadata.full_name ||
      userMetadata.name ||
      userMetadata.display_name ||
      email.split('@')[0];
    const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

    // Paso 1: Integridad Dual - Crear/actualizar en AMBOS modelos
    // Fusión de cuentas: si existe en users por email (ej. creado con contraseña), actualizar ese registro con el nuevo supabase_id
    await prisma.$transaction(async (tx) => {
      const existingInUsersBySupabaseId = await tx.users.findUnique({
        where: { supabase_id: supabaseId },
        select: { id: true },
      });
      const existingInUsersByEmail = await tx.users.findFirst({
        where: { email },
        select: { id: true, supabase_id: true },
      });
      const existingLegacy = await tx.studio_user_profiles.findUnique({
        where: { email },
      });

      // users: actualizar por supabase_id, o por email (fusión) si ya existe con otro supabase_id
      if (existingInUsersBySupabaseId) {
        await tx.users.update({
          where: { supabase_id: supabaseId },
          data: {
            email,
            full_name: fullName || undefined,
            avatar_url: avatarUrl || undefined,
            email_verified: user.email_confirmed_at ? true : undefined,
          },
        });
      } else if (existingInUsersByEmail) {
        await tx.users.update({
          where: { id: existingInUsersByEmail.id },
          data: {
            supabase_id: supabaseId,
            full_name: fullName || undefined,
            avatar_url: avatarUrl || undefined,
            email_verified: user.email_confirmed_at ? true : undefined,
          },
        });
      } else {
        await tx.users.create({
          data: {
            supabase_id: supabaseId,
            email,
            full_name: fullName || undefined,
            avatar_url: avatarUrl || undefined,
            email_verified: user.email_confirmed_at ? true : false,
            is_active: true,
          },
        });
      }

      // studio_user_profiles: fusionar por email si ya existe (mismo criterio que users)
      if (existingLegacy) {
        await tx.studio_user_profiles.update({
          where: { id: existingLegacy.id },
          data: {
            supabase_id: supabaseId,
            full_name: fullName || existingLegacy.full_name || undefined,
            avatar_url: avatarUrl || existingLegacy.avatar_url || undefined,
            email,
          },
        });
      } else {
        const existingProfileBySupabaseId = await tx.studio_user_profiles.findUnique({
          where: { supabase_id: supabaseId },
          select: { id: true },
        });
        if (existingProfileBySupabaseId) {
          await tx.studio_user_profiles.update({
            where: { supabase_id: supabaseId },
            data: {
              email,
              full_name: fullName || undefined,
              avatar_url: avatarUrl || undefined,
            },
          });
        } else {
          await tx.studio_user_profiles.create({
            data: {
              email,
              supabase_id: supabaseId,
              full_name: fullName || undefined,
              avatar_url: avatarUrl || undefined,
              role: 'SUSCRIPTOR',
              is_active: true,
            },
          });
        }
      }
    });

    // Paso 2: Verificar si tiene studio asociado
    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: supabaseId },
      select: { id: true },
    });

    if (!dbUser) {
      return {
        success: false,
        error: 'Error al crear usuario en base de datos',
      };
    }

    // Asegurar rol SUSCRIPTOR en user_platform_roles (proxy y rutas) antes de redirigir
    await prisma.user_platform_roles.upsert({
      where: {
        user_id_role: { user_id: dbUser.id, role: 'SUSCRIPTOR' },
      },
      create: {
        user_id: dbUser.id,
        role: 'SUSCRIPTOR',
        is_active: true,
      },
      update: { is_active: true },
    });

    // Buscar studio activo en user_studio_roles
    const studioRole = await prisma.user_studio_roles.findFirst({
      where: {
        user_id: dbUser.id,
        is_active: true,
      },
      include: {
        studio: {
          select: {
            id: true,
            slug: true,
            google_oauth_refresh_token: true,
          },
        },
      },
      orderBy: {
        accepted_at: 'desc', // Último studio aceptado
      },
    });

    // Paso 3: Token Bridge (OPCIONAL) - Guardar tokens de Google si aplica
    // IMPORTANTE: Solo guarda si el studio NO tiene ya una cuenta conectada
    // Esto permite desacoplamiento: Usuario puede usar Cuenta A para login
    // y conectar Calendar/Drive de Cuenta B al Studio
    if (studioRole?.studio && session?.provider_refresh_token) {
      const studio = studioRole.studio;

      // Solo guardar si el studio NO tiene tokens ya configurados
      // Esto hace el Token Bridge opcional y respeta conexiones existentes
      if (!studio.google_oauth_refresh_token) {
        try {
          // Extraer email y nombre de Google desde provider_token (no del usuario Supabase)
          // El email de Google puede ser diferente al email del usuario autenticado
          let googleEmail = email; // Fallback al email del usuario
          let googleName: string | null = null;
          
          // Intentar obtener información de Google desde provider_token
          if (session.provider_token) {
            try {
              const userInfoResponse = await fetch(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                {
                  headers: {
                    Authorization: `Bearer ${session.provider_token}`,
                  },
                }
              );

              if (userInfoResponse.ok) {
                const userInfo = await userInfoResponse.json();
                googleEmail = userInfo.email || email;
                googleName = userInfo.name || null; // Nombre de la cuenta de Google
              }
            } catch (fetchError) {
              // Si falla, usar email del usuario como fallback
              console.warn(
                '[Token Bridge] No se pudo obtener información de Google, usando email del usuario'
              );
            }
          }

          // Token Bridge: Solo guardar tokens si el login trajo refresh_token
          // Nota: Con autorización incremental, el login solo pide email/profile
          // por lo que normalmente NO habrá refresh_token aquí. Esto está bien.
          // El Token Bridge ya no es necesario con autorización incremental.
          // Los tokens se guardarán cuando el usuario conecte Calendar o Drive explícitamente.
          // Este bloque queda para compatibilidad con usuarios que puedan tener refresh_token
          // de una conexión anterior, pero normalmente no se ejecutará.
          if (session.provider_refresh_token) {
            console.log('[Token Bridge] Refresh token encontrado en login, guardando...');
            const encryptedToken = await encryptToken(
              session.provider_refresh_token
            );
            
            // Con autorización incremental, el login solo trae scopes básicos (email, profile)
            // No guardamos scopes de API aquí porque no se pidieron
            // Los scopes de API se guardarán cuando el usuario conecte Calendar o Drive
            const scopes: string[] = []; // Array vacío - no hay scopes de API en el login

            await prisma.studios.update({
              where: { id: studio.id },
              data: {
                google_oauth_refresh_token: encryptedToken,
                google_oauth_email: googleEmail, // Email de Google, puede ser diferente al del usuario
                google_oauth_name: googleName, // Nombre de la cuenta de Google
                google_oauth_scopes: JSON.stringify(scopes),
                is_google_connected: false, // No marcar como conectado si no hay scopes de API
                google_integrations_config: {
                  // No habilitar drive ni calendar automáticamente
                  // El usuario los conectará cuando los necesite
                },
              },
            });
          } else {
            console.log('[Token Bridge] No hay refresh_token en login (esperado con autorización incremental)');
          }
        } catch (tokenError) {
          // No fallar el flujo si el token bridge falla
          // El usuario puede conectar Google Calendar manualmente después
          console.error('[Token Bridge] Error guardando tokens:', tokenError);
        }
      }
    }

    // Paso 4: Determinar redirección
    if (studioRole?.studio) {
      // Usuario tiene studio - redirigir a dashboard
      return {
        success: true,
        redirectPath: `/${studioRole.studio.slug}/studio`,
        studioSlug: studioRole.studio.slug,
      };
    } else {
      // Usuario nuevo sin studio - necesita onboarding
      return {
        success: true,
        needsOnboarding: true,
      };
    }
  } catch (error) {
    console.error('[procesarUsuarioOAuth] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al procesar usuario OAuth',
    };
  }
}

/**
 * Vincula recursos de Google (Calendar/Drive) a un Studio
 * INDEPENDIENTE de la cuenta de sesión del usuario
 * 
 * Permite que un usuario autenticado con Cuenta A
 * conecte Calendar/Drive de Cuenta B al Studio
 * 
 * @param studioSlug - Slug del estudio
 * @param session - Sesión de OAuth con tokens de Google
 * @param resourceType - Tipo de recurso: 'calendar' | 'drive' | undefined (auto-detecta desde scopes)
 */
export async function vincularRecursoGoogle(
  studioSlug: string,
  session: Session,
  resourceType?: 'calendar' | 'drive'
): Promise<VincularRecursoGoogleResult> {
  try {
    if (!session?.provider_refresh_token || !session?.provider_token) {
      return {
        success: false,
        error: 'No se recibieron tokens de Google en la sesión',
      };
    }

    // Verificar que el studio existe y el usuario tiene acceso
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        google_oauth_refresh_token: true,
      },
    });

    if (!studio) {
      return {
        success: false,
        error: 'Studio no encontrado',
      };
    }

    // Obtener email y nombre de Google desde provider_token
    let googleEmail: string;
    let googleName: string | null = null;
    try {
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('No se pudo obtener información de Google');
      }

      const userInfo = await userInfoResponse.json();
      googleEmail = userInfo.email;
      googleName = userInfo.name || null; // Nombre de la cuenta de Google

      if (!googleEmail) {
        throw new Error('Email de Google no disponible');
      }
    } catch (fetchError) {
      return {
        success: false,
        error:
          'Error al obtener información de Google. Por favor, intenta de nuevo.',
      };
    }

    // Encriptar refresh_token
    const encryptedToken = await encryptToken(session.provider_refresh_token);

    // Determinar scopes según el tipo de recurso
    // Si no se especifica, intentar detectar desde los scopes otorgados
    let scopes: string[] = [];
    
    if (resourceType === 'drive') {
      scopes = ['https://www.googleapis.com/auth/drive.readonly'];
    } else if (resourceType === 'calendar') {
      scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];
    } else {
      // Auto-detectar desde los scopes otorgados en la sesión
      // Si la sesión tiene scopes de Drive, asumir Drive; si no, Calendar
      const grantedScopes = session.provider_metadata?.scopes || '';
      if (grantedScopes.includes('drive.readonly') || grantedScopes.includes('drive')) {
        scopes = ['https://www.googleapis.com/auth/drive.readonly'];
      } else {
        // Por defecto, Calendar (compatibilidad con flujo existente)
        scopes = [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ];
      }
    }

    // Obtener scopes existentes para no sobrescribirlos si hay múltiples conexiones
    const studioActual = await prisma.studios.findUnique({
      where: { id: studio.id },
      select: { google_oauth_scopes: true, google_integrations_config: true },
    });

    let scopesFinales = scopes;
    if (studioActual?.google_oauth_scopes) {
      try {
        const scopesExistentes = JSON.parse(studioActual.google_oauth_scopes) as string[];
        // Combinar scopes existentes con los nuevos (sin duplicados)
        scopesFinales = Array.from(new Set([...scopesExistentes, ...scopes]));
      } catch {
        // Si no se puede parsear, usar solo los nuevos
        scopesFinales = scopes;
      }
    }

    // Determinar qué integraciones están habilitadas según los scopes
    const hasDriveScope = scopesFinales.includes('https://www.googleapis.com/auth/drive.readonly');
    const hasCalendarScope =
      scopesFinales.includes('https://www.googleapis.com/auth/calendar') ||
      scopesFinales.includes('https://www.googleapis.com/auth/calendar.events');

    // Obtener configuración existente de integraciones
    let integrationsConfig: any = {};
    if (studioActual?.google_integrations_config) {
      try {
        integrationsConfig = typeof studioActual.google_integrations_config === 'string'
          ? JSON.parse(studioActual.google_integrations_config)
          : studioActual.google_integrations_config;
      } catch {
        integrationsConfig = {};
      }
    }

    // Actualizar configuración según los scopes
    if (hasDriveScope) {
      integrationsConfig.drive = { enabled: true };
    }
    if (hasCalendarScope) {
      integrationsConfig.calendar = { enabled: true };
    }

    // Actualizar studio con tokens de Google
    // IMPORTANTE: Esto sobrescribe cualquier conexión existente
    // El usuario está explícitamente conectando una nueva cuenta
    await prisma.studios.update({
      where: { id: studio.id },
      data: {
        google_oauth_refresh_token: encryptedToken,
        google_oauth_email: googleEmail, // Email de Google (puede ser diferente al del usuario)
        google_oauth_name: googleName, // Nombre de la cuenta de Google
        google_oauth_scopes: JSON.stringify(scopesFinales),
        is_google_connected: true,
        google_integrations_config: integrationsConfig,
      },
    });

    return {
      success: true,
      studioSlug,
    };
  } catch (error) {
    console.error('[vincularRecursoGoogle] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al vincular recurso de Google',
    };
  }
}

/**
 * Inicia flujo OAuth para vincular recurso de Google a un Studio
 * INDEPENDIENTE de la cuenta de sesión del usuario
 * 
 * Permite que un usuario autenticado con Cuenta A
 * conecte Calendar/Drive de Cuenta B al Studio
 */
export async function iniciarVinculacionRecursoGoogle(studioSlug: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Verificar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: 'Studio no encontrado',
      };
    }

    // Crear state con información del flujo
    const state = Buffer.from(
      JSON.stringify({
        type: 'link_resource',
        studioSlug,
      })
    ).toString('base64');

    // Construir URL de OAuth
    // NOTA: Esta función debe ser llamada desde el cliente
    // porque supabase.auth.signInWithOAuth() requiere contexto del navegador
    // Retornamos la URL para que el cliente la use
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${baseUrl}/auth/callback`;
    
    const scopes =
      'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

    // Construir URL manualmente (el cliente usará signInWithOAuth)
    // Esta función solo valida y prepara los parámetros
    return {
      success: true,
      url: `#state=${state}&scopes=${encodeURIComponent(scopes)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    };
  } catch (error) {
    console.error('[iniciarVinculacionRecursoGoogle] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al iniciar vinculación de recurso',
    };
  }
}

