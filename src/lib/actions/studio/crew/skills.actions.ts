'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CrewSkillCreateSchema, CrewSkillUpdateSchema } from '@/lib/actions/schemas/crew-schemas';

/**
 * Obtener todas las skills de un studio
 */
export async function obtenerCrewSkills(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const skills = await prisma.studio_crew_skills.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      orderBy: { order: 'asc' },
    });

    return { success: true, data: skills };
  } catch (error) {
    console.error('[CREW SKILLS] Error obteniendo skills:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener skills',
    };
  }
}

/**
 * Crear nueva skill
 */
export async function crearCrewSkill(
  studioSlug: string,
  data: Record<string, unknown>
) {
  try {
    const validated = CrewSkillCreateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que no exista una skill con el mismo nombre
    const existing = await prisma.studio_crew_skills.findFirst({
      where: {
        studio_id: studio.id,
        name: { equals: validated.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      return { success: false, error: 'Esta skill ya existe' };
    }

    // Obtener el orden máximo para agregar al final
    const maxOrder = await prisma.studio_crew_skills.findFirst({
      where: { studio_id: studio.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const skill = await prisma.studio_crew_skills.create({
      data: {
        studio_id: studio.id,
        name: validated.name,
        color: validated.color || null,
        icono: validated.icono || null,
        order: (maxOrder?.order ?? -1) + 1,
      },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: skill };
  } catch (error) {
    console.error('[CREW SKILLS] Error creando skill:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear skill',
    };
  }
}

/**
 * Actualizar skill
 */
export async function actualizarCrewSkill(
  studioSlug: string,
  skillId: string,
  data: Record<string, unknown>
) {
  try {
    const validated = CrewSkillUpdateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const skill = await prisma.studio_crew_skills.update({
      where: { id: skillId },
      data: {
        name: validated.name,
        color: validated.color || null,
        icono: validated.icono || null,
      },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: skill };
  } catch (error) {
    console.error('[CREW SKILLS] Error actualizando skill:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar skill',
    };
  }
}

/**
 * Contar cuántos miembros tienen una skill asignada
 */
export async function contarMiembrosConSkill(
  studioSlug: string,
  skillId: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const count = await prisma.studio_crew_member_skills.count({
      where: {
        skill_id: skillId,
        crew_member: {
          studio_id: studio.id,
          status: 'activo',
        },
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error('[CREW SKILLS] Error contando miembros:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al contar miembros',
      count: 0,
    };
  }
}

/**
 * Eliminar skill (soft delete)
 */
export async function eliminarCrewSkill(
  studioSlug: string,
  skillId: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    await prisma.studio_crew_skills.update({
      where: { id: skillId },
      data: { is_active: false },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true };
  } catch (error) {
    console.error('[CREW SKILLS] Error eliminando skill:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar skill',
    };
  }
}

/**
 * Asignar skill a un crew member
 */
export async function asignarSkillAlCrew(
  studioSlug: string,
  crewMemberId: string,
  skillId: string,
  isPrimary: boolean = false
) {
  try {
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

    // Verificar que la skill existe
    const skill = await prisma.studio_crew_skills.findFirst({
      where: {
        id: skillId,
        studio_id: studio.id,
      },
    });

    if (!skill) {
      return { success: false, error: 'Skill no encontrada' };
    }

    // Verificar que no esté ya asignada
    const existing = await prisma.studio_crew_member_skills.findFirst({
      where: {
        crew_member_id: crewMemberId,
        skill_id: skillId,
      },
    });

    if (existing) {
      return { success: false, error: 'Esta skill ya está asignada' };
    }

    // Si es primary, desactivar primary en otras
    if (isPrimary) {
      await prisma.studio_crew_member_skills.updateMany({
        where: { crew_member_id: crewMemberId },
        data: { is_primary: false },
      });
    }

    const assignment = await prisma.studio_crew_member_skills.create({
      data: {
        crew_member_id: crewMemberId,
        skill_id: skillId,
        is_primary: isPrimary,
      },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: assignment };
  } catch (error) {
    console.error('[CREW SKILLS] Error asignando skill:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al asignar skill',
    };
  }
}

/**
 * Remover skill de un crew member
 */
export async function removerSkillDelCrew(
  studioSlug: string,
  crewMemberId: string,
  skillId: string
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    await prisma.studio_crew_member_skills.delete({
      where: {
        crew_member_id_skill_id: {
          crew_member_id: crewMemberId,
          skill_id: skillId,
        },
      },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true };
  } catch (error) {
    console.error('[CREW SKILLS] Error removiendo skill:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al remover skill',
    };
  }
}

/**
 * Reordenar skills (actualizar order)
 */
export async function reordenarCrewSkills(
  studioSlug: string,
  skillOrders: Array<{ id: string; order: number }>
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    await Promise.all(
      skillOrders.map(({ id, order }) =>
        prisma.studio_crew_skills.update({
          where: { id },
          data: { order },
        })
      )
    );

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true };
  } catch (error) {
    console.error('[CREW SKILLS] Error reordenando skills:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar skills',
    };
  }
}

