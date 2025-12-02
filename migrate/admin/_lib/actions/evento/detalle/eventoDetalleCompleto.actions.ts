'use server'
import { prisma } from '@/lib/prisma';
import { EventoDetalleCompletoSchema, EventoDetalleCompleto } from './eventoDetalleCompleto.schemas';

export async function getEventoDetalleCompleto(eventoId: string): Promise<EventoDetalleCompleto | null> {
    try {
        // Obtener evento con todas las relaciones
        const evento = await prisma.evento.findUnique({
            where: { id: eventoId },
            include: {
                EventoTipo: { select: { id: true, nombre: true } },
                EventoEtapa: { select: { id: true, nombre: true, posicion: true } },
                User: { select: { id: true, username: true } },
                Cliente: {
                    include: {
                        Canal: { select: { id: true, nombre: true } }
                    }
                },
                Cotizacion: {
                    include: {
                        Pago: {
                            select: { id: true, monto: true, status: true, createdAt: true },
                            orderBy: { createdAt: 'desc' }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                EventoBitacora: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!evento) return null;

        // Obtener etapas disponibles
        const etapasDisponibles = await prisma.eventoEtapa.findMany({
            orderBy: { posicion: 'asc' }
        });

        // Obtener paquetes disponibles para el tipo de evento
        const paquetesDisponibles = evento.eventoTipoId ?
            await prisma.paquete.findMany({
                where: {
                    eventoTipoId: evento.eventoTipoId,
                    status: 'active'
                },
                orderBy: { nombre: 'asc' }
            }) : [];

        // Procesar cotizaciones
        const cotizaciones = evento.Cotizacion.map(c => ({
            id: c.id,
            nombre: c.nombre,
            precio: c.precio,
            status: c.status,
            aprobada: c.status === 'aprobada' || c.status === 'aprobado' || c.status === 'approved',
            paqueteId: null, // Se puede añadir relación paquete en futuro
            paquete: null,
            createdAt: c.createdAt,
            pagos: c.Pago.map(p => ({
                id: p.id,
                monto: p.monto,
                status: p.status,
                createdAt: p.createdAt
            }))
        }));

        // Calcular balance
        const totalPagado = cotizaciones.reduce((acc, c) =>
            acc + c.pagos.reduce((s, p) => s + (p.status === 'succeeded' ? p.monto : 0), 0), 0);
        const totalCotizado = cotizaciones.reduce((acc, c) => acc + (c.aprobada ? c.precio : 0), 0);
        const totalPendiente = Math.max(totalCotizado - totalPagado, 0);

        // Construir DTO
        const dto: EventoDetalleCompleto = {
            evento: {
                id: evento.id,
                nombre: evento.nombre,
                fecha_evento: evento.fecha_evento,
                sede: evento.sede,
                direccion: evento.direccion,
                status: evento.status,
                userId: evento.userId,
                eventoEtapaId: evento.eventoEtapaId,
                eventoTipoId: evento.eventoTipoId,
                eventoTipo: evento.EventoTipo ? {
                    id: evento.EventoTipo.id,
                    nombre: evento.EventoTipo.nombre
                } : null,
                etapaActual: evento.EventoEtapa ? {
                    id: evento.EventoEtapa.id,
                    nombre: evento.EventoEtapa.nombre,
                    posicion: evento.EventoEtapa.posicion
                } : null,
                usuario: evento.User ? {
                    id: evento.User.id,
                    username: evento.User.username
                } : null,
                createdAt: evento.createdAt,
                updatedAt: evento.updatedAt
            },
            cliente: {
                id: evento.Cliente.id,
                nombre: evento.Cliente.nombre,
                telefono: evento.Cliente.telefono,
                email: evento.Cliente.email,
                direccion: evento.Cliente.direccion,
                status: evento.Cliente.status,
                canalId: evento.Cliente.canalId,
                canal: evento.Cliente.Canal ? {
                    id: evento.Cliente.Canal.id,
                    nombre: evento.Cliente.Canal.nombre
                } : null,
                createdAt: evento.Cliente.createdAt,
                updatedAt: evento.Cliente.updatedAt
            },
            bitacora: evento.EventoBitacora.map(b => ({
                id: b.id,
                eventoId: b.eventoId,
                comentario: b.comentario,
                importancia: b.importancia,
                status: b.status,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            })),
            cotizaciones,
            etapasDisponibles: etapasDisponibles.map(e => ({
                id: e.id,
                nombre: e.nombre,
                posicion: e.posicion
            })),
            paquetesDisponibles: paquetesDisponibles.map(p => ({
                id: p.id,
                nombre: p.nombre,
                precio: p.precio,
                eventoTipoId: p.eventoTipoId,
                status: p.status
            })),
            balance: {
                totalCotizado,
                totalPagado,
                totalPendiente
            }
        };

        // Validar con Zod
        const parsed = EventoDetalleCompletoSchema.safeParse(dto);
        if (!parsed.success) {
            console.error('Validación EventoDetalleCompleto falló:', parsed.error.flatten().fieldErrors);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error('Error al obtener detalle completo de evento:', error);
        return null;
    }
}
