'use server';

import { prisma } from '@/lib/prisma';
import {
    SeccionSchema,
    CategoriaSchema,
    ServicioSchema,
    ActualizarOrdenSeccionesSchema,
    ActualizarOrdenCategoriasSchema,
    type SeccionData,
    type CategoriaData,
    type ServicioData,
    type ActionResponse,
} from '@/lib/actions/schemas/catalogo-schemas';
import { revalidatePath } from 'next/cache';

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Obtener studio_id desde el slug
 */
async function getstudio_idFromSlug(slug: string): Promise<string | null> {
    const studio = await prisma.studios.findUnique({
        where: { slug },
        select: { id: true },
    });
    return studio?.id || null;
}

/**
 * Revalidar rutas del catálogo
 */
function revalidateCatalogo(slug: string) {
    revalidatePath(`/${slug}/studio/commercial/catalogo`);
    revalidatePath(`/${slug}/studio/business`);
}

// =====================================================
// QUERY OPTIMIZADA: CATALOG SHELL (Fase 1)
// =====================================================

/**
 * Obtiene la estructura completa del catálogo con items (optimizada)
 * ⚠️ OPTIMIZADO: Usa select explícito, solo campos necesarios para la lista
 * 
 * @param studioSlug - Slug del studio
 * @returns Secciones, categorías e items completos (optimizados)
 */
export async function getCatalogShell(
    studioSlug: string
): Promise<ActionResponse<SeccionData[]>> {
    try {
        const studio_id = await getstudio_idFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        // Query optimizada con select explícito (incluye items básicos)
        const secciones = await prisma.studio_service_sections.findMany({
            select: {
                id: true,
                name: true,
                order: true,
                section_categories: {
                    orderBy: { order: 'asc' },
                    select: {
                        order: true,
                        service_categories: {
                            select: {
                                id: true,
                                name: true,
                                order: true,
                                items: {
                                    where: {
                                        studio_id,
                                    },
                                    select: {
                                        id: true,
                                        name: true,
                                        cost: true,
                                        utility_type: true,
                                        billing_type: true,
                                        operational_category: true,
                                        default_duration_days: true,
                                        order: true,
                                        status: true,
                                        // Solo cargar gastos necesarios para cálculo de margen
                                        item_expenses: {
                                            select: {
                                                id: true,
                                                name: true,
                                                cost: true,
                                            },
                                        },
                                    },
                                    orderBy: { order: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { order: 'asc' },
        });

        // Transformar a formato SeccionData
        const shellData: SeccionData[] = secciones.map((seccion) => ({
            id: seccion.id,
            nombre: seccion.name,
            descripcion: null,
            order: seccion.order,
            createdAt: new Date(),
            updatedAt: new Date(),
            categorias: seccion.section_categories.map((sc) => ({
                id: sc.service_categories.id,
                nombre: sc.service_categories.name,
                order: sc.order,  // ← FIX: Solo studio_section_categories.order
                createdAt: new Date(),
                updatedAt: new Date(),
                seccionId: seccion.id,
                servicios: sc.service_categories.items.map((s) => ({
                    id: s.id,
                    studioId: studio_id,
                    servicioCategoriaId: sc.service_categories.id,
                    nombre: s.name,
                    costo: s.cost,
                    gasto: s.item_expenses.reduce((sum, g) => sum + g.cost, 0),
                    tipo_utilidad: s.utility_type,
                    type: 'service' as const,
                    billing_type: s.billing_type,
                    operational_category: s.operational_category ?? undefined,
                    default_duration_days: s.default_duration_days,
                    order: s.order,
                    status: s.status,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    gastos: s.item_expenses.map((g) => ({
                        id: g.id,
                        nombre: g.name,
                        costo: g.cost,
                    })),
                })),
            })),
        }));

        return { success: true, data: shellData };
    } catch (error) {
        console.error('Error obteniendo catalog shell:', error);
        return {
            success: false,
            error: 'Error al obtener estructura del catálogo',
        };
    }
}

// =====================================================
// SECCIONES
// =====================================================

/**
 * Obtener todas las secciones con categorías y servicios
 * ⚠️ OPTIMIZADO: Usa select explícito en lugar de include
 * @param onlyActive - Si es true, solo trae items activos. Si es false, trae todos los items. Default: true (para compatibilidad con paquetes)
 */
export async function obtenerCatalogo(
    studioSlug: string,
    onlyActive?: boolean
): Promise<ActionResponse<SeccionData[]>> {
    try {
        const studio_id = await getstudio_idFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        // Query optimizada con select explícito (sin campos innecesarios)
        const secciones = await prisma.studio_service_sections.findMany({
            select: {
                id: true,
                name: true,
                order: true,
                section_categories: {
                    orderBy: { order: 'asc' },
                    select: {
                        order: true,
                        service_categories: {
                            select: {
                                id: true,
                                name: true,
                                order: true,
                                items: {
                                    where: {
                                        studio_id,
                                        ...(onlyActive !== false ? { status: 'active' } : {}),
                                    },
                                    select: {
                                        id: true,
                                        name: true,
                                        cost: true,
                                        utility_type: true,
                                        billing_type: true,
                                        operational_category: true,
                                        default_duration_days: true,
                                        order: true,
                                        status: true,
                                        // Solo cargar gastos si es necesario para cálculo de margen
                                        item_expenses: {
                                            select: {
                                                id: true,
                                                name: true,
                                                cost: true,
                                            },
                                        },
                                    },
                                    orderBy: { order: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { order: 'asc' },
        });

        // Transformar datos a estructura plana
        const catalogoData: SeccionData[] = secciones.map((seccion) => ({
            id: seccion.id,
            nombre: seccion.name,
            descripcion: null, // No se carga description en lista
            order: seccion.order,
            createdAt: new Date(), // Timestamps no necesarios para lista
            updatedAt: new Date(),
            categorias: seccion.section_categories.map((sc) => ({
                id: sc.service_categories.id,
                nombre: sc.service_categories.name,
                order: sc.order,  // ← FIX: Solo studio_section_categories.order
                createdAt: new Date(),
                updatedAt: new Date(),
                seccionId: seccion.id,
                servicios: sc.service_categories.items.map((s) => ({
                    id: s.id,
                    studioId: studio_id,
                    servicioCategoriaId: sc.service_categories.id,
                    nombre: s.name,
                    costo: s.cost,
                    gasto: s.item_expenses.reduce((sum, g) => sum + g.cost, 0),
                    tipo_utilidad: s.utility_type,
                    type: 'service' as const,
                    billing_type: s.billing_type,
                    operational_category: s.operational_category ?? undefined,
                    default_duration_days: s.default_duration_days,
                    order: s.order,
                    status: s.status,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    gastos: s.item_expenses.map((g) => ({
                        id: g.id,
                        nombre: g.name,
                        costo: g.cost,
                    })),
                })),
            })),
        }));

        return { success: true, data: catalogoData };
    } catch (error) {
        console.error('Error obteniendo catálogo:', error);
        return {
            success: false,
            error: 'Error al obtener el catálogo',
        };
    }
}

/**
 * Obtener solo las secciones (sin categorías ni servicios)
 */
export async function obtenerSecciones(): Promise<ActionResponse<SeccionData[]>> {
    try {
        const secciones = await prisma.studio_service_sections.findMany({
            orderBy: { order: 'asc' },
        });

        const seccionesData: SeccionData[] = secciones.map((s) => ({
            id: s.id,
            nombre: s.name,
            descripcion: s.description,
            order: s.order,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            categorias: [],
        }));

        return { success: true, data: seccionesData };
    } catch (error) {
        console.error('Error obteniendo secciones:', error);
        return {
            success: false,
            error: 'Error al obtener las secciones',
        };
    }
}

/**
 * Crear una nueva sección
 */
export async function crearSeccion(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<SeccionData>> {
    try {
        // Validar datos
        const validatedData = SeccionSchema.parse(data);

        // Obtener el siguiente número de orden
        const ultimaSeccion = await prisma.studio_service_sections.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const nuevoOrden = ultimaSeccion ? ultimaSeccion.order + 1 : 0;

        // Crear sección
        const seccion = await prisma.studio_service_sections.create({
            data: {
                name: validatedData.nombre,
                description: validatedData.descripcion,
                order: nuevoOrden,
            },
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: seccion.id,
                nombre: seccion.name,
                descripcion: seccion.description,
                order: seccion.order,
                createdAt: seccion.created_at,
                updatedAt: seccion.updated_at,
                categorias: [],
            },
        };
    } catch (error) {
        console.error('Error creando sección:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al crear la sección',
        };
    }
}

/**
 * Actualizar una sección existente
 */
export async function actualizarSeccion(
    studioSlug: string,
    seccion_id: string,
    data: unknown
): Promise<ActionResponse<SeccionData>> {
    try {
        // Validar datos (parcial para permitir updates parciales)
        const validatedData = SeccionSchema.partial().parse(data);

        const seccion = await prisma.studio_service_sections.update({
            where: { id: seccion_id },
            data: validatedData,
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: seccion.id,
                nombre: seccion.name,
                descripcion: seccion.description,
                order: seccion.order,
                createdAt: seccion.created_at,
                updatedAt: seccion.updated_at,
                categorias: [],
            },
        };
    } catch (error) {
        console.error('Error actualizando sección:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al actualizar la sección',
        };
    }
}

/**
 * Eliminar una sección (solo si no tiene categorías)
 */
export async function eliminarSeccion(
    studioSlug: string,
    seccion_id: string
): Promise<ActionResponse<boolean>> {
    try {
        // Verificar si tiene categorías
        const seccion = await prisma.studio_service_sections.findUnique({
            where: { id: seccion_id },
            include: {
                section_categories: true,
            },
        });

        if (!seccion) {
            return { success: false, error: 'Sección no encontrada' };
        }

        if (seccion.section_categories.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar una sección con categorías',
            };
        }

        await prisma.studio_service_sections.delete({
            where: { id: seccion_id },
        });

        revalidateCatalogo(studioSlug);

        return { success: true, data: true };
    } catch (error) {
        console.error('Error eliminando sección:', error);
        return {
            success: false,
            error: 'Error al eliminar la sección',
        };
    }
}

/**
 * Actualizar orden de múltiples secciones
 */
export async function actualizarOrdenSecciones(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<boolean>> {
    try {
        const validatedData = ActualizarOrdenSeccionesSchema.parse(data);

        // Actualizar en batch
        await Promise.all(
            validatedData.secciones.map((seccion) =>
                prisma.studio_service_sections.update({
                    where: { id: seccion.id },
                    data: { order: seccion.order },
                })
            )
        );

        revalidateCatalogo(studioSlug);

        return { success: true, data: true };
    } catch (error) {
        console.error('Error actualizando orden de secciones:', error);
        return {
            success: false,
            error: 'Error al actualizar el orden',
        };
    }
}

// =====================================================
// CATEGORÍAS
// =====================================================

/**
 * Obtener todas las categorías
 */
export async function obtenerCategorias(): Promise<ActionResponse<CategoriaData[]>> {
    try {
        const categorias = await prisma.studio_service_categories.findMany({
            include: {
                section_categories: {
                    select: {
                        section_id: true,
                    },
                },
            },
            orderBy: { order: 'asc' },
        });

        const categoriasData: CategoriaData[] = categorias.map((c) => ({
            id: c.id,
            nombre: c.name,
            order: c.order,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            seccionId: c.section_categories?.section_id,
            servicios: [],
        }));

        return { success: true, data: categoriasData };
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        return {
            success: false,
            error: 'Error al obtener las categorías',
        };
    }
}

/**
 * Crear una nueva categoría y asignarla a una sección
 */
export async function crearCategoria(
    studioSlug: string,
    data: unknown,
    seccion_id: string
): Promise<ActionResponse<CategoriaData>> {
    try {
        const validatedData = CategoriaSchema.parse(data);

        // Obtener el siguiente número de orden
        const ultimaCategoria =
            await prisma.studio_service_categories.findFirst({
                orderBy: { order: 'desc' },
                select: { order: true },
            });

        const nuevoOrder = ultimaCategoria ? ultimaCategoria.order + 1 : 0;

        // Crear categoría con relación a sección
        const categoria = await prisma.studio_service_categories.create({
            data: {
                name: validatedData.nombre,
                order: nuevoOrder,
                section_categories: {
                    create: {
                        section_id: seccion_id,
                        order: nuevoOrder,
                    },
                },
            },
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: categoria.id,
                nombre: categoria.name,
                order: categoria.order,
                createdAt: categoria.created_at,
                updatedAt: categoria.updated_at,
                seccionId: seccion_id,
                servicios: [],
            },
        };
    } catch (error) {
        console.error('Error creando categoría:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al crear la categoría',
        };
    }
}

/**
 * Actualizar una categoría existente
 */
export async function actualizarCategoria(
    studioSlug: string,
    categoriaId: string,
    data: unknown
): Promise<ActionResponse<CategoriaData>> {
    try {
        const validatedData = CategoriaSchema.partial().parse(data);
        const updateData: { name?: string; order?: number } = {};
        if (validatedData.nombre !== undefined) updateData.name = validatedData.nombre;
        if (validatedData.order !== undefined) updateData.order = validatedData.order;

        const categoria = await prisma.studio_service_categories.update({
            where: { id: categoriaId },
            data: updateData,
            include: {
                section_categories: {
                    select: {
                        section_id: true,
                    },
                },
            },
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: categoria.id,
                nombre: categoria.name,
                order: categoria.order,
                createdAt: categoria.created_at,
                updatedAt: categoria.updated_at,
                seccionId: categoria.section_categories?.section_id,
                servicios: [],
            },
        };
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        return {
            success: false,
            error: 'Error al actualizar la categoría',
        };
    }
}

/**
 * Eliminar una categoría (solo si no tiene servicios)
 */
export async function eliminarCategoria(
    studioSlug: string,
    categoriaId: string
): Promise<ActionResponse<boolean>> {
    try {
        // Verificar si tiene servicios
        const categoria = await prisma.studio_service_categories.findUnique({
            where: { id: categoriaId },
            include: {
                items: true,
            },
        });

        if (!categoria) {
            return { success: false, error: 'Categoría no encontrada' };
        }

        if (categoria.items.length > 0) {
            return {
                success: false,
                error: 'No se puede eliminar una categoría con servicios',
            };
        }

        // Eliminar categoría (cascade eliminará la relación en project_seccion_categorias)
        await prisma.studio_service_categories.delete({
            where: { id: categoriaId },
        });

        revalidateCatalogo(studioSlug);

        return { success: true, data: true };
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        return {
            success: false,
            error: 'Error al eliminar la categoría',
        };
    }
}

/**
 * Corrige categorías con typo "peronalizada" → "personalizada" en studio_service_categories.
 * Idempotente: solo actualiza nombres que contienen el typo.
 */
export async function corregirTypoPeronalizadaCategorias(
    studioSlug: string
): Promise<ActionResponse<{ updated: number }>> {
    try {
        const studio_id = await getstudio_idFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }
        const categoriasConTypo = await prisma.studio_service_categories.findMany({
            where: { name: { contains: 'peronalizada', mode: 'insensitive' } },
            select: { id: true, name: true },
        });
        let updated = 0;
        for (const cat of categoriasConTypo) {
            const nuevoNombre = cat.name.replace(/peronalizada/gi, 'personalizada');
            if (nuevoNombre !== cat.name) {
                await prisma.studio_service_categories.update({
                    where: { id: cat.id },
                    data: { name: nuevoNombre },
                });
                updated++;
            }
        }
        if (updated > 0) revalidateCatalogo(studioSlug);
        return { success: true, data: { updated } };
    } catch (error) {
        console.error('Error corrigiendo typo en categorías:', error);
        return { success: false, error: 'Error al corregir categorías' };
    }
}

/**
 * Actualizar orden de múltiples categorías.
 * El orden se persiste en studio_section_categories (tabla intermedia sección-categoría).
 * Usa transacción para garantizar atomicidad y pesos específicos (0, 1, 2...).
 */
export async function actualizarOrdenCategorias(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<boolean>> {
    try {
        const validatedData = ActualizarOrdenCategoriasSchema.parse(data);

        await prisma.$transaction(
            validatedData.categorias.map((categoria) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`ORDEN ACTUALIZADO EN DB: Cat=${categoria.id} -> Pos=${categoria.order}`);
                }
                return prisma.studio_section_categories.update({
                    where: { category_id: categoria.id },
                    data: { order: categoria.order },
                });
            })
        );

        revalidateCatalogo(studioSlug);

        return { success: true, data: true };
    } catch (error) {
        console.error('Error actualizando orden de categorías:', error);
        return {
            success: false,
            error: 'Error al actualizar el orden',
        };
    }
}

// =====================================================
// SERVICIOS
// =====================================================

/**
 * Obtener servicios de un estudio
 */
export async function obtenerServicios(
    studioSlug: string
): Promise<ActionResponse<ServicioData[]>> {
    try {
        const studio_id = await getstudio_idFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const servicios = await prisma.studio_items.findMany({
            where: { studio_id },
            include: {
                service_categories: {
                    include: {
                        section_categories: {
                            select: {
                                section_id: true,
                            },
                        },
                    },
                },
                item_expenses: true,
            },
            orderBy: { order: 'asc' },
        });

        const serviciosData: ServicioData[] = servicios.map((s) => ({
            id: s.id,
            studioId: s.studio_id,
            servicioCategoriaId: s.service_category_id,
            nombre: s.name,
            costo: s.cost,
            gasto: s.expense,
            tipo_utilidad: s.utility_type,
            type: s.type,
            order: s.order,
            status: s.status,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            gastos: s.item_expenses.map((g) => ({
                id: g.id,
                nombre: g.name,
                costo: g.cost,
            })),
            categoria: {
                id: s.service_categories.id,
                nombre: s.service_categories.name,
                order: s.service_categories.order,
                createdAt: s.service_categories.created_at,
                updatedAt: s.service_categories.updated_at,
                seccionId: s.service_categories.section_categories?.section_id,
                servicios: [],
            },
        }));

        return { success: true, data: serviciosData };
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        return {
            success: false,
            error: 'Error al obtener los servicios',
        };
    }
}

/**
 * Crear un nuevo servicio
 */
export async function crearServicio(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<ServicioData>> {
    try {
        const studio_id = await getstudio_idFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const validatedData = ServicioSchema.parse(data);

        // Obtener el siguiente número de orden para esta categoría
        const ultimoServicio = await prisma.studio_items.findFirst({
            where: {
                studio_id,
                service_category_id: validatedData.servicioCategoriaId,
            },
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const nuevoOrden = ultimoServicio ? ultimoServicio.order + 1 : 0;

        const servicio = await prisma.studio_items.create({
            data: {
                studio_id,
                service_category_id: validatedData.servicioCategoriaId,
                name: validatedData.nombre,
                cost: validatedData.costo,
                expense: validatedData.gasto,
                // utilidad: validatedData.utilidad,
                // precio_publico: validatedData.precio_publico,
                utility_type: validatedData.tipo_utilidad,
                order: nuevoOrden,
                status: validatedData.status,
                item_expenses: {
                    create: validatedData.gastos?.map((gasto) => ({
                        name: gasto.nombre,
                        cost: gasto.costo,
                    })) || [],
                },
            },
            include: {
                service_categories: true,
                item_expenses: true,
            },
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: servicio.id,
                studioId: servicio.studio_id,
                servicioCategoriaId: servicio.service_category_id,
                nombre: servicio.name,
                costo: servicio.cost,
                gasto: servicio.expense,
                tipo_utilidad: servicio.utility_type,
                type: servicio.type,
                order: servicio.order,
                status: servicio.status,
                createdAt: servicio.created_at,
                updatedAt: servicio.updated_at,
                gastos: servicio.item_expenses.map((g) => ({
                    id: g.id,
                    nombre: g.name,
                    costo: g.cost,
                })),
            },
        };
    } catch (error) {
        console.error('Error creando servicio:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al crear el servicio',
        };
    }
}

/**
 * Actualizar un servicio existente
 */
export async function actualizarServicio(
    studioSlug: string,
    servicioId: string,
    data: unknown
): Promise<ActionResponse<ServicioData>> {
    try {
        const validatedData = ServicioSchema.partial().parse(data);
        const { gastos, ...servicioData } = validatedData;

        // Actualizar servicio y reemplazar gastos si se proporcionan
        const servicio = await prisma.studio_items.update({
            where: { id: servicioId },
            data: {
                ...servicioData,
                ...(gastos !== undefined && {
                    item_expenses: {
                        deleteMany: {}, // Eliminar todos los gastos existentes
                        create: gastos.map((gasto) => ({
                            name: gasto.nombre,
                            cost: gasto.costo,
                        })),
                    },
                }),
            },
            include: {
                item_expenses: true,
            },
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: servicio.id,
                studioId: servicio.studio_id,
                servicioCategoriaId: servicio.service_category_id,
                nombre: servicio.name,
                costo: servicio.cost,
                gasto: servicio.expense,
                tipo_utilidad: servicio.utility_type,
                type: servicio.type,
                order: servicio.order,
                status: servicio.status,
                createdAt: servicio.created_at,
                updatedAt: servicio.updated_at,
                gastos: servicio.item_expenses.map((g) => ({
                    id: g.id,
                    nombre: g.name,
                    costo: g.cost,
                })),
            },
        };
    } catch (error) {
        console.error('Error actualizando servicio:', error);
        return {
            success: false,
            error: 'Error al actualizar el servicio',
        };
    }
}

/**
 * Eliminar un servicio
 */
export async function eliminarServicio(
    studioSlug: string,
    servicioId: string
): Promise<ActionResponse<boolean>> {
    try {
        await prisma.studio_items.delete({
            where: { id: servicioId },
        });

        revalidateCatalogo(studioSlug);

        return { success: true, data: true };
    } catch (error) {
        console.error('Error eliminando servicio:', error);
        return {
            success: false,
            error: 'Error al eliminar el servicio',
        };
    }
}

/**
 * Duplicar un servicio
 */
export async function duplicarServicio(
    studioSlug: string,
    servicioId: string
): Promise<ActionResponse<ServicioData>> {
    try {
        const servicioOriginal = await prisma.studio_items.findUnique({
            where: { id: servicioId },
            include: {
                item_expenses: true,
            },
        });

        if (!servicioOriginal) {
            return { success: false, error: 'Servicio no encontrado' };
        }

        // Obtener el siguiente orden
        const ultimoServicio = await prisma.studio_items.findFirst({
            where: {
                studio_id: servicioOriginal.studio_id,
                service_category_id: servicioOriginal.service_category_id,
            },
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const nuevoOrden = ultimoServicio ? ultimoServicio.order + 1 : 0;

        const servicioNuevo = await prisma.studio_items.create({
            data: {
                studio_id: servicioOriginal.studio_id,
                service_category_id: servicioOriginal.service_category_id,
                name: `${servicioOriginal.name} (Copia)`,
                cost: servicioOriginal.cost,
                expense: servicioOriginal.expense,
                // utilidad: servicioOriginal.utilidad,
                // precio_publico: servicioOriginal.precio_publico,
                utility_type: servicioOriginal.utility_type,
                order: nuevoOrden,
                status: servicioOriginal.status,
                item_expenses: {
                    create: servicioOriginal.item_expenses.map((gasto) => ({
                        name: gasto.name,
                        cost: gasto.cost,
                    })),
                },
            },
            include: {
                item_expenses: true,
            },
        });

        revalidateCatalogo(studioSlug);

        return {
            success: true,
            data: {
                id: servicioNuevo.id,
                studioId: servicioNuevo.studio_id,
                servicioCategoriaId: servicioNuevo.service_category_id,
                nombre: servicioNuevo.name,
                costo: servicioNuevo.cost,
                gasto: servicioNuevo.expense,
                //  utilidad: servicioNuevo.utilidad,
                // precio_publico: servicioNuevo.precio_publico,
                tipo_utilidad: servicioNuevo.utility_type,
                type: servicioNuevo.type,
                order: servicioNuevo.order,
                status: servicioNuevo.status,
                createdAt: servicioNuevo.created_at,
                updatedAt: servicioNuevo.updated_at,
                gastos: servicioNuevo.item_expenses.map((g) => ({
                    id: g.id,
                    nombre: g.name,
                    costo: g.cost,
                })),
            },
        };
    } catch (error) {
        console.error('Error duplicando servicio:', error);
        return {
            success: false,
            error: 'Error al duplicar el servicio',
        };
    }
}

// =====================================================
// DRAG & DROP
// =====================================================

/**
 * Actualizar posición de un elemento (drag & drop)
 */
export async function actualizarPosicionCatalogo(
    studioSlug: string,
    itemId: string,
    itemType: 'seccion' | 'categoria' | 'servicio',
    newIndex: number,
    parentId?: string | null
): Promise<ActionResponse<boolean>> {
    try {
        await getstudio_idFromSlug(studioSlug);

        if (itemType === 'seccion') {
            // Actualizar orden de sección
            await prisma.studio_service_sections.update({
                where: { id: itemId },
                data: { order: newIndex },
            });
        } else if (itemType === 'categoria') {
            // Actualizar orden de categoría y posiblemente cambiar de sección
            if (parentId) {
                // Cambiar de sección si parentId es diferente
                await prisma.$transaction(async (tx) => {
                    // Actualizar orden
                    await tx.studio_service_categories.update({
                        where: { id: itemId },
                        data: { order: newIndex },
                    });

                    // Actualizar relación de sección
                    await tx.studio_section_categories.update({
                        where: { category_id: itemId },
                        data: { section_id: parentId },
                    });
                });
            } else {
                await prisma.studio_service_categories.update({
                    where: { id: itemId },
                    data: { order: newIndex },
                });
            }
        } else if (itemType === 'servicio') {
            // Actualizar orden de servicio y posiblemente cambiar de categoría
            if (parentId) {
                await prisma.studio_items.update({
                    where: { id: itemId },
                    data: {
                        order: newIndex,
                        service_category_id: parentId,
                    },
                });
            } else {
                await prisma.studio_items.update({
                    where: { id: itemId },
                    data: { order: newIndex },
                });
            }
        }

        revalidateCatalogo(studioSlug);

        return { success: true, data: true };
    } catch (error) {
        console.error('Error actualizando posición:', error);
        return {
            success: false,
            error: 'Error al actualizar la posición',
        };
    }
}
