'use server'

import { prisma } from '@/lib/prisma';
import { validarCondigoAutorizacion } from '../../configuracion/configuracion.actions'
import { obtenerEtapa1 } from '../etapa/etapa.actions'
import { EVENTO_STATUS, CLIENTE_STATUS, MANUAL_CREATION_FLOW } from '../../../constants/status'
// import { obtenerServicio } from '../../servicios/servicios.actions'
// import { obtenerConfiguracionActiva } from '../../configuracion/configuracion.actions'
// import { COTIZACION_STATUS } from '../../../constants/status'
// import { obtenerPipelineEtapas, obtenerPipelineEtapaPorPosicion } from '../../pipeline/pipeline.actions'
// import { obtenerCanales } from '../../canal/canal.actions'
import {
    BuscarClienteSchema,
    CrearClienteInlineSchema,
    ValidarFechaEventoSchema,
    CrearEventoCompletoSchema,
    type BuscarCliente,
    type CrearClienteInline,
    type ValidarFechaEvento,
    type CrearEventoCompleto,
    type DisponibilidadFecha,
    type RespuestaEventoCompleto
} from './crearEventoCompleto.schemas'

/**
 * Busca clientes por nombre o teléfono
 */
export async function buscarClientes(query: string) {
    if (!query || query.length < 2) {
        return []
    }

    const clientes = await prisma.cliente.findMany({
        where: {
            OR: [
                {
                    nombre: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                {
                    telefono: {
                        contains: query
                    }
                }
            ]
        },
        select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
            status: true,
            Canal: {
                select: {
                    nombre: true
                }
            }
        },
        take: 10,
        orderBy: {
            nombre: 'asc'
        }
    })

    return clientes
}

/**
 * Busca cliente por teléfono exacto
 */
export async function buscarClientePorTelefono(data: BuscarCliente) {
    const validatedData = BuscarClienteSchema.parse(data)

    const cliente = await prisma.cliente.findUnique({
        where: {
            telefono: validatedData.telefono
        },
        select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
            status: true,
            Canal: {
                select: {
                    nombre: true
                }
            }
        }
    })

    return cliente
}

/**
 * Crea un cliente nuevo inline
 */
export async function crearClienteInline(data: CrearClienteInline) {
    const validatedData = CrearClienteInlineSchema.parse(data)

    // Verificar si el teléfono ya existe
    const clienteExistente = await buscarClientePorTelefono({
        telefono: validatedData.telefono
    })

    if (clienteExistente) {
        return {
            success: false,
            message: 'Ya existe un cliente con este teléfono',
            clienteId: clienteExistente.id
        }
    }

    // Crear nuevo cliente
    const nuevoCliente = await prisma.cliente.create({
        data: {
            nombre: validatedData.nombre,
            telefono: validatedData.telefono,
            email: validatedData.email,
            direccion: validatedData.direccion,
            status: MANUAL_CREATION_FLOW.CLIENTE, // prospecto - usando constante
            canalId: validatedData.canalId
        }
    })

    return {
        success: true,
        clienteId: nuevoCliente.id,
        message: 'Cliente creado exitosamente'
    }
}

/**
 * Valida disponibilidad de fecha para eventos consultando desde la agenda
 */
export async function validarDisponibilidadFecha(data: ValidarFechaEvento): Promise<DisponibilidadFecha> {
    const validatedData = ValidarFechaEventoSchema.parse(data)

    const fechaSinHora = new Date(validatedData.fecha_evento.toISOString().split('T')[0])
    const siguienteDia = new Date(fechaSinHora.getTime() + 24 * 60 * 60 * 1000)

    // Buscar agenda de eventos en la misma fecha
    const agendaExistente = await prisma.agenda.findMany({
        where: {
            fecha: {
                gte: fechaSinHora,
                lt: siguienteDia
            },
            status: {
                not: 'cancelado'
            },
            Evento: {
                status: {
                    in: ['active', 'aprobado']
                }
            }
        },
        include: {
            Evento: {
                select: {
                    id: true,
                    nombre: true,
                    fecha_evento: true,
                    Cliente: {
                        select: {
                            nombre: true
                        }
                    }
                }
            }
        }
    })

    if (agendaExistente.length === 0) {
        return {
            disponible: true
        }
    }

    // Agrupar eventos únicos por eventoId para evitar duplicados
    const eventosUnicosMap = new Map()
    agendaExistente.forEach(agenda => {
        if (!eventosUnicosMap.has(agenda.Evento.id)) {
            eventosUnicosMap.set(agenda.Evento.id, {
                id: agenda.Evento.id,
                nombre: agenda.Evento.nombre || 'Sin nombre',
                cliente: agenda.Evento.Cliente?.nombre || 'Sin cliente',
                fecha_evento: agenda.Evento.fecha_evento,
                concepto: agenda.concepto || 'Sin concepto',
                hora: agenda.hora || 'Sin hora definida'
            })
        }
    })

    const eventosUnicos = Array.from(eventosUnicosMap.values())

    // Si hay conflictos pero se permite duplicada con autorización
    if (validatedData.permitirDuplicada && validatedData.codigoAutorizacion) {
        const autorizacionValida = await validarCondigoAutorizacion(validatedData.codigoAutorizacion)

        if (autorizacionValida) {
            return {
                disponible: true
            }
        }
    }

    return {
        disponible: false,
        conflictos: eventosUnicos
    }
}

/**
 * Crea un evento completo con cliente (nuevo o existente)
 */
export async function crearEventoCompleto(data: CrearEventoCompleto): Promise<RespuestaEventoCompleto> {
    const validatedData = CrearEventoCompletoSchema.parse(data)

    try {
        // 1. Determinar clienteId
        let clienteId = validatedData.clienteId

        // Si no hay clienteId pero hay datos de cliente nuevo, crear cliente
        if (!clienteId && validatedData.clienteNuevo) {
            const resultadoCliente = await crearClienteInline(validatedData.clienteNuevo)

            if (!resultadoCliente.success) {
                return {
                    success: false,
                    error: resultadoCliente.message
                }
            }

            clienteId = resultadoCliente.clienteId
        }

        if (!clienteId) {
            return {
                success: false,
                error: 'Se requiere un cliente válido'
            }
        }

        // 2. Validar disponibilidad de fecha
        const disponibilidad = await validarDisponibilidadFecha({
            fecha_evento: validatedData.fecha_evento,
            permitirDuplicada: validatedData.permitirFechaDuplicada,
            codigoAutorizacion: validatedData.codigoAutorizacion
        })

        if (!disponibilidad.disponible) {
            return {
                success: false,
                error: 'La fecha seleccionada no está disponible'
            }
        }

        // 3. Obtener etapa inicial (etapa 1)
        const etapa1 = await obtenerEtapa1()
        // console.log('Etapa 1 obtenida:', etapa1)
        const eventoEtapaId = etapa1 || null
        // console.log('eventoEtapaId asignado:', eventoEtapaId)

        // 4. Crear evento
        const nuevoEvento = await prisma.evento.create({
            data: {
                clienteId,
                eventoTipoId: validatedData.eventoTipoId,
                nombre: validatedData.nombre.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()),
                fecha_evento: validatedData.fecha_evento,
                status: MANUAL_CREATION_FLOW.EVENTO, // pendiente - usando constante de flujo manual
                eventoEtapaId,
                userId: validatedData.userId || null
            }
        })

        // 5. Crear agenda si es necesario (fecha tentativa o confirmada)
        if (validatedData.fechaTentativa || !validatedData.fechaTentativa) {
            const agendaStatus = validatedData.fechaTentativa ? 'por_confirmar' : 'pendiente'

            await prisma.agenda.create({
                data: {
                    eventoId: nuevoEvento.id,
                    fecha: validatedData.fecha_evento,
                    concepto: 'Fecha del evento',
                    status: agendaStatus,
                    agendaTipo: 'evento'
                }
            })
        }

        return {
            success: true,
            eventoId: nuevoEvento.id,
            clienteId,
            message: 'Evento creado exitosamente'
        }

    } catch (error) {
        console.error('Error creando evento completo:', error)
        return {
            success: false,
            error: 'Error interno del servidor'
        }
    }
}
