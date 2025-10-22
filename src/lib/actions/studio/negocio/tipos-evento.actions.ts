'use server';

import { revalidatePath } from 'next/cache';
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
 */
function revalidateTiposEvento(studioSlug: string) {
    revalidatePath(`/${studioSlug}/configuracion/negocio/tipos-evento`);
    revalidatePath(`/[slug]/studio/builder/catalogo`);
    revalidatePath(`/${studioSlug}/builder/catalogo`);
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

        const tiposEvento = await prisma.studio_evento_tipos.findMany({
            where: { studio_id },
            include: {
                paquetes: {
                    select: {
                        id: true,
                        nombre: true,
                        precio: true,
                        status: true,
                    },
                },
            },
            orderBy: { orden: 'asc' },
        });

        const tiposEventoData: TipoEventoData[] = tiposEvento.map((tipo) => ({
            id: tipo.id,
            studio_id: tipo.studio_id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion,
            color: tipo.color,
            icono: tipo.icono,
            status: tipo.status,
            orden: tipo.orden,
            createdAt: tipo.createdAt,
            updatedAt: tipo.updatedAt,
            paquetes: tipo.paquetes.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                precio: p.precio || 0,
                status: p.status,
            })),
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

        // Obtener el siguiente número de posición
        const ultimoTipo = await prisma.studio_evento_tipos.findFirst({
            where: { studio_id },
            orderBy: { orden: 'desc' },
            select: { orden: true },
        });

        const nuevaPosicion = ultimoTipo ? ultimoTipo.orden + 1 : 0;

        const tipoEvento = await prisma.studio_evento_tipos.create({
            data: {
                studio_id,
                nombre: validatedData.nombre,
                status: validatedData.status,
                orden: nuevaPosicion,
                updated_at: new Date(),
            },
        });

        revalidateTiposEvento(studioSlug);

        return {
            success: true,
            data: {
                id: tipoEvento.id,
                studio_id: tipoEvento.studio_id,
                nombre: tipoEvento.nombre,
                descripcion: tipoEvento.descripcion,
                color: tipoEvento.color,
                icono: tipoEvento.icono,
                status: tipoEvento.status,
                orden: tipoEvento.orden,
                createdAt: tipoEvento.createdAt,
                updatedAt: tipoEvento.updatedAt,
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
    tipoId: string,
    data: unknown
): Promise<ActionResponse<TipoEventoData>> {
    try {
        const validatedData = ActualizarTipoEventoSchema.parse(data);

        const tipoEvento = await prisma.studio_evento_tipos.update({
            where: { id: tipoId },
            data: {
                nombre: validatedData.nombre,
                status: validatedData.status,
            },
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
            data: {
                id: tipoEvento.id,
                studio_id: tipoEvento.studio_id,
                nombre: tipoEvento.nombre,
                descripcion: tipoEvento.descripcion,
                color: tipoEvento.color,
                icono: tipoEvento.icono,
                status: tipoEvento.status,
                orden: tipoEvento.orden,
                createdAt: tipoEvento.createdAt,
                updatedAt: tipoEvento.updatedAt,
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
            where: { eventoTipoId: tipoId },
        });

        if (paquetesAsociados > 0) {
            return {
                success: false,
                error: `No se puede eliminar el tipo de evento porque tiene ${paquetesAsociados} paquete(s) asociado(s)`,
            };
        }

        const tipoEvento = await prisma.studio_evento_tipos.delete({
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
                prisma.studio_evento_tipos.update({
                    where: { id: tipo.id },
                    data: { orden: tipo.orden },
                })
            )
        );

        revalidateTiposEvento(studioSlug);

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
    tipoId: string
): Promise<ActionResponse<TipoEventoData>> {
    try {
        const tipoEvento = await prisma.studio_evento_tipos.findUnique({
            where: { id: tipoId },
            include: {
                paquetes: {
                    select: {
                        id: true,
                        nombre: true,
                        precio: true,
                        status: true,
                    },
                },
            },
        });

        if (!tipoEvento) {
            return { success: false, error: 'Tipo de evento no encontrado' };
        }

        return {
            success: true,
            data: {
                id: tipoEvento.id,
                studio_id: tipoEvento.studio_id,
                nombre: tipoEvento.nombre,
                descripcion: tipoEvento.descripcion,
                color: tipoEvento.color,
                icono: tipoEvento.icono,
                status: tipoEvento.status,
                orden: tipoEvento.orden,
                createdAt: tipoEvento.createdAt,
                updatedAt: tipoEvento.updatedAt,
                paquetes: tipoEvento.paquetes.map((p) => ({
                    id: p.id,
                    nombre: p.nombre,
                    precio: p.precio || 0,
                    status: p.status,
                })),
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
