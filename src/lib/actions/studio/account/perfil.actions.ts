'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PerfilSchema } from '@/lib/actions/schemas/perfil-schemas';
import { PerfilData } from '@/app/[slug]/studio/account/perfil/types';

interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string | Record<string, string[]>;
    message?: string;
}

// Obtener perfil del lead asociado al proyecto
export async function obtenerPerfil(studioSlug: string): Promise<ActionResult<PerfilData>> {
    try {
        console.log('🔍 Buscando proyecto con slug:', studioSlug);

        // Buscar el proyecto por slug
        const proyecto = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        console.log('📋 Proyecto encontrado:', proyecto);

        if (!proyecto) {
            console.log('❌ Proyecto no encontrado');
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        console.log('🔍 Buscando lead asociado al proyecto:', proyecto.id);

        // Buscar el lead asociado al proyecto
        const lead = await prisma.platform_leads.findFirst({
            where: {
                studio_id: proyecto.id
            }
        });

        console.log('📋 Lead encontrado:', lead);

        if (!lead) {
            console.log('❌ Lead no encontrado');
            return {
                success: false,
                error: 'No se encontró información del perfil asociado a este proyecto'
            };
        }

        const perfilData: PerfilData = {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            avatarUrl: lead.avatar_url as string | undefined,
            createdAt: lead.created_at,
            updatedAt: lead.updated_at
        };

        console.log('✅ Perfil procesado:', perfilData);

        return {
            success: true,
            data: perfilData
        };
    } catch (error: unknown) {
        console.error('❌ Error al obtener perfil:', error);
        console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// Actualizar perfil del lead
export async function actualizarPerfil(
    studioSlug: string,
    data: Record<string, unknown>
): Promise<ActionResult<PerfilData>> {
    try {
        // Validar datos
        const validatedData = PerfilSchema.parse(data);

        // Buscar el proyecto por slug
        const proyecto = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!proyecto) {
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        // Buscar el lead asociado al proyecto
        const leadExistente = await prisma.platform_leads.findFirst({
            where: {
                studio_id: proyecto.id
            }
        });

        if (!leadExistente) {
            return {
                success: false,
                error: 'No se encontró información del perfil asociado a este proyecto'
            };
        }

        // Verificar que el email no esté duplicado (excluyendo el lead actual)
        if (validatedData.email && validatedData.email !== leadExistente.email) {
            const emailDuplicado = await prisma.platform_leads.findFirst({
                where: {
                    email: validatedData.email,
                    id: { not: leadExistente.id }
                }
            });

            if (emailDuplicado) {
                return {
                    success: false,
                    error: 'Ya existe un perfil con este correo electrónico'
                };
            }
        }

        // Actualizar el lead
        const leadActualizado = await prisma.platform_leads.update({
            where: { id: leadExistente.id },
            data: {
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone,
                avatar_url: validatedData.avatarUrl
            }
        });

        const perfilData: PerfilData = {
            id: leadActualizado.id,
            name: leadActualizado.name,
            email: leadActualizado.email,
            phone: leadActualizado.phone,
            avatarUrl: leadActualizado.avatar_url ? leadActualizado.avatar_url : undefined,
            createdAt: leadActualizado.created_at,
            updatedAt: leadActualizado.updated_at
        };

        revalidatePath(`/${studioSlug}/studio/account/perfil`);
        revalidatePath(`/${studioSlug}/studio`); // Revalidar rutas del studio para actualizar avatar en header

        return {
            success: true,
            data: perfilData,
            message: 'Perfil actualizado exitosamente'
        };
    } catch (error: unknown) {
        console.error('Error al actualizar perfil:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            const zodError = error as unknown as {
                errors: Array<{ path: string[]; message: string }>
            };
            return {
                success: false,
                error: zodError.errors.reduce((acc, err) => {
                    acc[err.path[0]] = [err.message];
                    return acc;
                }, {} as Record<string, string[]>)
            };
        }

        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}
