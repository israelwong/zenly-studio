"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface FAQItem {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

/**
 * Obtener FAQs de un studio
 */
export async function getStudioFAQs(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                faq: {
                    orderBy: { orden: 'asc' }
                }
            }
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        return {
            success: true,
            data: studio.faq
        };
    } catch (error) {
        console.error("Error getting studio FAQs:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

/**
 * Crear nuevo FAQ
 */
export async function createFAQ(studioSlug: string, data: { pregunta: string; respuesta: string }) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                faq: {
                    orderBy: { orden: 'desc' },
                    take: 1
                }
            }
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        // Calcular siguiente orden
        const nextOrder = studio.faq.length > 0 ? studio.faq[0].orden + 1 : 0;

        const faq = await prisma.studio_faq.create({
            data: {
                studio_id: studio.id,
                pregunta: data.pregunta,
                respuesta: data.respuesta,
                orden: nextOrder,
                is_active: true
            }
        });

        // Revalidar rutas públicas y del editor
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/config/perfil-negocio`);

        return {
            success: true,
            data: faq
        };
    } catch (error) {
        console.error("Error creating FAQ:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

/**
 * Actualizar FAQ existente
 */
export async function updateFAQ(faqId: string, studioSlug: string, data: { pregunta?: string; respuesta?: string; is_active?: boolean }) {
    try {
        const faq = await prisma.studio_faq.update({
            where: { id: faqId },
            data: {
                ...(data.pregunta !== undefined && { pregunta: data.pregunta }),
                ...(data.respuesta !== undefined && { respuesta: data.respuesta }),
                ...(data.is_active !== undefined && { is_active: data.is_active })
            }
        });

        revalidatePath(`/${studioSlug}`);

        return {
            success: true,
            data: faq
        };
    } catch (error) {
        console.error("Error updating FAQ:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

/**
 * Eliminar FAQ
 */
export async function deleteFAQ(faqId: string, studioSlug: string) {
    try {
        await prisma.studio_faq.delete({
            where: { id: faqId }
        });

        // Revalidar rutas públicas y del editor
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/config/perfil-negocio`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

/**
 * Reordenar FAQs
 */
export async function reorderFAQs(studioSlug: string, faqIds: string[]) {
    try {
        // Actualizar orden de cada FAQ
        await Promise.all(
            faqIds.map((faqId, index) =>
                prisma.studio_faq.update({
                    where: { id: faqId },
                    data: { orden: index }
                })
            )
        );

        // Revalidar rutas públicas y del editor
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/config/perfil-negocio`);

        return { success: true };
    } catch (error) {
        console.error("Error reordering FAQs:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

/**
 * Reordenar un solo FAQ (mover arriba/abajo)
 */
export async function reorderFAQ(faqId: string, newIndex: number, studioSlug: string) {
    try {
        // Obtener todas las FAQs del studio
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                faq: {
                    where: { is_active: true },
                    orderBy: { orden: 'asc' }
                }
            }
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        const faqs = studio.faq;
        const currentIndex = faqs.findIndex(f => f.id === faqId);

        if (currentIndex === -1) {
            return { success: false, error: "FAQ no encontrado" };
        }

        // Crear nuevo array con el orden actualizado
        const reorderedFaqs = [...faqs];
        const [movedItem] = reorderedFaqs.splice(currentIndex, 1);
        reorderedFaqs.splice(newIndex, 0, movedItem);

        // Actualizar orden de todos los FAQs afectados
        await Promise.all(
            reorderedFaqs.map((faq, index) =>
                prisma.studio_faq.update({
                    where: { id: faq.id },
                    data: { orden: index }
                })
            )
        );

        // Revalidar rutas públicas y del editor
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/config/perfil-negocio`);

        return { success: true };
    } catch (error) {
        console.error("Error reordering FAQ:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}
