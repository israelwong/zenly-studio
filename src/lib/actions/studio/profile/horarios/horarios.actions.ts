"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import { revalidatePath } from "next/cache";
import {
    HorarioCreateSchema,
    HorarioUpdateSchema,
    HorarioToggleSchema,
    type HorarioCreateForm,
    type HorarioUpdateForm,
    type HorarioToggleForm,
} from "@/lib/actions/schemas/horarios-schemas";

// Crear nuevo horario
export async function crearHorario(studioSlug: string, data: HorarioCreateForm) {
    try {
        const validatedData = HorarioCreateSchema.parse(data);

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const horario = await retryDatabaseOperation(async () => {
            return await prisma.studio_business_hours.create({
                data: {
                    studio_id: studio.id,
                    day_of_week: validatedData.day_of_week,
                    start_time: validatedData.start_time,
                    end_time: validatedData.end_time,
                    is_active: validatedData.is_active,
                    order: validatedData.order || 0,
                },
                select: {
                    id: true,
                    day_of_week: true,
                    start_time: true,
                    end_time: true,
                    is_active: true,
                    order: true,
                    created_at: true,
                    updated_at: true,
                },
            });
        });

        revalidatePath(`/${studioSlug}/studio/profile/horarios`);
        return horario;
    } catch (error) {
        console.error('Error creando horario:', error);
        throw new Error("Error al crear el horario");
    }
}

// Actualizar horario
export async function actualizarHorario(studioSlug: string, id: string, data: HorarioUpdateForm) {
    try {
        const validatedData = HorarioUpdateSchema.parse(data);

        const horario = await retryDatabaseOperation(async () => {
            return await prisma.studio_business_hours.update({
                where: { id },
                data: {
                    day_of_week: validatedData.day_of_week,
                    start_time: validatedData.start_time,
                    end_time: validatedData.end_time,
                    is_active: validatedData.is_active,
                    order: validatedData.order,
                },
                select: {
                    id: true,
                    day_of_week: true,
                    start_time: true,
                    end_time: true,
                    is_active: true,
                    order: true,
                    created_at: true,
                    updated_at: true,
                },
            });
        });

        revalidatePath(`/${studioSlug}/studio/profile/horarios`);
        return horario;
    } catch (error) {
        console.error('Error actualizando horario:', error);
        throw new Error("Error al actualizar el horario");
    }
}

// Toggle estado del horario
export async function toggleHorarioEstado(studioSlug: string, id: string, data: HorarioToggleForm) {
    try {
        const validatedData = HorarioToggleSchema.parse(data);

        const horario = await retryDatabaseOperation(async () => {
            return await prisma.studio_business_hours.update({
                where: { id },
                data: {
                    is_active: validatedData.is_active,
                },
                select: {
                    id: true,
                    day_of_week: true,
                    start_time: true,
                    end_time: true,
                    is_active: true,
                    order: true,
                    created_at: true,
                    updated_at: true,
                },
            });
        });

        revalidatePath(`/${studioSlug}/studio/profile/horarios`);
        return horario;
    } catch (error) {
        console.error('Error cambiando estado del horario:', error);
        throw new Error("Error al cambiar el estado del horario");
    }
}

// Inicializar horarios por defecto
export async function inicializarHorariosPorDefecto(studioSlug: string): Promise<boolean> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const existingHorarios = await prisma.studio_business_hours.count({
            where: { studio_id: studio.id },
        });

        // Si ya hay horarios, retornar false para indicar que no se inicializaron
        if (existingHorarios > 0) {
            return false;
        }

        const diasSemana = [
            { day: 'monday', name: 'Lunes' },
            { day: 'tuesday', name: 'Martes' },
            { day: 'wednesday', name: 'Miércoles' },
            { day: 'thursday', name: 'Jueves' },
            { day: 'friday', name: 'Viernes' },
            { day: 'saturday', name: 'Sábado' },
            { day: 'sunday', name: 'Domingo' },
        ];

        const horariosPorDefecto = diasSemana.map((dia, index) => ({
            studio_id: studio.id,
            day_of_week: dia.day,
            start_time: '09:00',
            end_time: '18:00',
            is_active: index < 5,
            order: index,
        }));

        await retryDatabaseOperation(async () => {
            await prisma.studio_business_hours.createMany({
                data: horariosPorDefecto,
            });
        });

        revalidatePath(`/${studioSlug}/studio/profile/horarios`);
        return true; // Retornar true para indicar que se inicializaron horarios
    } catch (error) {
        console.error('Error inicializando horarios por defecto:', error);
        throw new Error("Error al inicializar los horarios por defecto");
    }
}

