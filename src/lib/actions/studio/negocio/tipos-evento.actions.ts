'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
    TipoEventoSchema,
    ActualizarTipoEventoSchema,
    ActualizarOrdenTiposEventoSchema,
    type TipoEventoData,
    type TipoEventoFormData,
} from '@/lib/actions/schemas/tipos-evento-schemas';

/**
 * Obtener el ID del proyecto desde el slug
 */
async function getStudioIdFromSlug(studioSlug: string): Promise<string | null> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });
        return studio?.id || null;
    } catch (error) {
        console.error('Error obteniendo studio_id:', error);
        return null;
    }
}

/**
 * Revalidar rutas relacionadas con tipos de evento
 * Nota: Se comenta para evitar refresh completo - el estado local se actualiza en el componente
 */
function revalidateTiposEvento(studioSlug: string) {
    // No revalidar - el estado local se actualiza en el componente
    // revalidatePath(`/${studioSlug}/configuracion/negocio/tipos-evento`);
    // revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
    // revalidatePath(`/${studioSlug}/commercial/catalogo`);
}

/**
 * Obtener todos los tipos de evento de un estudio
 */
export async function obtenerTiposEvento(
    studioSlug: string
): Promise<ActionResponse<TipoEventoData[]>> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const tiposEvento = await prisma.studio_event_types.findMany({
            where: { studio_id },
            include: {
                // Eliminado packages - redundante, ya se cargan en getPaquetesShell
                _count: {
                    select: {
                        events: true,
                    },
                },
            },
            orderBy: { order: 'asc' },
        });

        const tiposEventoData: TipoEventoData[] = tiposEvento.map((tipo) => ({
            id: tipo.id,
            studio_id: tipo.studio_id,
            nombre: tipo.name,
            description: tipo.description,
            descripcion: tipo.description, // Legacy
            color: tipo.color,
            icon: tipo.icon,
            icono: tipo.icon, // Legacy
            cover_image_url: tipo.cover_image_url,
            cover_video_url: tipo.cover_video_url,
            cover_media_type: tipo.cover_media_type as 'image' | 'video' | null,
            cover_design_variant: tipo.cover_design_variant as 'solid' | 'gradient' | null,
            status: tipo.status,
            orden: tipo.order,
            createdAt: tipo.created_at,
            updatedAt: tipo.updated_at,
            paquetes: [], // Vacío - se cargan por separado en getPaquetesShell
            _count: {
                eventos: tipo._count.events,
            },
        }));

        return { success: true, data: tiposEventoData };
    } catch (error) {
        console.error('Error obteniendo tipos de evento:', error);
        return {
            success: false,
            error: 'Error al obtener los tipos de evento',
        };
    }
}

/**
 * Crear un nuevo tipo de evento
 */
export async function crearTipoEvento(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<TipoEventoData>> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const validatedData = TipoEventoSchema.parse(data);

        // Verificar que no exista un tipo con el mismo nombre
        const existente = await prisma.studio_event_types.findFirst({
            where: {
                studio_id,
                name: {
                    equals: validatedData.nombre,
                    mode: 'insensitive',
                },
            },
        });

        if (existente) {
            return {
                success: false,
                error: 'Ya existe un tipo de evento con ese nombre',
            };
        }

        // Obtener el siguiente número de posición
        const ultimoTipo = await prisma.studio_event_types.findFirst({
            where: { studio_id },
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const nuevaPosicion = ultimoTipo ? ultimoTipo.order + 1 : 0;

        const tipoEvento = await prisma.studio_event_types.create({
            data: {
                studio_id,
                name: validatedData.nombre,
                status: validatedData.status,
                order: nuevaPosicion,
                description: validatedData.description || null,
                color: validatedData.color || null,
                icon: validatedData.icon || null,
                cover_image_url: validatedData.cover_image_url || null,
                cover_video_url: validatedData.cover_video_url || null,
                cover_media_type: validatedData.cover_media_type || null,
                cover_design_variant: validatedData.cover_design_variant || null,
                updated_at: new Date(),
            },
        });

        revalidateTiposEvento(studioSlug);
        // Invalidar caché de tipos de evento y paquetes
        revalidatePath(`/${studioSlug}/studio/commercial/paquetes`);
        revalidatePath(`/${studioSlug}/studio/commercial/tipo-eventos`);
        revalidateTag(`tipos-evento-${studioSlug}`, 'max');
        revalidateTag(`paquetes-shell-${studioSlug}`, 'max');

        return {
            success: true,
            data: {
                id: tipoEvento.id,
                studio_id: tipoEvento.studio_id,
                nombre: tipoEvento.name,
                description: tipoEvento.description,
                descripcion: tipoEvento.description, // Legacy
                color: tipoEvento.color,
                icon: tipoEvento.icon,
                icono: tipoEvento.icon, // Legacy
                cover_image_url: tipoEvento.cover_image_url,
                cover_video_url: tipoEvento.cover_video_url,
                cover_media_type: tipoEvento.cover_media_type as 'image' | 'video' | null,
                status: tipoEvento.status,
                orden: tipoEvento.order,
                createdAt: tipoEvento.created_at,
                updatedAt: tipoEvento.updated_at,
                paquetes: [],
            },
        };
    } catch (error) {
        console.error('Error creando tipo de evento:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al crear el tipo de evento',
        };
    }
}

/**
 * Actualizar un tipo de evento
 */
export async function actualizarTipoEvento(
    studioSlug: string,
    tipoId: string,
    data: unknown
): Promise<ActionResponse<TipoEventoData>> {
    try {
        const validatedData = ActualizarTipoEventoSchema.parse(data);

        // Si se está actualizando el nombre, verificar que no exista duplicado
        if (validatedData.nombre) {
            const tipoActual = await prisma.studio_event_types.findUnique({
                where: { id: tipoId },
                select: { studio_id: true },
            });

            if (!tipoActual) {
                return { success: false, error: 'Tipo de evento no encontrado' };
            }

            const existente = await prisma.studio_event_types.findFirst({
                where: {
                    studio_id: tipoActual.studio_id,
                    id: { not: tipoId },
                    name: {
                        equals: validatedData.nombre,
                        mode: 'insensitive',
                    },
                },
            });

            if (existente) {
                return {
                    success: false,
                    error: 'Ya existe un tipo de evento con ese nombre',
                };
            }
        }

        const tipoEvento = await prisma.studio_event_types.update({
            where: { id: tipoId },
            data: {
                name: validatedData.nombre,
                status: validatedData.status,
                description: validatedData.description !== undefined ? validatedData.description : undefined,
                color: validatedData.color !== undefined ? validatedData.color : undefined,
                icon: validatedData.icon !== undefined ? validatedData.icon : undefined,
                cover_image_url: validatedData.cover_image_url !== undefined ? validatedData.cover_image_url : undefined,
                cover_video_url: validatedData.cover_video_url !== undefined ? validatedData.cover_video_url : undefined,
                cover_media_type: validatedData.cover_media_type !== undefined ? validatedData.cover_media_type : undefined,
                cover_design_variant: validatedData.cover_design_variant !== undefined ? validatedData.cover_design_variant : undefined,
                updated_at: new Date(),
            },
        });

        // Obtener el slug del studio para revalidar
        const studio = await prisma.studios.findUnique({
            where: { id: tipoEvento.studio_id },
            select: { slug: true },
        });

        if (studio) {
            revalidateTiposEvento(studio.slug);
            // Invalidar caché de tipos de evento y paquetes
            revalidatePath(`/${studio.slug}/studio/commercial/paquetes`);
            revalidatePath(`/${studio.slug}/studio/commercial/tipo-eventos`);
            revalidateTag(`tipos-evento-${studio.slug}`, 'max');
            revalidateTag(`paquetes-shell-${studio.slug}`, 'max');
        }

        return {
            success: true,
            data: {
                id: tipoEvento.id,
                studio_id: tipoEvento.studio_id,
                nombre: tipoEvento.name,
                description: tipoEvento.description,
                descripcion: tipoEvento.description, // Legacy
                color: tipoEvento.color,
                icon: tipoEvento.icon,
                icono: tipoEvento.icon, // Legacy
                cover_image_url: tipoEvento.cover_image_url,
                cover_video_url: tipoEvento.cover_video_url,
                cover_media_type: tipoEvento.cover_media_type as 'image' | 'video' | null,
                status: tipoEvento.status,
                orden: tipoEvento.order,
                createdAt: tipoEvento.created_at,
                updatedAt: tipoEvento.updated_at,
                paquetes: [],
            },
        };
    } catch (error) {
        console.error('Error actualizando tipo de evento:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al actualizar el tipo de evento',
        };
    }
}

/**
 * Eliminar un tipo de evento
 */
export async function eliminarTipoEvento(
    tipoId: string
): Promise<ActionResponse<{ id: string }>> {
    try {
        // Verificar si tiene paquetes asociados
        const paquetesAsociados = await prisma.studio_paquetes.count({
            where: { event_type_id: tipoId },
        });

        // ✅ NUEVO: Verificar promesas asociadas
        const promesasAsociadas = await prisma.studio_promises.count({
            where: { event_type_id: tipoId },
        });

        // ✅ NUEVO: Verificar leads activos (no convertidos)
        const leadsActivos = await prisma.platform_leads.count({
            where: {
                event_type_id: tipoId,
                conversion_date: null,
            },
        });

        if (paquetesAsociados > 0 || promesasAsociadas > 0 || leadsActivos > 0) {
            const mensajes: string[] = [];
            if (paquetesAsociados > 0) mensajes.push(`${paquetesAsociados} paquete(s)`);
            if (promesasAsociadas > 0) mensajes.push(`${promesasAsociadas} promesa(s)`);
            if (leadsActivos > 0) mensajes.push(`${leadsActivos} lead(s) activo(s)`);

            return {
                success: false,
                error: `No se puede eliminar. Tiene:\n- ${mensajes.join('\n- ')}`,
            };
        }

        const tipoEvento = await prisma.studio_event_types.delete({
            where: { id: tipoId },
        });

        // Obtener el slug del studio para revalidar
        const studio = await prisma.studios.findUnique({
            where: { id: tipoEvento.studio_id },
            select: { slug: true },
        });

        if (studio) {
            revalidateTiposEvento(studio.slug);
        }

        return {
            success: true,
            data: { id: tipoEvento.id },
        };
    } catch (error) {
        console.error('Error eliminando tipo de evento:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al eliminar el tipo de evento',
        };
    }
}

/**
 * Actualizar el orden de los tipos de evento
 */
export async function actualizarOrdenTiposEvento(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<{ success: boolean }>> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const validatedData = ActualizarOrdenTiposEventoSchema.parse(data);

        // Actualizar ordenes en una transacción
        await prisma.$transaction(
            validatedData.tipos.map((tipo) =>
                prisma.studio_event_types.update({
                    where: { id: tipo.id },
                    data: { order: tipo.orden },
                })
            )
        );

        revalidateTiposEvento(studioSlug);
        // Invalidar caché de tipos de evento y paquetes
        revalidatePath(`/${studioSlug}/studio/commercial/paquetes`);
        revalidateTag(`tipos-evento-${studioSlug}`, 'max');
        revalidateTag(`paquetes-shell-${studioSlug}`, 'max');

        return {
            success: true,
            data: { success: true },
        };
    } catch (error) {
        console.error('Error actualizando orden:', error);
        return {
            success: false,
            error: 'Error al actualizar el orden de los tipos de evento',
        };
    }
}

/**
 * Obtener un tipo de evento por ID
 */
export async function obtenerTipoEventoPorId(
    tipoId: string,
    includePackages: boolean = false
): Promise<ActionResponse<TipoEventoData>> {
    try {
        const tipoEvento = await prisma.studio_event_types.findUnique({
            where: { id: tipoId },
            include: includePackages ? {
                packages: {
                    select: {
                        id: true,
                        name: true,
                        precio: true,
                        status: true,
                    },
                },
            } : undefined,
        });

        if (!tipoEvento) {
            return { success: false, error: 'Tipo de evento no encontrado' };
        }

        return {
            success: true,
            data: {
                id: tipoEvento.id,
                studio_id: tipoEvento.studio_id,
                nombre: tipoEvento.name,
                description: tipoEvento.description,
                descripcion: tipoEvento.description, // Legacy
                color: tipoEvento.color,
                icon: tipoEvento.icon,
                icono: tipoEvento.icon, // Legacy
                cover_image_url: tipoEvento.cover_image_url,
                cover_video_url: tipoEvento.cover_video_url,
                cover_media_type: tipoEvento.cover_media_type as 'image' | 'video' | null,
                status: tipoEvento.status,
                orden: tipoEvento.order,
                createdAt: tipoEvento.created_at,
                updatedAt: tipoEvento.updated_at,
                paquetes: includePackages && tipoEvento.packages ? tipoEvento.packages.map((p) => ({
                    id: p.id,
                    nombre: p.name,
                    precio: p.precio || 0,
                    status: p.status,
                })) : [],
            },
        };
    } catch (error) {
        console.error('Error obteniendo tipo de evento:', error);
        return {
            success: false,
            error: 'Error al obtener el tipo de evento',
        };
    }
}

/**
 * Interface para respuestas de acciones
 */
interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
