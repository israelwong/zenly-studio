'use server';

import { prisma } from '@/lib/prisma';
import { retryDatabaseOperation } from '@/lib/actions/utils/database-retry';
import { revalidatePath } from 'next/cache';
import {
    IdentidadUpdateSchema,
    LogoUpdateSchema,
    StudioNameUpdateSchema,
    SloganUpdateSchema,
    LogoUrlUpdateSchema,
    type IdentidadUpdateForm,
    type LogoUpdateForm,
    type StudioNameUpdateForm,
    type SloganUpdateForm,
    type LogoUrlUpdateForm,
} from '@/lib/actions/schemas/identidad-schemas';
import { FAQItem } from '@/app/[slug]/studio/profile/identidad/types';

/**
 * Identidad Actions - CRUD para datos de identidad del estudio
 * 
 * Incluye:
 * - Información básica del studio (nombre, slogan, presentación)
 * - Logo del studio
 * - Palabras clave SEO
 * - FAQ
 * - Redes sociales
 */

// ============================================
// HEADER ACTIONS (Datos básicos)
// ============================================

// Obtener datos de identidad del studio
export async function obtenerIdentidadStudio(studioSlug: string) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                studio_name: true,
                slug: true,
                slogan: true,
                presentation: true,
                keywords: true,
                logo_url: true,
            },
        });

        if (!studio) {
            console.error(`❌ Studio no encontrado con slug: ${studioSlug}`);
            return {
                success: false,
                error: `Studio con slug "${studioSlug}" no encontrado. Verifica que el studio existe y está activo.`,
            };
        }

        // Parsear palabras clave si existen
        let palabrasClave: string[] = [];
        if (studio.keywords) {
            try {
                palabrasClave = JSON.parse(studio.keywords);
            } catch {
                // Si no se puede parsear, usar como string simple
                palabrasClave = studio.keywords.split(',').map(p => p.trim()).filter(p => p);
            }
        }

        return {
            ...studio,
            palabras_clave: palabrasClave,
        };
    });
}

// Actualizar solo la presentación del studio
export async function updateStudioPresentation(
    studioSlug: string,
    presentation: string | null
) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: 'Studio no encontrado'
            };
        }

        await prisma.studios.update({
            where: { id: studio.id },
            data: { presentation: presentation }
        });

        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/business/identity`);

        return { success: true };
    } catch (error) {
        console.error('[updateStudioPresentation] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar presentación'
        };
    }
}

// ============================================
// INLINE EDIT ACTIONS
// ============================================

// Actualizar nombre del studio
export async function updateStudioName(
    studioSlug: string,
    data: StudioNameUpdateForm
) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const validated = StudioNameUpdateSchema.parse(data);

        await prisma.studios.update({
            where: { id: studio.id },
            data: { studio_name: validated.studio_name }
        });

        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/business/identity`);

        return { success: true, data: { studio_name: validated.studio_name } };
    } catch (error) {
        console.error('[updateStudioName] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar nombre'
        };
    }
}

// Actualizar slogan del studio
export async function updateStudioSlogan(
    studioSlug: string,
    data: SloganUpdateForm
) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const validated = SloganUpdateSchema.parse(data);

        await prisma.studios.update({
            where: { id: studio.id },
            data: { slogan: validated.slogan }
        });

        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/business/identity`);

        return { success: true, data: { slogan: validated.slogan } };
    } catch (error) {
        console.error('[updateStudioSlogan] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar slogan'
        };
    }
}

// Actualizar logo del studio
export async function updateStudioLogo(
    studioSlug: string,
    data: LogoUrlUpdateForm
) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const validated = LogoUrlUpdateSchema.parse(data);

        await prisma.studios.update({
            where: { id: studio.id },
            data: { logo_url: validated.logo_url }
        });

        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/business/identity`);

        return { success: true, data: { logo_url: validated.logo_url } };
    } catch (error) {
        console.error('[updateStudioLogo] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar logo'
        };
    }
}

// Actualizar información básica de identidad
export async function actualizarIdentidadBasica(
    studioSlug: string,
    data: IdentidadUpdateForm
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const validatedData = IdentidadUpdateSchema.parse(data);

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: {
                studio_name: validatedData.nombre,
                slogan: validatedData.slogan,
                presentation: validatedData.presentacion,
                logo_url: validatedData.logo_url,
            },
            select: {
                studio_name: true,
                slogan: true,
                presentation: true,
                logo_url: true,
                isotipo_url: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return studioActualizado;
    });
}

// Actualizar palabras clave
export async function actualizarPalabrasClave(
    studioSlug: string,
    palabrasClave: string[]
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Convertir array a string JSON
        const palabrasClaveString = JSON.stringify(palabrasClave);

        await prisma.studios.update({
            where: { id: studio.id },
            data: {
                keywords: palabrasClaveString,
            },
            select: {
                keywords: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        revalidatePath(`/${studioSlug}`); // Revalidate public profile
        return {
            keywords: palabrasClave,
        };
    });
}

// Actualizar logo o isotipo
export async function actualizarLogo(
    studioSlug: string,
    data: LogoUpdateForm
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const validatedData = LogoUpdateSchema.parse(data);

        const updateData = { logo_url: validatedData.url };

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: updateData,
            select: {
                logo_url: true,
                isotipo_url: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return studioActualizado;
    });
}

// Actualizar múltiples campos de identidad
export async function actualizarIdentidadCompleta(
    studioSlug: string,
    data: IdentidadUpdateForm
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const validatedData = IdentidadUpdateSchema.parse(data);

        // Preparar datos de actualización con tipo explícito
        const updateData: {
            studio_name: string;
            slogan: string | null;
            presentation: string | null;
            logo_url: string | null;
            website: string | null;
            keywords?: string;
        } = {
            studio_name: validatedData.nombre,
            slogan: validatedData.slogan ?? null,
            presentation: validatedData.presentacion ?? null,
            logo_url: validatedData.logo_url ?? null,
            website: validatedData.pagina_web ?? null,
        };

        // Agregar palabras clave si se proporcionan
        if (data.palabras_clave) {
            updateData.keywords = data.palabras_clave;
        }

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: updateData,
            select: {
                studio_name: true,
                slogan: true,
                presentation: true,
                keywords: true,
                logo_url: true,
                website: true,
            },
        });

        // Parsear palabras clave para la respuesta
        let palabrasClave: string[] = [];
        if (studioActualizado.keywords) {
            try {
                palabrasClave = JSON.parse(studioActualizado.keywords);
            } catch {
                palabrasClave = studioActualizado.keywords.split(',').map(p => p.trim()).filter(p => p);
            }
        }

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return {
            ...studioActualizado,
            palabras_clave: palabrasClave,
        };
    });
}

// ============================================
// FAQ ACTIONS
// ============================================

// Obtener FAQ de un estudio
export async function obtenerFAQ(studioSlug: string): Promise<FAQItem[]> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            throw new Error('Estudio no encontrado');
        }

        const faqItems = await prisma.studio_faq.findMany({
            where: { studio_id: studio.id },
            orderBy: { orden: 'asc' }
        });

        return faqItems.map(faq => ({
            id: faq.id,
            pregunta: faq.pregunta,
            respuesta: faq.respuesta,
            orden: faq.orden,
            is_active: faq.is_active
        }));
    } catch (error) {
        console.error('Error obteniendo FAQ:', error);
        return [];
    }
}

// Crear nueva FAQ
export async function crearFAQ(
    studioSlug: string,
    data: { pregunta: string; respuesta: string }
): Promise<FAQItem> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            throw new Error('Estudio no encontrado');
        }

        const lastFAQ = await prisma.studio_faq.findFirst({
            where: { studio_id: studio.id },
            orderBy: { orden: 'desc' }
        });

        const nextOrder = (lastFAQ?.orden || 0) + 1;

        const faq = await prisma.studio_faq.create({
            data: {
                studio_id: studio.id,
                pregunta: data.pregunta,
                respuesta: data.respuesta,
                orden: nextOrder,
                is_active: true
            }
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return {
            id: faq.id,
            pregunta: faq.pregunta,
            respuesta: faq.respuesta,
            orden: faq.orden,
            is_active: faq.is_active
        };
    } catch (error) {
        console.error('Error creando FAQ:', error);
        throw new Error('Error al crear la FAQ');
    }
}

// Actualizar FAQ
export async function actualizarFAQ(
    studioSlug: string,
    faqId: string,
    data: { pregunta: string; respuesta: string }
): Promise<FAQItem> {
    try {
        const faq = await prisma.studio_faq.update({
            where: { id: faqId },
            data: {
                pregunta: data.pregunta,
                respuesta: data.respuesta
            }
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return {
            id: faq.id,
            pregunta: faq.pregunta,
            respuesta: faq.respuesta,
            orden: faq.orden,
            is_active: faq.is_active
        };
    } catch (error) {
        console.error('Error actualizando FAQ:', error);
        throw new Error('Error al actualizar la FAQ');
    }
}

// Eliminar FAQ
export async function eliminarFAQ(studioSlug: string, faqId: string): Promise<void> {
    try {
        await prisma.studio_faq.delete({
            where: { id: faqId }
        });
        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
    } catch (error) {
        console.error('Error eliminando FAQ:', error);
        throw new Error('Error al eliminar la FAQ');
    }
}

// Toggle activar/desactivar FAQ
export async function toggleFAQ(studioSlug: string, faqId: string, isActive: boolean): Promise<void> {
    try {
        await prisma.studio_faq.update({
            where: { id: faqId },
            data: { is_active: isActive }
        });
        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
    } catch (error) {
        console.error('Error toggleando FAQ:', error);
        throw new Error('Error al cambiar el estado de la FAQ');
    }
}

// Reordenar FAQ
export async function reordenarFAQ(studioSlug: string, faqIds: string[]): Promise<void> {
    try {
        const updates = faqIds.map((id, index) =>
            prisma.studio_faq.update({
                where: { id },
                data: { orden: index + 1 }
            })
        );

        await Promise.all(updates);
        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
    } catch (error) {
        console.error('Error reordenando FAQ:', error);
        throw new Error('Error al reordenar las FAQ');
    }
}

// ============================================
// SOCIAL ACTIONS (Redes sociales)
// ============================================

// Obtener redes sociales del studio
export async function obtenerRedesSocialesStudio(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const redesSociales = await prisma.studio_social_networks.findMany({
            where: { studio_id: studio.id },
            include: {
                platform: true
            },
            orderBy: { order: 'asc' }
        });

        return redesSociales;
    } catch (error) {
        console.error('Error obteniendo redes sociales:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Obtener plataformas disponibles
export async function obtenerPlataformasDisponibles() {
    try {
        const plataformas = await prisma.platform_social_networks.findMany({
            where: { is_active: true },
            orderBy: { order: 'asc' }
        });

        return { success: true, data: plataformas };
    } catch (error) {
        console.error('Error obteniendo plataformas:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Crear nueva red social
export async function crearRedSocial(studioSlug: string, data: {
    platform_id: string;
    url: string;
}) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const ultimoOrden = await prisma.studio_social_networks.findFirst({
            where: { studio_id: studio.id },
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const nuevoOrden = (ultimoOrden?.order || 0) + 1;

        const redSocial = await prisma.studio_social_networks.create({
            data: {
                studio_id: studio.id,
                platform_id: data.platform_id,
                url: data.url,
                order: nuevoOrden,
                is_active: true
            },
            include: {
                platform: true
            }
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        revalidatePath(`/${studioSlug}`); // Revalidate public profile
        return { success: true, data: redSocial };
    } catch (error) {
        console.error('Error creando red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Actualizar red social
export async function actualizarRedSocial(studioSlug: string, redSocialId: string, data: {
    platform_id?: string;
    url?: string;
    is_active?: boolean;
}) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const redSocial = await prisma.studio_social_networks.update({
            where: {
                id: redSocialId,
                studio_id: studio.id
            },
            data: {
                ...(data.platform_id && { platform_id: data.platform_id }),
                ...(data.url && { url: data.url }),
                ...(data.is_active !== undefined && { is_active: data.is_active })
            },
            include: {
                platform: true
            }
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        revalidatePath(`/${studioSlug}`); // Revalidate public profile
        return { success: true, data: redSocial };
    } catch (error) {
        console.error('Error actualizando red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Eliminar red social
export async function eliminarRedSocial(studioSlug: string, redSocialId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        await prisma.studio_social_networks.delete({
            where: {
                id: redSocialId,
                studio_id: studio.id
            }
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        revalidatePath(`/${studioSlug}`); // Revalidate public profile
        return { success: true };
    } catch (error) {
        console.error('Error eliminando red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Reordenar redes sociales
export async function reordenarRedesSociales(studioSlug: string, redesSociales: Array<{
    id: string;
    order: number;
}>) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        await Promise.all(
            redesSociales.map(red =>
                prisma.studio_social_networks.update({
                    where: {
                        id: red.id,
                        studio_id: studio.id
                    },
                    data: { order: red.order }
                })
            )
        );

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return { success: true };
    } catch (error) {
        console.error('Error reordenando redes sociales:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Toggle estado de red social
export async function toggleRedSocialEstado(studioSlug: string, redSocialId: string, isActive: boolean) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        await prisma.studio_social_networks.update({
            where: {
                id: redSocialId,
                studio_id: studio.id
            },
            data: { is_active: isActive }
        });

        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        return { success: true };
    } catch (error) {
        console.error('Error cambiando estado de red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

