'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResponse } from '@/lib/actions/schemas/promises-schemas';

// Schemas
const createPromiseTagSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color inválido').default('#3B82F6'),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});

const updatePromiseTagSchema = createPromiseTagSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreatePromiseTagData = z.infer<typeof createPromiseTagSchema>;
export type UpdatePromiseTagData = z.infer<typeof updatePromiseTagSchema>;

export interface PromiseTag {
  id: string;
  studio_id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  usage_count?: number;
}

export interface PromiseTagsResponse {
  success: boolean;
  data?: PromiseTag[];
  error?: string;
}

export interface PromiseTagResponse {
  success: boolean;
  data?: PromiseTag;
  error?: string;
}

/**
 * Obtener todos los tags del studio
 */
export async function getPromiseTags(
  studioSlug: string
): Promise<PromiseTagsResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const tags = await prisma.studio_promise_tags.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            promises: true,
          },
        },
      },
    });

    const promiseTags: PromiseTag[] = tags.map((tag) => ({
      id: tag.id,
      studio_id: tag.studio_id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      description: tag.description,
      order: tag.order,
      is_active: tag.is_active,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      usage_count: tag._count.promises,
    }));

    return { success: true, data: promiseTags };
  } catch (error) {
    console.error('Error obteniendo tags:', error);
    return { success: false, error: 'Error al obtener tags' };
  }
}

/**
 * Crear un nuevo tag
 */
export async function createPromiseTag(
  studioSlug: string,
  data: CreatePromiseTagData
): Promise<PromiseTagResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const validated = createPromiseTagSchema.parse(data);

    // Generar slug único
    const baseSlug = validated.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.studio_promise_tags.findUnique({
        where: {
          studio_id_slug: {
            studio_id: studio.id,
            slug,
          },
        },
      });

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const tag = await prisma.studio_promise_tags.create({
      data: {
        studio_id: studio.id,
        name: validated.name,
        slug,
        color: validated.color,
        description: validated.description || null,
        order: validated.order,
      },
    });

    const promiseTag: PromiseTag = {
      id: tag.id,
      studio_id: tag.studio_id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      description: tag.description,
      order: tag.order,
      is_active: tag.is_active,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true, data: promiseTag };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Error de validación' };
    }
    console.error('Error creando tag:', error);
    return { success: false, error: 'Error al crear tag' };
  }
}

/**
 * Actualizar un tag
 */
export async function updatePromiseTag(
  studioSlug: string,
  data: UpdatePromiseTagData
): Promise<PromiseTagResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const validated = updatePromiseTagSchema.parse(data);

    const updateData: {
      name?: string;
      color?: string;
      description?: string | null;
      order?: number;
    } = {};

    if (validated.name !== undefined) {
      updateData.name = validated.name;
      // Si cambia el nombre, actualizar slug
      const baseSlug = validated.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await prisma.studio_promise_tags.findUnique({
          where: {
            studio_id_slug: {
              studio_id: studio.id,
              slug,
            },
          },
        });

        if (!existing || existing.id === validated.id) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      await prisma.studio_promise_tags.update({
        where: { id: validated.id },
        data: { slug },
      });
    }

    if (validated.color !== undefined) updateData.color = validated.color;
    if (validated.description !== undefined) updateData.description = validated.description || null;
    if (validated.order !== undefined) updateData.order = validated.order;

    const tag = await prisma.studio_promise_tags.update({
      where: { id: validated.id },
      data: updateData,
    });

    const promiseTag: PromiseTag = {
      id: tag.id,
      studio_id: tag.studio_id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      description: tag.description,
      order: tag.order,
      is_active: tag.is_active,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true, data: promiseTag };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Error de validación' };
    }
    console.error('Error actualizando tag:', error);
    return { success: false, error: 'Error al actualizar tag' };
  }
}

/**
 * Eliminar un tag (soft delete)
 */
export async function deletePromiseTag(
  studioSlug: string,
  tagId: string
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Soft delete
    await prisma.studio_promise_tags.update({
      where: { id: tagId },
      data: { is_active: false },
    });

    // Eliminar relaciones con promesas
    await prisma.studio_promises_tags.deleteMany({
      where: { tag_id: tagId },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true };
  } catch (error) {
    console.error('Error eliminando tag:', error);
    return { success: false, error: 'Error al eliminar tag' };
  }
}

/**
 * Obtener tags de una promesa específica
 */
export async function getPromiseTagsByPromiseId(
  promiseId: string
): Promise<PromiseTagsResponse> {
  try {
    const promiseTags = await prisma.studio_promises_tags.findMany({
      where: { promise_id: promiseId },
      include: {
        tag: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const tags: PromiseTag[] = promiseTags
      .map((pt) => pt.tag)
      .filter((tag) => tag.is_active)
      .map((tag) => ({
        id: tag.id,
        studio_id: tag.studio_id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        description: tag.description,
        order: tag.order,
        is_active: tag.is_active,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      }));

    return { success: true, data: tags };
  } catch (error) {
    console.error('Error obteniendo tags de promesa:', error);
    return { success: false, error: 'Error al obtener tags de promesa' };
  }
}

/**
 * Agregar un tag a una promesa
 */
export async function addTagToPromise(
  promiseId: string,
  tagId: string
): Promise<ActionResponse<void>> {
  try {
    // Verificar que la promesa existe
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Verificar que el tag existe y está activo
    const tag = await prisma.studio_promise_tags.findUnique({
      where: { id: tagId },
    });

    if (!tag || !tag.is_active) {
      return { success: false, error: 'Tag no encontrado o inactivo' };
    }

    // Verificar que no existe ya la relación
    const existing = await prisma.studio_promises_tags.findFirst({
      where: {
        promise_id: promiseId,
        tag_id: tagId,
      },
    });

    if (existing) {
      return { success: false, error: 'El tag ya está asignado a esta promesa' };
    }

    await prisma.studio_promises_tags.create({
      data: {
        promise_id: promiseId,
        tag_id: tagId,
      },
    });

    revalidatePath(`/studio/commercial/promises`);
    return { success: true };
  } catch (error) {
    console.error('Error agregando tag a promesa:', error);
    return { success: false, error: 'Error al agregar tag' };
  }
}

/**
 * Remover un tag de una promesa
 */
export async function removeTagFromPromise(
  promiseId: string,
  tagId: string
): Promise<ActionResponse<void>> {
  try {
    const relation = await prisma.studio_promises_tags.findFirst({
      where: {
        promise_id: promiseId,
        tag_id: tagId,
      },
    });

    if (!relation) {
      return { success: false, error: 'La relación no existe' };
    }

    await prisma.studio_promises_tags.delete({
      where: { id: relation.id },
    });

    revalidatePath(`/studio/commercial/promises`);
    return { success: true };
  } catch (error) {
    console.error('Error removiendo tag de promesa:', error);
    return { success: false, error: 'Error al remover tag' };
  }
}

/**
 * Crear o encontrar tag por nombre y agregarlo a promesa
 */
export async function createOrFindTagAndAddToPromise(
  studioSlug: string,
  promiseId: string,
  tagName: string
): Promise<ActionResponse<PromiseTag>> {
  try {
    console.log('createOrFindTagAndAddToPromise:', { studioSlug, promiseId, tagName });

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      console.error('Studio no encontrado:', studioSlug);
      return { success: false, error: 'Studio no encontrado' };
    }

    // Normalizar nombre
    const normalizedName = tagName.trim();
    if (!normalizedName) {
      return { success: false, error: 'El nombre del tag no puede estar vacío' };
    }

    // Generar slug
    const baseSlug = normalizedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    console.log('Buscando tag con slug:', baseSlug);

    // Buscar tag existente por slug
    let tag = await prisma.studio_promise_tags.findUnique({
      where: {
        studio_id_slug: {
          studio_id: studio.id,
          slug: baseSlug,
        },
      },
    });

    // Si no existe, crearlo
    if (!tag) {
      console.log('Creando nuevo tag:', { name: normalizedName, slug: baseSlug });
      tag = await prisma.studio_promise_tags.create({
        data: {
          studio_id: studio.id,
          name: normalizedName,
          slug: baseSlug,
          color: '#3B82F6',
          order: 0,
        },
      });
      console.log('Tag creado:', tag.id);
    } else if (!tag.is_active) {
      // Si existe pero está inactivo, reactivarlo
      console.log('Reactivando tag inactivo:', tag.id);
      tag = await prisma.studio_promise_tags.update({
        where: { id: tag.id },
        data: { is_active: true },
      });
    } else {
      console.log('Tag existente encontrado:', tag.id);
    }

    // Verificar que la promesa existe
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { id: true },
    });

    if (!promise) {
      console.error('Promesa no encontrada:', promiseId);
      return { success: false, error: 'Promesa no encontrada' };
    }

    console.log('Verificando relación:', { promiseId, tagId: tag.id });

    // Agregar a la promesa si no está ya asignado
    const existingRelation = await prisma.studio_promises_tags.findFirst({
      where: {
        promise_id: promiseId,
        tag_id: tag.id,
      },
    });

    if (!existingRelation) {
      try {
        console.log('Creando relación entre promesa y tag...');
        const relation = await prisma.studio_promises_tags.create({
          data: {
            promise_id: promiseId,
            tag_id: tag.id,
          },
        });
        console.log('✅ Relación creada exitosamente:', relation.id);

        // Verificar que realmente se guardó
        const verifyRelation = await prisma.studio_promises_tags.findUnique({
          where: { id: relation.id },
        });
        console.log('✅ Verificación de relación guardada:', verifyRelation ? 'OK' : 'FALLO');
      } catch (relationError) {
        console.error('❌ Error creando relación:', relationError);
        // Si falla por constraint único, verificar si ya existe
        const checkRelation = await prisma.studio_promises_tags.findFirst({
          where: {
            promise_id: promiseId,
            tag_id: tag.id,
          },
        });
        if (!checkRelation) {
          console.error('❌ Relación no existe después del error, lanzando error');
          throw relationError;
        } else {
          console.log('⚠️ Relación ya existe (race condition)');
        }
      }
    } else {
      console.log('ℹ️ Relación ya existe:', existingRelation.id);
    }

    const promiseTag: PromiseTag = {
      id: tag.id,
      studio_id: tag.studio_id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      description: tag.description,
      order: tag.order,
      is_active: tag.is_active,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    };

    console.log('✅ Retornando tag:', promiseTag.id, promiseTag.name);

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    return { success: true, data: promiseTag };
  } catch (error) {
    console.error('Error creando/buscando tag:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al crear o buscar tag' };
  }
}

