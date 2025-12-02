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
        salary_frequency: member.salary_frequency || null,
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
        salary_frequency: validated.salary_frequency || null,
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
    const updateData: {
      name: string;
      email: string | null;
      phone: string | null;
      tipo: string;
      status?: string;
      fixed_salary: number | null;
      salary_frequency: string | null;
      variable_salary: number | null;
    } = {
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      tipo: validated.tipo,
      fixed_salary: validated.fixed_salary || null,
      salary_frequency: validated.salary_frequency || null,
      variable_salary: validated.variable_salary || null,
    };

    if (validated.status !== undefined) {
      updateData.status = validated.status;
    }

    const updated = await prisma.studio_crew_members.update({
      where: { id: crewMemberId },
      data: updateData,
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
 * Verificar si un crew member tiene asociaciones (eventos/tareas)
 */
export async function checkCrewMemberAssociations(
  studioSlug: string,
  crewMemberId: string
): Promise<{
  success: boolean;
  hasAssociations: boolean;
  hasEvents: boolean;
  hasTasks: boolean;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        hasAssociations: false,
        hasEvents: false,
        hasTasks: false,
        error: 'Studio no encontrado',
      };
    }

    // Verificar items de cotización asignados (que pueden tener tareas en Gantt)
    const cotizacionItems = await prisma.studio_cotizacion_items.findMany({
      where: {
        assigned_to_crew_member_id: crewMemberId,
        cotizaciones: {
          studio_id: studio.id,
        },
      },
      select: {
        id: true,
        cotizacion_id: true,
      },
      take: 1,
    });

    // Verificar tareas de Gantt asignadas a través de cotizacion_items
    // Las tareas se relacionan con crew members a través de cotizacion_items
    const ganttTasks = await prisma.studio_gantt_event_tasks.findMany({
      where: {
        cotizacion_item: {
          assigned_to_crew_member_id: crewMemberId,
          cotizaciones: {
            studio_id: studio.id,
          },
        },
      },
      select: {
        id: true,
      },
      take: 1,
    });

    // Si hay items de cotización asignados o tareas de Gantt, hay tareas asociadas
    const hasTasks = cotizacionItems.length > 0 || ganttTasks.length > 0;
    const hasCotizacionItems = cotizacionItems.length > 0;

    // Verificar eventos asociados a través de cotizaciones
    let hasEvents = false;
    if (hasCotizacionItems) {
      const cotizacionIds = cotizacionItems.map((item) => item.cotizacion_id);
      const eventos = await prisma.studio_events.findMany({
        where: {
          studio_id: studio.id,
          cotizaciones: {
            some: {
              id: { in: cotizacionIds },
            },
          },
        },
        select: {
          id: true,
        },
        take: 1,
      });
      hasEvents = eventos.length > 0;
    }

    const hasAssociations = hasEvents || hasTasks || hasCotizacionItems;

    return {
      success: true,
      hasAssociations,
      hasEvents,
      hasTasks,
    };
  } catch (error) {
    console.error('[CREW] Error verificando asociaciones:', error);
    return {
      success: false,
      hasAssociations: false,
      hasEvents: false,
      hasTasks: false,
      error: error instanceof Error ? error.message : 'Error al verificar asociaciones',
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

/**
 * Crear crew member rápido (nombre, tipo y honorarios) - para uso desde modal rápido
 */
export async function crearCrewMemberRapido(
  studioSlug: string,
  data: {
    name: string;
    tipo: 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR';
    fixed_salary?: number | null;
    variable_salary?: number | null;
    salary_frequency?: string | null;
  }
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Validar datos mínimos
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: 'El nombre debe tener al menos 2 caracteres' };
    }

    // Validar tipo de honorarios
    if (data.fixed_salary !== undefined && data.fixed_salary !== null) {
      if (data.fixed_salary <= 0) {
        return { success: false, error: 'El monto del salario fijo debe ser mayor a 0' };
      }
      if (!data.salary_frequency) {
        return { success: false, error: 'La frecuencia de pago es obligatoria para salario fijo' };
      }
      if (!['weekly', 'biweekly', 'monthly'].includes(data.salary_frequency)) {
        return { success: false, error: 'Frecuencia de pago inválida' };
      }
    }

    // Construir datos para crear
    const createData: {
      studio_id: string;
      name: string;
      tipo: 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR';
      status: string;
      fixed_salary?: number | null;
      variable_salary?: number | null;
      salary_frequency?: string | null;
    } = {
      studio_id: studio.id,
      name: data.name.trim(),
      tipo: data.tipo,
      status: 'activo',
    };

    // Agregar datos de honorarios según el tipo
    if (data.fixed_salary !== undefined && data.fixed_salary !== null) {
      createData.fixed_salary = data.fixed_salary;
      createData.salary_frequency = data.salary_frequency || null;
      createData.variable_salary = null;
    } else {
      createData.variable_salary = data.variable_salary !== undefined ? data.variable_salary : null;
      createData.fixed_salary = null;
      createData.salary_frequency = null;
    }

    // Crear crew member
    const crew = await prisma.studio_crew_members.create({
      data: createData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tipo: true,
        status: true,
        fixed_salary: true,
        variable_salary: true,
        salary_frequency: true,
      },
    });

    // Actualizar has_crew a true si estaba en null o false
    await prisma.studios.update({
      where: { id: studio.id },
      data: { has_crew: true },
    });

    revalidatePath(`/${studioSlug}/studio/business/events`);
    revalidatePath(`/${studioSlug}/studio/configuracion`);

    return {
      success: true,
      data: {
        id: crew.id,
        name: crew.name,
        email: crew.email,
        phone: crew.phone,
        tipo: crew.tipo,
        status: crew.status,
        fixed_salary: crew.fixed_salary ? Number(crew.fixed_salary) : null,
        variable_salary: crew.variable_salary ? Number(crew.variable_salary) : null,
        salary_frequency: crew.salary_frequency,
      },
    };
  } catch (error) {
    console.error('[CREW] Error creando crew member rápido:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear personal',
    };
  }
}

/**
 * Obtener preferencia de crew del studio
 */
export async function obtenerPreferenciaCrew(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { has_crew: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    return { success: true, has_crew: studio.has_crew };
  } catch (error) {
    console.error('[CREW] Error obteniendo preferencia crew:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener preferencia',
    };
  }
}

/**
 * Actualizar preferencia de crew del studio
 */
export async function actualizarPreferenciaCrew(
  studioSlug: string,
  hasCrew: boolean | null
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    await prisma.studios.update({
      where: { id: studio.id },
      data: { has_crew: hasCrew },
    });

    revalidatePath(`/${studioSlug}/studio/business/events`);
    revalidatePath(`/${studioSlug}/studio/configuracion`);

    return { success: true };
  } catch (error) {
    console.error('[CREW] Error actualizando preferencia crew:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar preferencia',
    };
  }
}

