"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateEmailResult {
    success: boolean;
    error?: string;
}

export async function actualizarEmailStudio(
    studioSlug: string,
    email: string
): Promise<UpdateEmailResult> {
    try {
        // Buscar el studio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true, email: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Studio no encontrado'
            };
        }

        // Verificar que el email no esté en uso por otro studio
        const emailExists = await prisma.studios.findFirst({
            where: {
                email: email.trim(),
                id: { not: studio.id }
            }
        });

        if (emailExists) {
            return {
                success: false,
                error: 'Este correo electrónico ya está registrado'
            };
        }

        // Actualizar el email
        await prisma.studios.update({
            where: { id: studio.id },
            data: { email: email.trim() }
        });

        revalidatePath(`/${studioSlug}/studio/business/identity`);
        revalidatePath(`/${studioSlug}`);

        return { success: true };
    } catch (error) {
        console.error('[actualizarEmailStudio] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar correo electrónico'
        };
    }
}
