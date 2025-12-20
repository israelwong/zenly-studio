import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface StudioAuthResult {
    studio: {
        id: string;
        name: string;
        slug: string;
    } | null;
    error?: string;
    status?: number;
}

/**
 * Middleware para autenticación de studios
 * Verifica que el studio existe y el usuario tiene acceso
 */
export async function authenticateStudio(
    request: NextRequest,
    slug: string
): Promise<StudioAuthResult> {
    try {
        // Obtener el studio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug },
            select: {
                id: true,
                studio_name: true,
                slug: true,
                is_active: true
            }
        });

        if (!studio) {
            return {
                studio: null,
                error: 'Studio not found',
                status: 404
            };
        }

        if (!studio.is_active) {
            return {
                studio: null,
                error: 'Studio is inactive',
                status: 403
            };
        }

        // TODO: Verificar que el usuario autenticado tiene acceso a este studio
        // const userId = request.headers.get('x-user-id');
        // if (userId) {
        //     const userAccess = await prisma.studio_users.findFirst({
        //         where: {
        //             studio_id: studio.id,
        //             userId: userId
        //         }
        //     });
        //     
        //     if (!userAccess) {
        //         return {
        //             studio: null,
        //             error: 'Access denied',
        //             status: 403
        //         };
        //     }
        // }

        return {
            studio: {
                id: studio.id,
                name: studio.studio_name,
                slug: studio.slug
            }
        };
    } catch (error) {
        console.error('Error in studio authentication:', error);
        return {
            studio: null,
            error: 'Internal server error',
            status: 500
        };
    }
}

/**
 * Helper para crear respuestas de error consistentes
 */
export function createErrorResponse(error: string, status: number) {
    return {
        error,
        status
    };
}

/**
 * Helper para validar URLs
 */
export function validateUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Helper para validar datos requeridos
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]) {
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
        return {
            isValid: false,
            error: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        };
    }

    return { isValid: true };
}
