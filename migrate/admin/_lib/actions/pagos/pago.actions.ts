'use server'

import { Pago } from "../../types";
import { PAGO_STATUS } from '../../constants/status';
import { prisma } from '@/lib/prisma';
import { Agenda } from '../../types';
import { crearAgendaEvento } from "../agenda";
// import { enviarCorreoBienvenida, enviarCorreoPagoExitoso } from "../../correo.actions";

// =====================================
// OBTENER PAGOS
// =====================================

export async function obtenerPagos() {
    const pagos = await prisma.pago.findMany();
    return pagos;
}

export async function obtenerPago(id: string) {
    const pago = await prisma.pago.findUnique({
        where: {
            id: id
        }
    });
    return pago;
}

export async function obtenerPagoCompleto(pagoId: string) {
    const pago = await prisma.pago.findUnique({
        where: {
            id: pagoId
        },
        include: {
            Cotizacion: {
                include: {
                    Evento: {
                        include: {
                            Cliente: true,
                            EventoTipo: true
                        }
                    }
                }
            }
        }
    });
    return pago;
}

export async function obtenerPagosCotizacion(cotizacionId: string) {
    const pagos = await prisma.pago.findMany({
        where: {
            cotizacionId: cotizacionId
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    return pagos;
}

export async function obtenerPagoSesionStripe(stripe_session_id: string) {
    const pago = await prisma.pago.findUnique({
        where: {
            stripe_session_id
        }
    });

    // Solo buscar cliente si clienteId existe
    const cliente = pago?.clienteId ? await prisma.cliente.findUnique({
        where: {
            id: pago.clienteId
        }
    }) : null;

    return { pago, cliente };
}

// =====================================
// CREAR Y ACTUALIZAR PAGOS
// =====================================

export async function crearPago(data: Pago) {
    try {
        const pago = await prisma.pago.create({
            data: {
                cotizacionId: data.cotizacionId,
                clienteId: data.clienteId,
                condicionesComercialesId: data.condicionesComercialesId ?? null,
                condicionesComercialesMetodoPagoId: data.condicionesComercialesMetodoPagoId ?? null,
                metodoPagoId: data.metodoPagoId ?? undefined,
                metodo_pago: data.metodo_pago,
                monto: data.monto ?? 0,
                concepto: data.concepto,
                descripcion: data.descripcion ?? undefined,
                stripe_payment_id: data.stripe_payment_id ?? undefined,
                status: data.status ?? PAGO_STATUS.PENDING,
            }
        });
        return { id: pago.id, success: true, pago };
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
        return { success: false, error: (error as Error).message };
    }
}

export async function actualizarPago(data: Pago) {
    try {
        const pago = await prisma.pago.update({
            where: {
                id: data.id
            },
            data: {
                metodoPagoId: data.metodoPagoId ?? undefined,
                condicionesComercialesMetodoPagoId: data.condicionesComercialesMetodoPagoId ?? null,
                metodo_pago: data.metodo_pago,
                monto: data.monto ?? 0,
                concepto: data.concepto,
                stripe_payment_id: data.stripe_payment_id ?? undefined,
                status: data.status ?? PAGO_STATUS.PENDING,
            }
        });
        return { success: true, pago };
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
        return { success: false, error: (error as Error).message };
    }
}

export async function eliminarPago(id: string) {
    try {
        await prisma.pago.delete({
            where: {
                id: id
            }
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
        return { success: false, error: (error as Error).message };
    }
}

// =====================================
// DETALLES Y BALANCES
// =====================================

export async function obtenerDetallesPago(pagoId: string) {
    const pago = await prisma.pago.findUnique({
        where: {
            id: pagoId
        }
    });

    if (!pago) {
        // ⚠️ Cambio: No lanzar error, retornar null para manejar graciosamente
        console.log(`⚠️ Pago con ID ${pagoId} no encontrado (puede haber sido cancelado)`);
        return null;
    }

    const pagosCotizacion = pago.cotizacionId ? await prisma.pago.findMany({
        where: {
            cotizacionId: pago.cotizacionId,
            status: PAGO_STATUS.PAID
        }
    }) : [];

    // Solo buscar cliente si clienteId existe
    const cliente = pago.clienteId ? await prisma.cliente.findUnique({
        where: {
            id: pago.clienteId
        }
    }) : null;

    // Solo buscar cotización si cotizacionId no es null
    const cotizacion = pago.cotizacionId ? await prisma.cotizacion.findUnique({
        where: {
            id: pago.cotizacionId
        }
    }) : null;

    // Solo buscar evento si hay cotización y eventoId
    const evento = (cotizacion && cotizacion.eventoId) ? await prisma.evento.findUnique({
        where: {
            id: cotizacion.eventoId
        }
    }) : null;

    const detallesPago = { pago, pagosCotizacion, cotizacion, evento, cliente };
    return detallesPago;
}

export async function obtenerBalancePagosEvento(eventoId: string) {
    const evento = await prisma.evento.findUnique({
        where: {
            id: eventoId,
            status: 'aprobado'
        }
    })

    const cotizacion = await prisma.cotizacion.findFirst({
        where: {
            eventoId,
            status: 'aprobada'
        }
    });

    const pagos = await prisma.pago.findMany({
        where: {
            cotizacionId: cotizacion?.id
        }
    });

    const totalPagado = pagos.reduce((acc, pago) => {
        return acc + pago.monto;
    }, 0);

    const precio = cotizacion?.precio ?? 0;

    const balance = cotizacion && precio !== undefined ? precio - totalPagado : undefined;

    return { precio, evento, totalPagado, balance };
}

// Función duplicada con typo en el nombre original - mantener por compatibilidad
export async function ontenerDetallesPago(pagoId: string) {
    const pago = await prisma.pago.findUnique({
        where: {
            id: pagoId
        }
    });

    // Solo buscar cliente si clienteId existe
    const cliente = pago?.clienteId ? await prisma.cliente.findUnique({
        where: {
            id: pago.clienteId
        }
    }) : null;

    // Solo buscar cotización si cotizacionId existe
    const cotizacion = pago?.cotizacionId ? await prisma.cotizacion.findUnique({
        where: {
            id: pago.cotizacionId
        }
    }) : null;

    // Solo buscar evento si cotización y eventoId existen
    const evento = (cotizacion && cotizacion.eventoId) ? await prisma.evento.findUnique({
        where: {
            id: cotizacion.eventoId
        }
    }) : null;

    // Solo buscar tipo de evento si evento y eventoTipoId existen
    const tipoEvento = (evento && evento.eventoTipoId) ? await prisma.eventoTipo.findUnique({
        where: {
            id: evento.eventoTipoId
        },
        select: {
            nombre: true
        }
    }) : null;

    const eventoConTipo = {
        ...evento,
        tipoEvento
    }

    const detallesPago = {
        pago,
        cliente,
        cotizacion,
        eventoConTipo
    };
    return detallesPago;
}

// =====================================
// VALIDACIÓN Y PROCESAMIENTO STRIPE
// =====================================

export async function validarPagoStripe(pagoId: string) {
    console.log('Procesando pago:', pagoId);

    try {
        const detallesPago = await obtenerDetallesPago(pagoId);

        // ✅ Verificar si el pago existe antes de continuar
        if (!detallesPago) {
            console.log('⚠️ Pago no encontrado, probablemente fue cancelado. Saltando validación.');
            return;
        }

        const {
            pago,
            cliente,
            cotizacion,
            evento,
        } = detallesPago;

        //pago cliente nuevo
        if (pago?.status === PAGO_STATUS.PAID && evento?.eventoEtapaId == 'cm6498zw00001gu1a67s88y5h') {
            // Solo proceder si tenemos evento y cotización válidos
            if (!evento || !cotizacion) {
                console.log('Pago procesado pero sin cotización/evento asociado (posiblemente eliminado)');
                return { success: true, message: 'Pago procesado sin actualizaciones adicionales' };
            }

            try {
                await prisma.evento.update({
                    where: { id: evento.id },
                    data: { eventoEtapaId: 'cm6499aqs0002gu1ae4k1a7ls' }
                });
            } catch (error) {
                console.error('Error actualizando evento:', error);
            }

            try {
                if (cliente?.id) {
                    await prisma.cliente.update({
                        where: { id: cliente.id },
                        data: { status: 'cliente' }
                    });
                }
            } catch (error) {
                console.error('Error actualizando cliente:', error);
            }

            try {
                await prisma.cotizacion.update({
                    where: { id: cotizacion.id },
                    data: { status: 'aprobada' }
                });
            } catch (error) {
                console.error('Error actualizando cotización:', error);
            }

            try {
                const agenda = {
                    concepto: evento.nombre,
                    descripcion: '',
                    googleMapsUrl: '',
                    direccion: '',
                    fecha: evento.fecha_evento,
                    hora: '',
                    eventoId: evento.id ?? '',
                    userId: evento.userId,
                    agendaTipo: 'evento',
                }
                await crearAgendaEvento(agenda as Agenda);
            } catch (error) {
                console.error('Error creando agenda:', error);
            }

            // try {
            //     await enviarCorreoBienvenida(params);
            //     await enviarCorreoPagoExitoso(params);
            // } catch (error) {
            //     console.error('Error enviando correo de confirmación:', error);
            // }
        } else {
            //pago cliente existente
            // await enviarCorreoPagoExitoso(params);
        }
    } catch (error) {
        console.error('Error obteniendo detalles del pago:', error);
    }
}

export async function promesPagoSPEI() {
    // Implementación pendiente
}
