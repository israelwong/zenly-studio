'use server'
import { prisma } from '@/lib/prisma';
import { EventoDetalleSchema, EventoDetalle } from './eventoDetalle.schemas';

export async function getEventoDetalle(eventoId: string): Promise<EventoDetalle | null> {
    try {
        const evento = await prisma.evento.findUnique({
            where: { id: eventoId },
            include: {
                EventoTipo: { select: { id: true, nombre: true } },
                EventoEtapa: { select: { id: true, nombre: true, posicion: true } },
                Cliente: { select: { id: true, nombre: true, telefono: true, email: true } },
                Cotizacion: {
                    include: {
                        Pago: { select: { id: true, monto: true, status: true, createdAt: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                EventoBitacora: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!evento) return null;

        const cotizaciones = evento.Cotizacion.map(c => ({
            id: c.id,
            nombre: c.nombre,
            precio: c.precio,
            status: c.status,
            aprobada: c.status === 'aprobada' || c.status === 'aprobado' || c.status === 'approved',
            createdAt: c.createdAt,
            pagos: c.Pago.map(p => ({
                id: p.id,
                monto: p.monto,
                status: p.status,
                createdAt: p.createdAt
            }))
        }));

        const totalPagado = cotizaciones.reduce((acc, c) => acc + c.pagos.reduce((s, p) => s + (p.status === 'succeeded' ? p.monto : 0), 0), 0);
        const totalCotizado = cotizaciones.reduce((acc, c) => acc + (c.aprobada ? c.precio : 0), 0);
        const totalPendiente = Math.max(totalCotizado - totalPagado, 0);

        const bitacora = evento.EventoBitacora.map(b => ({
            id: b.id,
            comentario: b.comentario,
            importancia: b.importancia,
            createdAt: b.createdAt
        }));

        const dto: EventoDetalle = {
            id: evento.id,
            nombre: evento.nombre ?? 'Evento sin nombre',
            fecha_evento: evento.fecha_evento,
            status: evento.status,
            sede: evento.sede,
            direccion: evento.direccion,
            eventoTipo: evento.EventoTipo ? { id: evento.EventoTipo.id, nombre: evento.EventoTipo.nombre } : null,
            etapa: evento.EventoEtapa ? { id: evento.EventoEtapa.id, nombre: evento.EventoEtapa.nombre, posicion: evento.EventoEtapa.posicion } : null,
            cliente: {
                id: evento.Cliente.id,
                nombre: evento.Cliente.nombre,
                telefono: evento.Cliente.telefono,
                email: evento.Cliente.email
            },
            cotizaciones,
            bitacora,
            balance: {
                totalCotizado,
                totalPagado,
                totalPendiente
            }
        };

        const parsed = EventoDetalleSchema.safeParse(dto);
        if (!parsed.success) {
            console.error('Validación Zod fallo', parsed.error.flatten().fieldErrors);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error('Error al obtener detalle de evento', error);
        return null;
    }
}
