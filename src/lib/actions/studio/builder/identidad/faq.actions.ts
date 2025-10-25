'use server';

import { prisma } from '@/lib/prisma';
import { FAQItem } from '../../../../app/[slug]/studio/builder/identidad/types';

/**
 * Obtener FAQ de un estudio usando studio_faq
 */
export async function obtenerFAQ(studioSlug: string): Promise<FAQItem[]> {
    try {
        // Buscar el estudio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            throw new Error('Estudio no encontrado');
        }

        // Obtener FAQ del estudio
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

/**
 * Crear nueva FAQ
 */
export async function crearFAQ(
    studioSlug: string,
    data: { pregunta: string; respuesta: string }
): Promise<FAQItem> {
    try {
        // Buscar el estudio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            throw new Error('Estudio no encontrado');
        }

        // Obtener el siguiente orden
        const lastFAQ = await prisma.studio_faq.findFirst({
            where: { studio_id: studio.id },
            orderBy: { orden: 'desc' }
        });

        const nextOrder = (lastFAQ?.orden || 0) + 1;

        // Crear la FAQ
        const faq = await prisma.studio_faq.create({
            data: {
                studio_id: studio.id,
                pregunta: data.pregunta,
                respuesta: data.respuesta,
                orden: nextOrder,
                is_active: true
            }
        });

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

/**
 * Actualizar FAQ
 */
export async function actualizarFAQ(
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

/**
 * Eliminar FAQ
 */
export async function eliminarFAQ(faqId: string): Promise<void> {
    try {
        await prisma.studio_faq.delete({
            where: { id: faqId }
        });
    } catch (error) {
        console.error('Error eliminando FAQ:', error);
        throw new Error('Error al eliminar la FAQ');
    }
}

/**
 * Toggle activar/desactivar FAQ
 */
export async function toggleFAQ(faqId: string, isActive: boolean): Promise<void> {
    try {
        await prisma.studio_faq.update({
            where: { id: faqId },
            data: { is_active: isActive }
        });
    } catch (error) {
        console.error('Error toggleando FAQ:', error);
        throw new Error('Error al cambiar el estado de la FAQ');
    }
}

/**
 * Reordenar FAQ
 */
export async function reordenarFAQ(faqIds: string[]): Promise<void> {
    try {
        const updates = faqIds.map((id, index) =>
            prisma.studio_faq.update({
                where: { id },
                data: { orden: index + 1 }
            })
        );

        await Promise.all(updates);
    } catch (error) {
        console.error('Error reordenando FAQ:', error);
        throw new Error('Error al reordenar las FAQ');
    }
}
