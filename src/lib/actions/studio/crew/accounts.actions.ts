'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CrewAccountCreateSchema } from '@/lib/actions/schemas/crew-schemas';

/**
 * Crear cuenta de acceso para crew member (para panel personal)
 */
export async function crearCrewAccount(
  studioSlug: string,
  crewMemberId: string,
  data: Record<string, unknown>
) {
  try {
    const validated = CrewAccountCreateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el crew member existe
    const crew = await prisma.studio_crew_members.findFirst({
      where: {
        id: crewMemberId,
        studio_id: studio.id,
      },
    });

    if (!crew) {
      return { success: false, error: 'Crew member no encontrado' };
    }

    // Verificar que no tenga account ya
    const existing = await prisma.studio_crew_member_account.findUnique({
      where: { crew_member_id: crewMemberId },
    });

    if (existing) {
      return { success: false, error: 'Este crew member ya tiene una cuenta' };
    }

    // Verificar que el email no esté usado
    const emailInUse = await prisma.studio_crew_member_account.findUnique({
      where: { email: validated.email },
    });

    if (emailInUse) {
      return { success: false, error: 'Este email ya está registrado' };
    }

    const account = await prisma.studio_crew_member_account.create({
      data: {
        crew_member_id: crewMemberId,
        email: validated.email,
        is_active: false, // Inactivo hasta que confirme email
      },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: account };
  } catch (error) {
    console.error('[CREW ACCOUNTS] Error creando account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear account',
    };
  }
}

/**
 * Activar cuenta de crew member
 */
export async function activarCrewAccount(
  studioSlug: string,
  accountId: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la account existe y pertenece al studio
    const account = await prisma.studio_crew_member_account.findFirst({
      where: {
        id: accountId,
        crew_member: { studio_id: studio.id },
      },
    });

    if (!account) {
      return { success: false, error: 'Cuenta no encontrada' };
    }

    const updated = await prisma.studio_crew_member_account.update({
      where: { id: accountId },
      data: { is_active: true },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: updated };
  } catch (error) {
    console.error('[CREW ACCOUNTS] Error activando account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al activar account',
    };
  }
}

/**
 * Desactivar cuenta de crew member
 */
export async function desactivarCrewAccount(
  studioSlug: string,
  accountId: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const account = await prisma.studio_crew_member_account.findFirst({
      where: {
        id: accountId,
        crew_member: { studio_id: studio.id },
      },
    });

    if (!account) {
      return { success: false, error: 'Cuenta no encontrada' };
    }

    const updated = await prisma.studio_crew_member_account.update({
      where: { id: accountId },
      data: { is_active: false },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: updated };
  } catch (error) {
    console.error('[CREW ACCOUNTS] Error desactivando account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desactivar account',
    };
  }
}

/**
 * Obtener account de un crew member
 */
export async function obtenerCrewAccount(
  studioSlug: string,
  crewMemberId: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const account = await prisma.studio_crew_member_account.findFirst({
      where: {
        crew_member_id: crewMemberId,
        crew_member: { studio_id: studio.id },
      },
    });

    return { success: true, data: account || null };
  } catch (error) {
    console.error('[CREW ACCOUNTS] Error obteniendo account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener account',
    };
  }
}

/**
 * Cambiar email de la cuenta
 */
export async function cambiarEmailCrewAccount(
  studioSlug: string,
  accountId: string,
  newEmail: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const account = await prisma.studio_crew_member_account.findFirst({
      where: {
        id: accountId,
        crew_member: { studio_id: studio.id },
      },
    });

    if (!account) {
      return { success: false, error: 'Cuenta no encontrada' };
    }

    // Verificar que el nuevo email no esté usado
    const emailInUse = await prisma.studio_crew_member_account.findFirst({
      where: {
        email: newEmail,
        id: { not: accountId },
      },
    });

    if (emailInUse) {
      return { success: false, error: 'Este email ya está registrado' };
    }

    const updated = await prisma.studio_crew_member_account.update({
      where: { id: accountId },
      data: { email: newEmail },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: updated };
  } catch (error) {
    console.error('[CREW ACCOUNTS] Error cambiando email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cambiar email',
    };
  }
}

/**
 * Registrar último login
 */
export async function registrarCrewLogin(accountId: string) {
  try {
    await prisma.studio_crew_member_account.update({
      where: { id: accountId },
      data: { last_login: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('[CREW ACCOUNTS] Error registrando login:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar login',
    };
  }
}

