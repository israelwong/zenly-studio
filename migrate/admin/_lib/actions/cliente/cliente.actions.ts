'use server'
import { prisma } from '@/lib/prisma';
import { Cliente } from "../../types";
import {
    ActualizarClienteSchema,
    type ActualizarCliente,
    type ClienteCompleto
} from './cliente.schemas';

export async function obtenerClientes() {
    return await prisma.cliente.findMany({
        orderBy: {
            nombre: 'asc'
        }
    });
}

export async function obtenerCliente(id: string) {
    return await prisma.cliente.findUnique({
        where: {
            id: id
        },
        include: {
            Canal: {
                select: {
                    nombre: true
                }
            }
        }
    });
}

export async function obtenerClientePorStatus(status: string) {
    return await prisma.cliente.findMany({
        where: {
            status: status
        },
        orderBy: [
            {
                updatedAt: 'desc'
            },
            {
                createdAt: 'asc'
            }
        ]
    });
}

export async function crearCliente(cliente: Cliente) {

    // Verificar si el teléfono ya existe
    const clienteExistente = await prisma.cliente.findUnique({
        where: {
            telefono: cliente.telefono ?? ''
        }
    });

    if (clienteExistente) {
        return { success: false, message: 'El teléfono ya existe', cliente: clienteExistente.id };
    } else {
        const result = await prisma.cliente.create({
            data: {
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                email: cliente.email ?? null,
                direccion: cliente.direccion ?? null,
                status: cliente.status ?? 'Prospecto',
                userId: cliente.userId ?? null,
                canalId: cliente.canalId ?? null,
            }
        });

        if (!result) {
            return { success: false, message: 'No se pudo crear el cliente' };
        }

        return { success: true, clienteId: result.id };
    }

}

// ========================================
// FUNCIONES DE ACTUALIZACIÓN AVANZADA
// ========================================

/**
 * Actualizar cliente con validación completa (versión mejorada)
 */
export async function actualizarClienteValidado(data: ActualizarCliente): Promise<{ cliente: ClienteCompleto }> {
    try {
        const validatedData = ActualizarClienteSchema.parse(data)

        // Verificar que el cliente existe
        const clienteExistente = await prisma.cliente.findUnique({
            where: { id: validatedData.id },
            include: { Canal: true }
        })

        if (!clienteExistente) {
            throw new Error(`Cliente con ID ${validatedData.id} no encontrado`)
        }

        // Validar que el canalId existe si se proporciona y es diferente al actual
        if (validatedData.canalId && validatedData.canalId !== clienteExistente.canalId) {
            const canalExiste = await prisma.canal.findUnique({
                where: { id: validatedData.canalId }
            })

            if (!canalExiste) {
                throw new Error(`El canal con ID ${validatedData.canalId} no existe`)
            }
        }

        const cliente = await prisma.cliente.update({
            where: { id: validatedData.id },
            data: {
                nombre: validatedData.nombre,
                telefono: validatedData.telefono,
                email: validatedData.email,
                direccion: validatedData.direccion,
                status: validatedData.status,
                canalId: validatedData.canalId
            },
            include: {
                Canal: {
                    select: {
                        nombre: true
                    }
                }
            }
        })

        return { cliente }
    } catch (error) {
        console.error('Error en actualizarClienteValidado:', {
            error: (error as Error).message,
            data,
            stack: (error as Error).stack
        })
        throw error
    }
}

export async function actualizarCliente(cliente: Cliente) {
    try {
        const updatedCliente = await prisma.cliente.update({
            where: {
                id: cliente.id
            },
            data: {
                nombre: cliente.nombre,
                telefono: cliente.telefono,
                email: cliente.email,
                direccion: cliente.direccion,
                status: cliente.status,
            }
        });
        return { success: true, cliente: updatedCliente };
    } catch (error) {
        return { success: false, message: 'No se pudo actualizar el cliente', error: (error as Error).message };
    }
}

// ========================================
// FUNCIONES DE CANALES
// ========================================

/**
 * Obtener canales disponibles
 */
export async function obtenerCanales() {
    const canales = await prisma.canal.findMany({
        orderBy: {
            nombre: 'asc'
        },
        select: {
            id: true,
            nombre: true
        }
    })

    return canales
}

export async function eliminarCliente(id: string) {
    return await prisma.cliente.delete({
        where: {
            id: id
        }
    });
}