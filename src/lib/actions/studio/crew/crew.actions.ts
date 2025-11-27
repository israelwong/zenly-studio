'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CrewMemberCreateSchema, CrewMemberUpdateSchema } from '@/lib/actions/schemas/crew-schemas';

/**
 * Obtener todos los crew members de un studio
 */
export async function obtenerCrewMembers(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const crew = await prisma.studio_crew_members.findMany({
      where: {
        studio_id: studio.id,
        status: 'activo',
      },
      include: {
        skills: {
          include: {
            skill: {
              select: { id: true, name: true, color: true, icono: true },
            },
          },
          orderBy: { is_primary: 'desc' },
        },
        account: {
          select: {
            id: true,
            email: true,
            is_active: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: crew.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        emergency_phone: member.emergency_phone,
        tipo: member.tipo,
        status: member.status,
        fixed_salary: member.fixed_salary ? Number(member.fixed_salary) : null,
        variable_salary: member.variable_salary ? Number(member.variable_salary) : null,
        skills: member.skills.map((s) => ({
          id: s.skill.id,
          name: s.skill.name,
          color: s.skill.color,
          icono: s.skill.icono,
          is_primary: s.is_primary,
        })),
        account: member.account
          ? {
              id: member.account.id,
              email: member.account.email,
              is_active: member.account.is_active,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error('[CREW] Error obteniendo crew members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener crew members',
    };
  }
}

/**
 * Obtener un crew member específico
 */
export async function obtenerCrewMember(studioSlug: string, crewMemberId: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const crew = await prisma.studio_crew_members.findFirst({
      where: {
        id: crewMemberId,
        studio_id: studio.id,
      },
      include: {
        skills: {
          include: {
            skill: { select: { id: true, name: true } },
          },
        },
        account: {
          select: { id: true, email: true, is_active: true },
        },
      },
    });

    if (!crew) {
      return { success: false, error: 'Crew member no encontrado' };
    }

    return { success: true, data: crew };
  } catch (error) {
    console.error('[CREW] Error obteniendo crew member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener crew member',
    };
  }
}

/**
 * Crear nuevo crew member
 */
export async function crearCrewMember(
  studioSlug: string,
  data: Record<string, unknown>
) {
  try {
    const validated = CrewMemberCreateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Crear crew member
    const crew = await prisma.studio_crew_members.create({
      data: {
        studio_id: studio.id,
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        tipo: validated.tipo,
        fixed_salary: validated.fixed_salary || null,
        variable_salary: validated.variable_salary || null,
        status: 'activo',
      },
      include: {
        skills: {
          include: {
            skill: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Asignar skills si existen
    if (validated.skill_ids && validated.skill_ids.length > 0) {
      await Promise.all(
        validated.skill_ids.map((skillId, index) =>
          prisma.studio_crew_member_skills.create({
            data: {
              crew_member_id: crew.id,
              skill_id: skillId,
              is_primary: index === 0, // Primera skill es principal
            },
          })
        )
      );
    }

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: crew };
  } catch (error) {
    console.error('[CREW] Error creando crew member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear crew member',
    };
  }
}

/**
 * Actualizar crew member
 */
export async function actualizarCrewMember(
  studioSlug: string,
  crewMemberId: string,
  data: Record<string, unknown>
) {
  try {
    const validated = CrewMemberUpdateSchema.parse(data);

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

    // Actualizar datos básicos
    const updated = await prisma.studio_crew_members.update({
      where: { id: crewMemberId },
      data: {
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        tipo: validated.tipo,
        fixed_salary: validated.fixed_salary || null,
        variable_salary: validated.variable_salary || null,
      },
      include: {
        skills: {
          include: {
            skill: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Actualizar skills si cambiaron
    if (validated.skill_ids !== undefined) {
      // Remover skills antiguas
      await prisma.studio_crew_member_skills.deleteMany({
        where: { crew_member_id: crewMemberId },
      });

      // Agregar skills nuevas
      if (validated.skill_ids.length > 0) {
        await Promise.all(
          validated.skill_ids.map((skillId, index) =>
            prisma.studio_crew_member_skills.create({
              data: {
                crew_member_id: crewMemberId,
                skill_id: skillId,
                is_primary: index === 0,
              },
            })
          )
        );
      }
    }

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true, data: updated };
  } catch (error) {
    console.error('[CREW] Error actualizando crew member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar crew member',
    };
  }
}

/**
 * Eliminar crew member (soft delete)
 */
export async function eliminarCrewMember(
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

    // Soft delete: cambiar status a inactivo
    await prisma.studio_crew_members.update({
      where: { id: crewMemberId },
      data: { status: 'inactivo' },
    });

    revalidatePath(`/${studioSlug}/studio/crew`);
    return { success: true };
  } catch (error) {
    console.error('[CREW] Error eliminando crew member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar crew member',
    };
  }
}

