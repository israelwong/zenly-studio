"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

    // Verificar que el slug no existe
    const existingStudio = await prisma.studios.findUnique({
      where: { slug: validated.studio_slug },
    });

    if (existingStudio) {
      return { success: false, error: "El slug ya está en uso" };
    }

    // Crear studio
    const studio = await prisma.studios.create({
      data: {
        name: validated.studio_name,
        slug: validated.studio_slug,
        slogan: validated.studio_slogan,
        logo_url: validated.logo_url,
        is_active: true,
      },
    });

    // Actualizar studio_user_profiles con studio_id
    await prisma.studio_user_profiles.updateMany({
      where: { supabase_id: userId },
      data: { studio_id: studio.id },
    });

    // Crear suscripción freemium (obtener plan FREE)
    const freePlan = await prisma.platform_plans.findFirst({
      where: {
        slug: "free",
        is_active: true,
      },
    });

    if (!freePlan) {
      throw new Error("Plan FREE no encontrado");
    }

    await prisma.subscriptions.create({
      data: {
        studio_id: studio.id,
        plan_id: freePlan.id,
        status: "ACTIVE",
        started_at: new Date(),
      },
    });

    // Activar módulos core incluidos en FREE
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

    // Actualizar metadata de Supabase Auth con studio_slug
    await supabase.auth.updateUser({
      data: {
        studio_slug: validated.studio_slug,
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

