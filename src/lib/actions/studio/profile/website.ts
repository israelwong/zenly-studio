"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateWebsiteResult {
    success: boolean;
    error?: string;
}

export async function actualizarWebsite(
    studioSlug: string,
    website: string | null
): Promise<UpdateWebsiteResult> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Studio no encontrado'
            };
        }

        await prisma.studios.update({
            where: { id: studio.id },
            data: { website: website?.trim() || null }
        });

        revalidatePath(`/${studioSlug}/studio/business/identity`);
        revalidatePath(`/${studioSlug}`);

        return { success: true };
    } catch (error) {
        console.error('[actualizarWebsite] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar página web'
        };
    }
}
