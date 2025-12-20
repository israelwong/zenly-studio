'use server'

import { PAGO_STATUS, COTIZACION_STATUS, EVENTO_STATUS, AGENDA_STATUS, type PagoStatus } from '@/app/admin/_lib/constants/status'
import { EVENTO_ETAPAS } from '@/app/admin/_lib/constants/evento-etapas'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { crearFechaLocal } from '@/app/admin/_lib/utils/fechas'

// Schemas para validación
const PagoCreateSchema = z.object({
    cotizacionId: z.string().min(1, 'ID de cotización requerido'),
    clienteId: z.string().optional(), // Hacer opcional ya que podemos obtenerlo de la cotización
    monto: z.number().positive('El monto debe ser positivo'),
    metodoPago: z.enum(['tarjeta de crédito', 'tarjeta de debito', 'transferencia interbancaria', 'efectivo', 'cheque', 'oxxo']),
    concepto: z.string().optional(),
    descripcion: z.string().optional(),
    fechaPago: z.string().optional()
})

const PagoUpdateSchema = PagoCreateSchema.partial().extend({
    id: z.string().min(1, 'ID de pago requerido')
})

type PagoCreateForm = z.infer<typeof PagoCreateSchema>
type PagoUpdateForm = z.infer<typeof PagoUpdateSchema>

export async function crearPago(data: PagoCreateForm) {
    try {
        console.log('💰 Creando nuevo pago:', data)

        // Validar datos
        const validData = PagoCreateSchema.parse(data)

        // Obtener clienteId desde la cotización si no se proporciona
        let clienteId = validData.clienteId

        if (!clienteId) {
            const cotizacion = await prisma.cotizacion.findUnique({
                where: { id: validData.cotizacionId },
                include: {
                    Evento: {
                        select: { clienteId: true }
                    }
                }
            })

            if (!cotizacion?.Evento?.clienteId) {
                throw new Error('No se pudo obtener el ID del cliente desde la cotización')
            }

            clienteId = cotizacion.Evento.clienteId
        }

        // Obtener método de pago por defecto
        let metodoPagoId = null
        if (validData.metodoPago) {
            const metodoPago = await prisma.metodoPago.findFirst({
                where: { metodo_pago: validData.metodoPago }
            })
            metodoPagoId = metodoPago?.id || null
        }

        // Crear el pago
        const nuevoPago = await prisma.pago.create({
            data: {
                cotizacionId: validData.cotizacionId,
                clienteId,
                monto: validData.monto,
                metodo_pago: validData.metodoPago,
                metodoPagoId,
                concepto: validData.concepto || 'Pago registrado manualmente',
                descripcion: validData.descripcion,
                status: PAGO_STATUS.PAID,
                tipo_transaccion: 'income',
                categoria_transaccion: 'event_payment',
                createdAt: validData.fechaPago ? crearFechaLocal(validData.fechaPago) : new Date()
            },
            include: {
                MetodoPago: true,
                Cliente: true,
                Cotizacion: {
                    include: {
                        Evento: true
                    }
                }
            }
        })

        console.log('✅ Pago creado exitosamente:', nuevoPago.id)

        // Revalidar las páginas relacionadas
        revalidatePath('/admin/dashboard/seguimiento')
        revalidatePath('/admin/dashboard/eventos')
        if (nuevoPago.Cotizacion?.Evento?.id) {
            revalidatePath(`/admin/dashboard/seguimiento/${nuevoPago.Cotizacion.Evento.id}`)
            revalidatePath(`/admin/dashboard/eventos/${nuevoPago.Cotizacion.Evento.id}`)
        }

        return {
            success: true,
            data: nuevoPago,
            message: 'Pago registrado exitosamente'
        }

    } catch (error) {
        console.error('❌ Error al crear pago:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido al crear pago'
        }
    }
}

export async function actualizarPago(data: PagoUpdateForm) {
    try {
        console.log('📝 Actualizando pago:', data.id)

        // Validar datos
        const validData = PagoUpdateSchema.parse(data)
        const { id, ...updateData } = validData

        // Preparar datos de actualización
        const dataToUpdate: any = {}

        if (updateData.monto !== undefined) dataToUpdate.monto = updateData.monto
        if (updateData.metodoPago !== undefined) dataToUpdate.metodo_pago = updateData.metodoPago
        if (updateData.concepto !== undefined) dataToUpdate.concepto = updateData.concepto
        if (updateData.descripcion !== undefined) dataToUpdate.descripcion = updateData.descripcion
        if (updateData.fechaPago !== undefined) dataToUpdate.createdAt = crearFechaLocal(updateData.fechaPago)

        // Actualizar método de pago si cambió
        if (updateData.metodoPago) {
            const metodoPago = await prisma.metodoPago.findFirst({
                where: { metodo_pago: updateData.metodoPago }
            })
            dataToUpdate.metodoPagoId = metodoPago?.id || null
        }

        // Actualizar el pago
        const pagoActualizado = await prisma.pago.update({
            where: { id },
            data: dataToUpdate,
            include: {
                MetodoPago: true,
                Cliente: true,
                Cotizacion: {
                    include: {
                        Evento: true
                    }
                }
            }
        })

        console.log('✅ Pago actualizado exitosamente')

        // Revalidar las páginas relacionadas
        revalidatePath('/admin/dashboard/seguimiento')
        revalidatePath('/admin/dashboard/eventos')
        if (pagoActualizado.Cotizacion?.Evento?.id) {
            revalidatePath(`/admin/dashboard/seguimiento/${pagoActualizado.Cotizacion.Evento.id}`)
            revalidatePath(`/admin/dashboard/eventos/${pagoActualizado.Cotizacion.Evento.id}`)
        }

        return {
            success: true,
            data: pagoActualizado,
            message: 'Pago actualizado exitosamente'
        }

    } catch (error) {
        console.error('❌ Error al actualizar pago:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido al actualizar pago'
        }
    }
}

export async function eliminarPago(pagoId: string) {
    try {
        console.log('🗑️ Eliminando pago:', pagoId)

        // Obtener información del pago antes de eliminarlo
        const pagoExistente = await prisma.pago.findUnique({
            where: { id: pagoId },
            include: {
                Cotizacion: {
                    include: {
                        Evento: true
                    }
                }
            }
        })

        if (!pagoExistente) {
            return {
                success: false,
                error: 'Pago no encontrado'
            }
        }

        // Eliminar el pago
        await prisma.pago.delete({
            where: { id: pagoId }
        })

        console.log('✅ Pago eliminado exitosamente')

        // Revalidar las páginas relacionadas
        revalidatePath('/admin/dashboard/seguimiento')
        revalidatePath('/admin/dashboard/eventos')
        if (pagoExistente.Cotizacion?.Evento?.id) {
            revalidatePath(`/admin/dashboard/seguimiento/${pagoExistente.Cotizacion.Evento.id}`)
            revalidatePath(`/admin/dashboard/eventos/${pagoExistente.Cotizacion.Evento.id}`)
        }

        return {
            success: true,
            message: 'Pago eliminado exitosamente'
        }

    } catch (error) {
        console.error('❌ Error al eliminar pago:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido al eliminar pago'
        }
    }
}

export async function cambiarStatusPago(pagoId: string, nuevoStatus: PagoStatus) {
    try {
        console.log('🔄 Cambiando status del pago:', pagoId, 'a', nuevoStatus)

        // Primero obtener información del pago fuera de la transacción para preparar las operaciones
        const pagoInfo = await prisma.pago.findUnique({
            where: { id: pagoId },
            include: {
                Cotizacion: {
                    include: {
                        Evento: {
                            include: {
                                Agenda: true,
                                EventoEtapa: true
                            }
                        }
                    }
                }
            }
        })

        if (!pagoInfo) {
            throw new Error('Pago no encontrado')
        }

        const cambiosAdicionales = {
            cotizacionActualizada: false,
            eventoActualizado: false,
            eventoEtapaActualizada: false,
            agendaActualizada: false
        }

        // Preparar operaciones basadas en el estado actual
        const isAutorizacion = pagoInfo.status === PAGO_STATUS.PENDING && nuevoStatus === PAGO_STATUS.PAID
        const cotizacion = pagoInfo.Cotizacion
        const evento = cotizacion?.Evento

        // Ejecutar transacción optimizada con timeout extendido
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Actualizar solo el estado del pago
            const pagoActualizado = await tx.pago.update({
                where: { id: pagoId },
                data: { status: nuevoStatus }
            })

            // 2. Si es autorización SPEI, hacer las actualizaciones necesarias en paralelo
            if (isAutorizacion) {
                console.log('🔥 Aplicando flujo de autorización manual por pago SPEI')

                const updates = []

                // Preparar actualizaciones de cotización
                if (cotizacion && cotizacion.status === COTIZACION_STATUS.PENDIENTE) {
                    updates.push(
                        tx.cotizacion.update({
                            where: { id: cotizacion.id },
                            data: { status: COTIZACION_STATUS.APROBADA, updatedAt: new Date() }
                        })
                    )
                    cambiosAdicionales.cotizacionActualizada = true
                }

                // Preparar actualizaciones de evento
                if (evento) {
                    const eventoUpdates: any = {}

                    if (evento.status === EVENTO_STATUS.PENDIENTE) {
                        eventoUpdates.status = EVENTO_STATUS.APROBADO
                        cambiosAdicionales.eventoActualizado = true
                    }

                    if (evento.eventoEtapaId === EVENTO_ETAPAS.NUEVO) {
                        eventoUpdates.eventoEtapaId = EVENTO_ETAPAS.APROBADO
                        cambiosAdicionales.eventoEtapaActualizada = true
                    }

                    if (Object.keys(eventoUpdates).length > 0) {
                        eventoUpdates.updatedAt = new Date()
                        updates.push(
                            tx.evento.update({
                                where: { id: evento.id },
                                data: eventoUpdates
                            })
                        )
                    }

                    // Manejo de agenda
                    if (evento.Agenda && evento.Agenda.length > 0) {
                        const agenda = evento.Agenda[0]
                        if (agenda.status !== AGENDA_STATUS.CONFIRMADO) {
                            updates.push(
                                tx.agenda.update({
                                    where: { id: agenda.id },
                                    data: { status: AGENDA_STATUS.CONFIRMADO, updatedAt: new Date() }
                                })
                            )
                            cambiosAdicionales.agendaActualizada = true
                        }
                    } else {
                        // Crear nueva agenda
                        updates.push(
                            tx.agenda.create({
                                data: {
                                    eventoId: evento.id,
                                    fecha: evento.fecha_evento,
                                    concepto: `Evento autorizado por pago - Cliente`,
                                    agendaTipo: 'Evento',
                                    status: AGENDA_STATUS.CONFIRMADO,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            })
                        )
                        cambiosAdicionales.agendaActualizada = true
                    }

                    // Crear entrada en bitácora
                    const cambios = []
                    if (cambiosAdicionales.cotizacionActualizada) cambios.push('cotización aprobada')
                    if (cambiosAdicionales.eventoActualizado) cambios.push('evento aprobado')
                    if (cambiosAdicionales.eventoEtapaActualizada) cambios.push('movido a etapa APROBADO')
                    if (cambiosAdicionales.agendaActualizada) cambios.push('agenda confirmada')

                    let comentarioBitacora = `Pago SPEI autorizado por ${pagoInfo.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}. `
                    if (cambios.length > 0) {
                        comentarioBitacora += `Sistema aplicó autorización automática: ${cambios.join(', ')}.`
                    }

                    updates.push(
                        tx.eventoBitacora.create({
                            data: {
                                eventoId: evento.id,
                                comentario: comentarioBitacora,
                                importancia: '2',
                                status: 'active',
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        })
                    )
                }

                // Ejecutar todas las actualizaciones en paralelo
                if (updates.length > 0) {
                    await Promise.all(updates)
                }
            }

            return pagoActualizado
        }, {
            timeout: 10000 // Aumentar timeout a 10 segundos
        })

        console.log('✅ Status de pago actualizado exitosamente:', {
            pagoId,
            nuevoStatus,
            cambiosAdicionales
        })

        // Obtener el pago actualizado con toda la información
        const pagoCompleto = await prisma.pago.findUnique({
            where: { id: pagoId },
            include: {
                MetodoPago: true,
                Cliente: true,
                Cotizacion: {
                    include: {
                        Evento: true
                    }
                }
            }
        })

        // Revalidar las páginas relacionadas
        revalidatePath('/admin/dashboard/seguimiento')
        revalidatePath('/admin/dashboard/eventos')
        revalidatePath('/admin/dashboard/finanzas/pagos')
        if (pagoCompleto?.Cotizacion?.Evento?.id) {
            const eventoId = pagoCompleto.Cotizacion.Evento.id
            revalidatePath(`/admin/dashboard/seguimiento/${eventoId}`)
            revalidatePath(`/admin/dashboard/eventos/${eventoId}`)
        }

        // Mensaje de éxito con detalles de cambios
        let mensaje = `Status de pago cambiado a ${nuevoStatus} exitosamente`

        if (cambiosAdicionales.cotizacionActualizada || cambiosAdicionales.eventoActualizado || cambiosAdicionales.eventoEtapaActualizada || cambiosAdicionales.agendaActualizada) {
            const detalles = []
            if (cambiosAdicionales.cotizacionActualizada) detalles.push('cotización aprobada')
            if (cambiosAdicionales.eventoActualizado) detalles.push('evento aprobado')
            if (cambiosAdicionales.eventoEtapaActualizada) detalles.push('movido a etapa APROBADO')
            if (cambiosAdicionales.agendaActualizada) detalles.push('agenda confirmada')

            mensaje += `. Autorización automática aplicada: ${detalles.join(', ')}`
        }

        return {
            success: true,
            data: pagoCompleto,
            message: mensaje,
            cambiosAdicionales
        }

    } catch (error) {
        console.error('❌ Error al cambiar status del pago:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido al cambiar status'
        }
    }
}