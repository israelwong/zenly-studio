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
        const studio = await prisma.studio.findUnique({
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
        const studio = await prisma.studio.findUnique({
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

        const faq = await prisma.faq.create({
            data: {
                studio_id: studio.id,
                pregunta: data.pregunta,
                respuesta: data.respuesta,
                orden: nextOrder,
                is_active: true
            }
        });

        revalidatePath(`/${studioSlug}`);
        
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
        const faq = await prisma.faq.update({
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
        await prisma.faq.delete({
            where: { id: faqId }
        });

        revalidatePath(`/${studioSlug}`);
        
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
                prisma.faq.update({
                    where: { id: faqId },
                    data: { orden: index }
                })
            )
        );

        revalidatePath(`/${studioSlug}`);
        
        return { success: true };
    } catch (error) {
        console.error("Error reordering FAQs:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}
