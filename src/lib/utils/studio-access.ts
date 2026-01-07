/**
 * Studio Access Utilities
 * 
 * Funciones para controlar acceso y funcionalidades según el estado del studio
 * Útil para manejar casos especiales durante desarrollo y producción
 */

import { prisma } from '@/lib/prisma';

/**
 * Lista de estudios permitidos (whitelist) que pueden funcionar completamente
 * incluso durante desarrollo o restricciones de suscripción
 */
const ALLOWED_STUDIO_SLUGS = [
    'prosocial', // Studio de desarrollo/operación real
    // Agregar más slugs aquí si es necesario
];

/**
 * Verifica si un studio tiene acceso completo a todas las funcionalidades
 * 
 * @param studioSlug - Slug del studio
 * @returns true si el studio tiene acceso completo
 * 
 * Un studio tiene acceso completo si:
 * - Está en la whitelist (ALLOWED_STUDIO_SLUGS)
 * - Tiene plan "unlimited"
 * - Tiene subscription_status = "UNLIMITED"
 */
export async function hasFullStudioAccess(studioSlug: string): Promise<boolean> {
    try {
        // Verificar si está en whitelist
        if (ALLOWED_STUDIO_SLUGS.includes(studioSlug)) {
            return true;
        }

        // Verificar plan y subscription_status
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                plan_id: true,
                subscription_status: true,
                plan: {
                    select: {
                        slug: true,
                    },
                },
            },
        });

        if (!studio) {
            return false;
        }

        // Verificar si tiene plan unlimited o subscription_status UNLIMITED
        if (
            studio.subscription_status === 'UNLIMITED' ||
            studio.plan?.slug === 'unlimited'
        ) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('[hasFullStudioAccess] Error:', error);
        return false;
    }
}

/**
 * Verifica si se permiten nuevos registros de estudios
 * 
 * @returns true si se permiten nuevos registros, false si están bloqueados
 * 
 * Por defecto, durante desarrollo, solo se permiten estudios en whitelist
 * o con plan unlimited. Para producción, esto debería estar controlado por
 * variable de entorno.
 */
export function areNewStudiosAllowed(): boolean {
    // En desarrollo, solo permitir estudios especiales
    // En producción, esto debería venir de variable de entorno
    const allowNewStudios = process.env.ALLOW_NEW_STUDIOS === 'true';

    return allowNewStudios;
}

/**
 * Verifica si un studio puede mostrar contenido público completo
 * (paquetes, portfolios, etc.)
 * 
 * @param studioSlug - Slug del studio
 * @returns true si puede mostrar contenido público completo
 * 
 * Por defecto, todos los estudios pueden mostrar contenido público.
 * Esta función puede usarse para restricciones futuras si es necesario.
 */
export async function canShowPublicContent(studioSlug: string): Promise<boolean> {
    // Por ahora, todos los estudios pueden mostrar contenido público
    // Esto permite que clientes vean paquetes, portfolios, etc.
    // incluso si el studio no tiene suscripción activa

    // En el futuro, podrías agregar lógica aquí para restringir
    // contenido público basado en plan o estado

    return true;
}

