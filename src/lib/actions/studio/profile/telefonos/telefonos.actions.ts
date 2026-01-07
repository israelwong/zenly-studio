"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";

export interface TelefonoData {
    id: string;
    studio_id: string;
    numero: string;
    tipo: 'WHATSAPP' | 'LLAMADAS' | 'AMBOS';
    etiqueta?: string;
    is_active: boolean;
    order: number;
    created_at: Date;
    updated_at: Date;
}

export interface TelefonoFormData {
    numero: string;
    tipo: 'WHATSAPP' | 'LLAMADAS' | 'AMBOS';
    etiqueta?: string;
    is_active?: boolean;
}

export async function crearTelefono(
    studioSlug: string,
    data: TelefonoFormData
) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const ultimoTelefono = await prisma.studio_phones.findFirst({
            where: { studio_id: studio.id },
            orderBy: { order: 'desc' }
        });

        const nuevoOrden = ultimoTelefono ? ultimoTelefono.order + 1 : 0;

        const telefono = await prisma.studio_phones.create({
            data: {
                studio_id: studio.id,
                number: data.numero,
                type: data.tipo,
                label: data.etiqueta,
                is_active: data.is_active ?? true,
                order: nuevoOrden
            }
        });

        // Revalidar todas las rutas que muestran el perfil público
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/profile/telefonos`);
        revalidatePath(`/${studioSlug}/profile`, 'page');
        return telefono;
    } catch (error) {
        console.error('Error creando teléfono:', error);
        throw error;
    }
}

export async function actualizarTelefono(
    studioSlug: string,
    telefonoId: string,
    data: Partial<TelefonoFormData>
) {
    try {
        const telefonoExistente = await prisma.studio_phones.findUnique({
            where: { id: telefonoId }
        });

        if (!telefonoExistente) {
            throw new Error('Teléfono no encontrado');
        }

        const updateData: {
            number?: string;
            type?: string;
            label?: string | null;
            is_active?: boolean;
        } = {};

        if (data.numero !== undefined) {
            updateData.number = data.numero;
        }
        if (data.tipo !== undefined) {
            updateData.type = data.tipo;
        }
        if (data.etiqueta !== undefined) {
            updateData.label = data.etiqueta;
        }
        if (data.is_active !== undefined) {
            updateData.is_active = data.is_active;
        }

        const telefono = await prisma.studio_phones.update({
            where: { id: telefonoId },
            data: updateData
        });

        // Revalidar todas las rutas que muestran el perfil público
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/profile/telefonos`);
        revalidatePath(`/${studioSlug}/profile`, 'page');
        return telefono;
    } catch (error) {
        console.error('Error actualizando teléfono:', error);
        throw error;
    }
}

export async function eliminarTelefono(studioSlug: string, telefonoId: string) {
    try {
        const telefono = await prisma.studio_phones.findUnique({
            where: { id: telefonoId }
        });

        if (!telefono) {
            return;
        }

        await prisma.studio_phones.delete({
            where: { id: telefonoId }
        });

        // Revalidar todas las rutas que muestran el perfil público
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/studio/profile/telefonos`);
        revalidatePath(`/${studioSlug}/profile`, 'page');
    } catch (error) {
        console.error('Error eliminando teléfono:', error);
        throw error;
    }
}

export async function reordenarTelefonos(
    studioSlug: string,
    telefonos: { id: string; order: number }[]
) {
    try {
        await retryDatabaseOperation(async () => {
            await prisma.$transaction(
                telefonos.map(telefono =>
                    prisma.studio_phones.update({
                        where: { id: telefono.id },
                        data: { order: telefono.order }
                    })
                )
            );
        });

        revalidatePath(`/${studioSlug}/studio/profile/telefonos`);
    } catch (error) {
        console.error('Error reordenando teléfonos:', error);
        throw error;
    }
}

