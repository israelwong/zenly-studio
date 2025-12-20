'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CuentaBancariaSchema, CuentaBancariaUpdateSchema } from '@/lib/actions/schemas/cuentas-bancarias-schemas';
import { CuentaBancariaData } from '@/app/studio/[slug]/configuracion/negocio/cuentas-bancarias/types';

interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string | Record<string, string[]>;
    message?: string;
}

// Obtener todas las cuentas bancarias de un proyecto
export async function obtenerCuentasBancarias(studioSlug: string): Promise<ActionResult<CuentaBancariaData[]>> {
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

        console.log('🔍 Buscando cuentas bancarias para proyecto:', proyecto.id);

        const cuentas = await prisma.studio_cuentas_bancarias.findMany({
            where: {
                studio_id: proyecto.id,
                activo: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log('📋 Cuentas encontradas:', cuentas.length, cuentas);

        const cuentasData: CuentaBancariaData[] = cuentas.map(cuenta => ({
            id: cuenta.id,
            banco: cuenta.banco,
            numeroCuenta: cuenta.numeroCuenta,
            titular: cuenta.titular,
            activo: cuenta.activo,
            createdAt: cuenta.createdAt,
            updatedAt: cuenta.updatedAt
        }));

        console.log('✅ Cuentas procesadas:', cuentasData.length);

        return {
            success: true,
            data: cuentasData
        };
    } catch (error) {
        console.error('❌ Error al obtener cuentas bancarias:', error);
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

// Crear nueva cuenta bancaria
export async function crearCuentaBancaria(
    studioSlug: string,
    data: Record<string, unknown>
): Promise<ActionResult<CuentaBancariaData>> {
    try {
        // Validar datos
        const validatedData = CuentaBancariaSchema.parse(data);

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

        // Verificar que la CLABE no esté duplicada
        const cuentaExistente = await prisma.studio_cuentas_bancarias.findFirst({
            where: {
                studio_id: proyecto.id,
                numeroCuenta: validatedData.numeroCuenta,
                activo: true
            }
        });

        if (cuentaExistente) {
            return {
                success: false,
                error: 'Ya existe una cuenta bancaria con esta CLABE'
            };
        }

        // Crear la cuenta bancaria
        const nuevaCuenta = await prisma.studio_cuentas_bancarias.create({
            data: {
                studio_id: proyecto.id,
                banco: validatedData.banco,
                numeroCuenta: validatedData.numeroCuenta,
                tipoCuenta: 'corriente', // Valor por defecto
                titular: validatedData.titular,
                activo: validatedData.activo,
                esPrincipal: false // No permitir cuenta principal en versión simple
            }
        });

        const cuentaData: CuentaBancariaData = {
            id: nuevaCuenta.id,
            banco: nuevaCuenta.banco,
            numeroCuenta: nuevaCuenta.numeroCuenta,
            titular: nuevaCuenta.titular,
            activo: nuevaCuenta.activo,
            createdAt: nuevaCuenta.createdAt,
            updatedAt: nuevaCuenta.updatedAt
        };

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/cuentas-bancarias`);

        return {
            success: true,
            data: cuentaData,
            message: 'Cuenta bancaria creada exitosamente'
        };
    } catch (error: unknown) {
        console.error('Error al crear cuenta bancaria:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            const zodError = error as unknown as { errors: Array<{ path: string[]; message: string }> };
            return {
                success: false,
                error: zodError.errors.reduce((acc: Record<string, string[]>, err) => {
                    acc[err.path[0]] = [err.message];
                    return acc;
                }, {})
            };
        }

        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// Actualizar cuenta bancaria
export async function actualizarCuentaBancaria(
    studioSlug: string,
    cuentaId: string,
    data: Record<string, unknown>
): Promise<ActionResult<CuentaBancariaData>> {
    try {
        // Validar datos
        const validatedData = CuentaBancariaUpdateSchema.parse({ ...data, id: cuentaId });

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

        // Verificar que la cuenta existe y pertenece al proyecto
        const cuentaExistente = await prisma.studio_cuentas_bancarias.findFirst({
            where: {
                id: cuentaId,
                studio_id: proyecto.id
            }
        });

        if (!cuentaExistente) {
            return {
                success: false,
                error: 'Cuenta bancaria no encontrada'
            };
        }

        // Verificar que la CLABE no esté duplicada (excluyendo la cuenta actual)
        if (validatedData.numeroCuenta && validatedData.numeroCuenta !== cuentaExistente.numeroCuenta) {
            const clabeDuplicada = await prisma.studio_cuentas_bancarias.findFirst({
                where: {
                    studio_id: proyecto.id,
                    numeroCuenta: validatedData.numeroCuenta,
                    activo: true,
                    id: { not: cuentaId }
                }
            });

            if (clabeDuplicada) {
                return {
                    success: false,
                    error: 'Ya existe una cuenta bancaria con esta CLABE'
                };
            }
        }

        // No permitir cuenta principal en versión simple

        // Actualizar la cuenta bancaria
        const cuentaActualizada = await prisma.studio_cuentas_bancarias.update({
            where: { id: cuentaId },
            data: {
                banco: validatedData.banco,
                numeroCuenta: validatedData.numeroCuenta,
                tipoCuenta: 'corriente', // Mantener valor por defecto
                titular: validatedData.titular,
                activo: validatedData.activo,
                esPrincipal: false // No permitir cuenta principal en versión simple
            }
        });

        const cuentaData: CuentaBancariaData = {
            id: cuentaActualizada.id,
            banco: cuentaActualizada.banco,
            numeroCuenta: cuentaActualizada.numeroCuenta,
            titular: cuentaActualizada.titular,
            activo: cuentaActualizada.activo,
            createdAt: cuentaActualizada.createdAt,
            updatedAt: cuentaActualizada.updatedAt
        };

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/cuentas-bancarias`);

        return {
            success: true,
            data: cuentaData,
            message: 'Cuenta bancaria actualizada exitosamente'
        };
    } catch (error: unknown) {
        console.error('Error al actualizar cuenta bancaria:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            const zodError = error as unknown as { errors: Array<{ path: string[]; message: string }> };
            return {
                success: false,
                error: zodError.errors.reduce((acc: Record<string, string[]>, err) => {
                    acc[err.path[0]] = [err.message];
                    return acc;
                }, {})
            };
        }

        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// Eliminar cuenta bancaria (soft delete)
export async function eliminarCuentaBancaria(
    studioSlug: string,
    cuentaId: string
): Promise<ActionResult> {
    try {
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

        // Verificar que la cuenta existe y pertenece al proyecto
        const cuentaExistente = await prisma.studio_cuentas_bancarias.findFirst({
            where: {
                id: cuentaId,
                studio_id: proyecto.id
            }
        });

        if (!cuentaExistente) {
            return {
                success: false,
                error: 'Cuenta bancaria no encontrada'
            };
        }

        // Soft delete - marcar como inactiva
        await prisma.studio_cuentas_bancarias.update({
            where: { id: cuentaId },
            data: {
                activo: false,
                esPrincipal: false // También quitar como principal
            }
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/cuentas-bancarias`);

        return {
            success: true
        };
    } catch (error) {
        console.error('Error al eliminar cuenta bancaria:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}


// Actualizar orden de cuentas bancarias
export async function actualizarOrdenCuentasBancarias(
    studioSlug: string,
    nuevoOrden: { id: string; orden: number }[]
): Promise<ActionResult> {
    try {
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

        // Actualizar el orden de cada cuenta
        for (const { id } of nuevoOrden) {
            await prisma.studio_cuentas_bancarias.updateMany({
                where: {
                    id,
                    studio_id: proyecto.id
                },
                data: {
                    // No hay campo orden en el schema actual, pero mantenemos la función para compatibilidad
                }
            });
        }

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/cuentas-bancarias`);

        return {
            success: true
        };
    } catch (error) {
        console.error('Error al actualizar orden de cuentas:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}