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
// HELPERS
// ============================================

/** Genera slug a partir del nombre: minúsculas, sin acentos ni caracteres especiales */
function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================
// PASO 2: CREAR STUDIO + SUSCRIPCIÓN
// ============================================

const TRIAL_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function createStudioAndSubscription(
  userId: string,
  data: unknown
) {
  try {
    const validated = SignupStep2Schema.parse(data);
    const supabase = await createClient();

    const { areNewStudiosAllowed } = await import('@/lib/utils/studio-access');
    if (!areNewStudiosAllowed()) {
      return {
        success: false,
        error: "Los registros de nuevos estudios están temporalmente deshabilitados. Estamos en desarrollo y próximamente estaremos disponibles.",
      };
    }

    // Slug desde studio_name: minúsculas, sin espacios/caracteres especiales
    const slug = normalizeSlug(validated.studio_slug.trim() || validated.studio_name);

    const existingStudio = await prisma.studios.findUnique({
      where: { slug },
    });
    if (existingStudio) {
      return { success: false, error: "El slug ya está en uso" };
    }

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

    const trialPlan = await prisma.platform_plans.findFirst({
      where: { slug: "trial", active: true },
    });
    if (!trialPlan) {
      throw new Error("Plan trial no encontrado en la base de datos");
    }

    const now = new Date();
    const subscriptionEnd = new Date(now.getTime() + TRIAL_DAYS_MS);
    const studioEmail = validated.studio_email ?? dbUser.email;

    // Transacción atómica: studio (con trial 7 días) + OWNER + SUSCRIPTOR + studio_user_profiles
    const studio = await prisma.$transaction(async (tx) => {
      const newStudio = await tx.studios.create({
        data: {
          studio_name: validated.studio_name,
          slug,
          email: studioEmail,
          slogan: validated.studio_slogan ?? undefined,
          logo_url: validated.logo_url ?? undefined,
          is_active: true,
          plan_id: trialPlan.id,
          subscription_status: "TRIAL",
          subscription_start: now,
          subscription_end: subscriptionEnd,
        },
      });

      await tx.user_studio_roles.create({
        data: {
          user_id: dbUser!.id,
          studio_id: newStudio.id,
          role: "OWNER",
          is_active: true,
          accepted_at: now,
        },
      });

      await tx.user_platform_roles.upsert({
        where: {
          user_id_role: { user_id: dbUser!.id, role: "SUSCRIPTOR" },
        },
        create: {
          user_id: dbUser!.id,
          role: "SUSCRIPTOR",
          is_active: true,
        },
        update: { is_active: true },
      });

      await tx.studio_user_profiles.updateMany({
        where: { supabase_id: userId },
        data: { studio_id: newStudio.id },
      });

      return newStudio;
    });

    // [SEED-AUDIT-REQUIRED] Event Pipeline Stages updated on Phase 4.4/5.1
    // Pipeline de eventos (manager stages): 5 etapas estándar + Archivado
    const eventPipelineStages = [
      { name: 'Planeación', slug: 'planeacion', color: '#3B82F6', order: 10, stage_type: 'PLANNING' as const },
      { name: 'Producción', slug: 'produccion', color: '#10B981', order: 20, stage_type: 'PRODUCTION' as const },
      { name: 'Edición', slug: 'edicion', color: '#F59E0B', order: 30, stage_type: 'PRODUCTION' as const },
      { name: 'Revisión Interna', slug: 'revision-interna', color: '#8B5CF6', order: 40, stage_type: 'REVIEW' as const },
      { name: 'Entrega', slug: 'entrega', color: '#06B6D4', order: 50, stage_type: 'DELIVERY' as const },
      { name: 'Archivado', slug: 'archivado', color: '#71717a', order: 100, stage_type: 'ARCHIVED' as const, is_system: true },
    ];
    await prisma.studio_manager_pipeline_stages.createMany({
      data: eventPipelineStages.map((s) => ({
        studio_id: studio.id,
        name: s.name,
        slug: s.slug,
        color: s.color,
        order: s.order,
        stage_type: s.stage_type,
        is_active: true,
        is_system: s.is_system ?? false,
      })),
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

    await supabase.auth.updateUser({
      data: {
        studio_slug: slug,
        role: "suscriptor",
      },
    });

    revalidatePath(`/${slug}/studio`);

    return {
      success: true,
      studio_slug: slug,
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

