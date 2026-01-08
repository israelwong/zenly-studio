// Ruta: src/lib/actions/studio/config/terminos-condiciones.actions.ts

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TerminosCondicionesSchema, type TerminosCondicionesForm } from "@/lib/actions/schemas/terminos-condiciones-schemas";

// Template por defecto de términos y condiciones (HTML simple)
const DEFAULT_TERMINOS_CONDICIONES_CONTENT = `<p><strong>Términos y Condiciones Generales</strong></p><ul><li>Los paquetes y precios pueden cambiar sin previo aviso.</li><li>El monto pendiente a diferir debe ser cubierto 2 días previos a la celebración del evento.</li><li>Una vez contratado, el precio del paquete o cotización se congela y no está sujeto a cambios.</li><li>Los servicios están sujetos a disponibilidad del estudio.</li><li>Al generar el contrato y pagar el anticipo, tanto el cliente como el estudio se comprometen legalmente a cumplir con los términos establecidos.</li><li>El anticipo pagado no es reembolsable en caso de cancelación por parte del cliente.</li><li>Las fechas y horarios acordados son compromisos vinculantes para ambas partes.</li></ul>`;

// Obtener todos los términos y condiciones de un studio
export async function obtenerTerminosCondiciones(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar si existe un término activo, si no, crear uno por defecto
        const terminoActivo = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                studio_id: studio.id,
                is_active: true,
            },
        });

        if (!terminoActivo) {
            // Crear término por defecto si no existe
            const seedResult = await seedDefaultTerminosCondiciones(studio.id);
            if (!seedResult.success) {
                console.error("Error al crear término por defecto:", seedResult.error);
            }
        }

        const terminos = await prisma.studio_terminos_condiciones.findMany({
            where: { studio_id: studio.id },
            orderBy: [
                { is_active: 'desc' }, // Activos primero
                { created_at: 'desc' }, // Más recientes primero
            ],
        });

        return {
            success: true,
            data: terminos,
        };
    } catch (error) {
        console.error("Error al obtener términos y condiciones:", error);
        return {
            success: false,
            error: "Error al obtener términos y condiciones",
        };
    }
}

// Obtener términos y condiciones activos
export async function obtenerTerminosCondicionesActivos(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar si existe un término activo, si no, crear uno por defecto
        let terminoActivo = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                studio_id: studio.id,
                is_active: true,
            },
        });

        if (!terminoActivo) {
            // Crear término por defecto si no existe
            const seedResult = await seedDefaultTerminosCondiciones(studio.id);
            if (seedResult.success && seedResult.data) {
                terminoActivo = seedResult.data;
            }
        }

        const terminos = terminoActivo
            ? [terminoActivo]
            : await prisma.studio_terminos_condiciones.findMany({
                where: {
                    studio_id: studio.id,
                    is_active: true,
                },
                orderBy: { order: 'asc' },
            });

        return {
            success: true,
            data: terminos,
        };
    } catch (error) {
        console.error("Error al obtener términos y condiciones activos:", error);
        return {
            success: false,
            error: "Error al obtener términos y condiciones activos",
        };
    }
}

// Obtener un término y condición específico
export async function obtenerTerminoCondicion(studioSlug: string, terminoId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const termino = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                id: terminoId,
                studio_id: studio.id,
            },
        });

        if (!termino) {
            return {
                success: false,
                error: "Términos y condiciones no encontrados",
            };
        }

        return {
            success: true,
            data: termino,
        };
    } catch (error) {
        console.error("Error al obtener término y condición:", error);
        return {
            success: false,
            error: "Error al obtener término y condición",
        };
    }
}

// Crear términos y condiciones
export async function crearTerminosCondiciones(studioSlug: string, data: TerminosCondicionesForm) {
    try {
        const validationResult = TerminosCondicionesSchema.safeParse(data);

        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.flatten().fieldErrors,
            };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Si se está creando como activo, desactivar todos los anteriores
        if (validationResult.data.is_active !== false) {
            await prisma.studio_terminos_condiciones.updateMany({
                where: {
                    studio_id: studio.id,
                    is_active: true,
                },
                data: {
                    is_active: false,
                },
            });
        }

        // Obtener el orden más alto para asignar el siguiente
        const ultimoOrden = await prisma.studio_terminos_condiciones.findFirst({
            where: { studio_id: studio.id },
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const nuevoOrden = (ultimoOrden?.order ?? -1) + 1;

        const nuevoTermino = await prisma.studio_terminos_condiciones.create({
            data: {
                studio_id: studio.id,
                title: validationResult.data.title,
                content: validationResult.data.content,
                order: validationResult.data.order ?? nuevoOrden,
                is_active: validationResult.data.is_active ?? true,
                is_required: validationResult.data.is_required ?? false,
            },
        });

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            data: nuevoTermino,
        };
    } catch (error) {
        console.error("Error al crear términos y condiciones:", error);
        return {
            success: false,
            error: "Error al crear términos y condiciones",
        };
    }
}

// Crear términos y condiciones por defecto para un studio
export async function seedDefaultTerminosCondiciones(studioId: string) {
    try {
        // Verificar si ya existe un término activo
        const terminoExistente = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                studio_id: studioId,
                is_active: true,
            },
        });

        if (terminoExistente) {
            return {
                success: true,
                data: terminoExistente,
                message: "Ya existe un término y condición activo",
            };
        }

        // Crear término por defecto
        const nuevoTermino = await prisma.studio_terminos_condiciones.create({
            data: {
                studio_id: studioId,
                title: "Términos y Condiciones Generales",
                content: DEFAULT_TERMINOS_CONDICIONES_CONTENT,
                order: 0,
                is_active: true,
                is_required: false,
            },
        });

        return {
            success: true,
            data: nuevoTermino,
        };
    } catch (error) {
        console.error("Error al crear términos y condiciones por defecto:", error);
        return {
            success: false,
            error: "Error al crear términos y condiciones por defecto",
        };
    }
}

// Actualizar términos y condiciones (con versionado: crea nuevo registro y desactiva el anterior)
export async function actualizarTerminosCondiciones(
    studioSlug: string,
    terminoId: string,
    data: TerminosCondicionesForm
) {
    try {
        const validationResult = TerminosCondicionesSchema.safeParse(data);

        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.flatten().fieldErrors,
            };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar que el término pertenezca al studio
        const terminoExistente = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                id: terminoId,
                studio_id: studio.id,
            },
        });

        if (!terminoExistente) {
            return {
                success: false,
                error: "Términos y condiciones no encontrados o no pertenecen al studio",
            };
        }

        // Si el contenido o título cambió, crear nueva versión (histórico)
        const contenidoCambio =
            terminoExistente.content !== validationResult.data.content ||
            terminoExistente.title !== validationResult.data.title;

        if (contenidoCambio && terminoExistente.is_active) {
            // Desactivar el término anterior (se convierte en histórico)
            await prisma.studio_terminos_condiciones.update({
                where: { id: terminoId },
                data: {
                    is_active: false,
                    updated_at: new Date(),
                },
            });

            // Desactivar otros términos activos
            await prisma.studio_terminos_condiciones.updateMany({
                where: {
                    studio_id: studio.id,
                    is_active: true,
                    id: { not: terminoId },
                },
                data: {
                    is_active: false,
                },
            });

            // Crear nuevo registro con el contenido actualizado
            const nuevoTermino = await prisma.studio_terminos_condiciones.create({
                data: {
                    studio_id: studio.id,
                    title: validationResult.data.title,
                    content: validationResult.data.content,
                    order: validationResult.data.order ?? terminoExistente.order,
                    is_active: true,
                    is_required: validationResult.data.is_required ?? terminoExistente.is_required,
                },
            });

            revalidatePath(`/${studioSlug}/studio/commercial/promises`);

            return {
                success: true,
                data: nuevoTermino,
                message: "Términos y condiciones actualizados. La versión anterior se guardó como histórico.",
            };
        } else {
            // Si solo cambió is_active u otros campos no críticos, actualizar directamente
            // Si se activa, desactivar otros
            if (validationResult.data.is_active === true) {
                await prisma.studio_terminos_condiciones.updateMany({
                    where: {
                        studio_id: studio.id,
                        is_active: true,
                        id: { not: terminoId },
                    },
                    data: {
                        is_active: false,
                    },
                });
            }

            const terminoActualizado = await prisma.studio_terminos_condiciones.update({
                where: { id: terminoId },
                data: {
                    title: validationResult.data.title,
                    content: validationResult.data.content,
                    order: validationResult.data.order ?? terminoExistente.order,
                    is_active: validationResult.data.is_active ?? terminoExistente.is_active,
                    is_required: validationResult.data.is_required ?? terminoExistente.is_required,
                    updated_at: new Date(),
                },
            });

            revalidatePath(`/${studioSlug}/studio/commercial/promises`);

            return {
                success: true,
                data: terminoActualizado,
            };
        }
    } catch (error) {
        console.error("Error al actualizar términos y condiciones:", error);
        return {
            success: false,
            error: "Error al actualizar términos y condiciones",
        };
    }
}

// Eliminar términos y condiciones (solo históricos, no activos)
export async function eliminarTerminosCondiciones(studioSlug: string, terminoId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar que el término pertenezca al studio antes de eliminar
        const termino = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                id: terminoId,
                studio_id: studio.id,
            },
        });

        if (!termino) {
            return {
                success: false,
                error: "Términos y condiciones no encontrados o no pertenecen al studio",
            };
        }

        // No permitir eliminar términos activos
        if (termino.is_active) {
            return {
                success: false,
                error: "No se pueden eliminar términos y condiciones activos. Edítalos para crear una nueva versión.",
            };
        }

        await prisma.studio_terminos_condiciones.delete({
            where: { id: terminoId },
        });

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            message: "Versión histórica eliminada exitosamente",
        };
    } catch (error) {
        console.error("Error al eliminar términos y condiciones:", error);
        return {
            success: false,
            error: "Error al eliminar términos y condiciones",
        };
    }
}

// Actualizar orden de términos y condiciones
export async function actualizarOrdenTerminosCondiciones(studioSlug: string, terminos: { id: string; orden: number }[]) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.$transaction(
            terminos.map(termino =>
                prisma.studio_terminos_condiciones.update({
                    where: { id: termino.id },
                    data: { order: termino.orden, updated_at: new Date() },
                })
            )
        );

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            message: "Orden actualizado exitosamente",
        };
    } catch (error) {
        console.error("Error al actualizar orden:", error);
        return {
            success: false,
            error: "Error al actualizar el orden",
        };
    }
}

