"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEFAULT_AVISO_PRIVACIDAD_TITLE, DEFAULT_AVISO_PRIVACIDAD_VERSION, DEFAULT_AVISO_PRIVACIDAD_CONTENT } from "@/lib/constants/aviso-privacidad-default";

// ============================================
// SCHEMAS VALIDACIÓN
// ============================================

const SignupStep1Schema = z.object({
  full_name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Teléfono inválido"),
  password: z.string().min(8, "Contraseña debe tener al menos 8 caracteres"),
});

const SignupStep2Schema = z.object({
  studio_name: z.string().min(2, "Nombre del negocio requerido"),
  studio_slug: z
    .string()
    .min(3, "Slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  studio_slogan: z.string().optional(),
  studio_email: z.string().email("Email del estudio inválido").optional(),
  logo_url: z.string().url().optional(),
});

type SignupStep1Data = z.infer<typeof SignupStep1Schema>;
type SignupStep2Data = z.infer<typeof SignupStep2Schema>;

// ============================================
// PASO 1: CREAR USUARIO AUTH
// ============================================

export async function createAuthUser(data: unknown) {
  try {
    const validated = SignupStep1Schema.parse(data);
    const supabase = await createClient();

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          full_name: validated.full_name,
          phone: validated.phone,
          role: "suscriptor", // Freemium por defecto
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("No se pudo crear el usuario");

    // Crear perfil en studio_user_profiles
    await prisma.studio_user_profiles.create({
      data: {
        email: validated.email,
        supabase_id: authData.user.id,
        full_name: validated.full_name,
        role: "SUSCRIPTOR",
        is_active: true,
      },
    });

    return {
      success: true,
      user_id: authData.user.id,
      email: validated.email,
    };
  } catch (error) {
    console.error("[createAuthUser] Error:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================
// PASO 2: CREAR STUDIO + SUSCRIPCIÓN
// ============================================

export async function createStudioAndSubscription(
  userId: string,
  data: unknown
) {
  try {
    const validated = SignupStep2Schema.parse(data);
    const supabase = await createClient();

    // Verificar si se permiten nuevos registros
    const { areNewStudiosAllowed } = await import('@/lib/utils/studio-access');
    if (!areNewStudiosAllowed()) {
      return {
        success: false,
        error: "Los registros de nuevos estudios están temporalmente deshabilitados. Estamos en desarrollo y próximamente estaremos disponibles.",
      };
    }

    // Verificar que el slug no existe
    const existingStudio = await prisma.studios.findUnique({
      where: { slug: validated.studio_slug },
    });

    if (existingStudio) {
      return { success: false, error: "El slug ya está en uso" };
    }

    // Obtener o crear usuario en tabla users (necesario para user_studio_roles y user_platform_roles)
    let dbUser = await prisma.users.findUnique({
      where: { supabase_id: userId },
      select: { id: true, email: true },
    });

    if (!dbUser) {
      const profile = await prisma.studio_user_profiles.findUnique({
        where: { supabase_id: userId },
        select: { email: true, full_name: true, avatar_url: true },
      });
      if (!profile) {
        return {
          success: false,
          error: "No se encontró perfil de usuario. Inicia sesión de nuevo.",
        };
      }
      const newUser = await prisma.users.create({
        data: {
          supabase_id: userId,
          email: profile.email,
          full_name: profile.full_name ?? undefined,
          avatar_url: profile.avatar_url ?? undefined,
          is_active: true,
        },
      });
      dbUser = { id: newUser.id, email: newUser.email };
    }

    const studioEmail =
      validated.studio_email ?? dbUser.email;

    // Crear studio (campos según esquema Prisma)
    const studio = await prisma.studios.create({
      data: {
        studio_name: validated.studio_name,
        slug: validated.studio_slug,
        email: studioEmail,
        slogan: validated.studio_slogan ?? undefined,
        logo_url: validated.logo_url ?? undefined,
        is_active: true,
      },
    });

    // Asignar rol OWNER en user_studio_roles (dueño del estudio en BD)
    await prisma.user_studio_roles.create({
      data: {
        user_id: dbUser.id,
        studio_id: studio.id,
        role: "OWNER",
        is_active: true,
        accepted_at: new Date(),
      },
    });

    // Asegurar rol SUSCRIPTOR en user_platform_roles (proxy y rutas)
    await prisma.user_platform_roles.upsert({
      where: {
        user_id_role: { user_id: dbUser.id, role: "SUSCRIPTOR" },
      },
      create: {
        user_id: dbUser.id,
        role: "SUSCRIPTOR",
        is_active: true,
      },
      update: { is_active: true },
    });

    // Actualizar studio_user_profiles con studio_id
    await prisma.studio_user_profiles.updateMany({
      where: { supabase_id: userId },
      data: { studio_id: studio.id },
    });

    // Asignar plan trial al estudio (7 días; sin fila en subscriptions hasta Stripe)
    const trialPlan = await prisma.platform_plans.findFirst({
      where: {
        slug: "trial",
        active: true,
      },
    });

    if (!trialPlan) {
      throw new Error("Plan trial no encontrado en la base de datos");
    }

    // Actualizar estudio con plan y estado trial (subscription_start/end = 7 días)
    await prisma.studios.update({
      where: { id: studio.id },
      data: {
        plan_id: trialPlan.id,
        subscription_status: "TRIAL",
        subscription_start: new Date(),
        subscription_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días de trial
      },
    });

    // Activar módulos core incluidos en el plan trial
    const coreModules = await prisma.platform_modules.findMany({
      where: {
        category: "CORE",
        is_active: true,
      },
    });

    for (const module of coreModules) {
      await prisma.studio_modules.create({
        data: {
          studio_id: studio.id,
          module_id: module.id,
          is_active: true,
        },
      });
    }

    // Sembrar métodos de pago básicos
    const { sembrarMetodosPagoBasicos } = await import('@/lib/actions/studio/config/metodos-pago-sembrados.actions');
    await sembrarMetodosPagoBasicos(studio.id);

    // Crear aviso de privacidad por defecto
    await prisma.studio_avisos_privacidad.create({
      data: {
        studio_id: studio.id,
        title: DEFAULT_AVISO_PRIVACIDAD_TITLE,
        content: DEFAULT_AVISO_PRIVACIDAD_CONTENT,
        version: DEFAULT_AVISO_PRIVACIDAD_VERSION,
        is_active: true,
      },
    });

    // Sincronizar metadata de Supabase (Proxy usa studio_slug y role para acceso a /[slug]/studio)
    await supabase.auth.updateUser({
      data: {
        studio_slug: validated.studio_slug,
        role: "suscriptor",
      },
    });

    revalidatePath(`/${validated.studio_slug}/studio`);

    return {
      success: true,
      studio_slug: validated.studio_slug,
    };
  } catch (error) {
    console.error("[createStudioAndSubscription] Error:", error);

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================
// ACCIÓN UNIFICADA (OPCIONAL - 1 PASO)
// ============================================

export async function createUserAccount(data: unknown) {
  try {
    const fullData = z
      .object({
        ...SignupStep1Schema.shape,
        ...SignupStep2Schema.shape,
      })
      .parse(data);

    // Paso 1: Auth
    const authResult = await createAuthUser({
      full_name: fullData.full_name,
      email: fullData.email,
      phone: fullData.phone,
      password: fullData.password,
    });

    if (!authResult.success || !authResult.user_id) {
      return authResult;
    }

    // Paso 2: Studio
    const studioResult = await createStudioAndSubscription(authResult.user_id, {
      studio_name: fullData.studio_name,
      studio_slug: fullData.studio_slug,
      studio_slogan: fullData.studio_slogan,
      logo_url: fullData.logo_url,
    });

    return studioResult;
  } catch (error) {
    console.error("[createUserAccount] Error:", error);

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

