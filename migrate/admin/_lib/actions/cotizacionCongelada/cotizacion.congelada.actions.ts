'use server'

import { prisma } from '@/lib/prisma';
import { calcularPaquete, type ServicioCantidad } from '../pricing/calculos';
import { obtenerConfiguracionActiva } from '../configuracion/configuracion.actions';
import { obtenerServicio } from '../servicios/servicios.actions';
import { COTIZACION_STATUS } from '../../constants/status';

// Tipos para la nueva funcionalidad (sin cambiar schema)
export interface ServicioCongelado {
    servicioId: string;
    servicioCategoriaId: string;
    nombre: string;           // Usar campo existente
    precioUnitario: number;   // Usar campo existente  
    costo: number;           // Usar campo existente
    cantidad: number;
    subtotal: number;        // Usar campo existente
}

interface CotizacionCongeladaInput {
    eventoId: string;
    eventoTipoId: string;
    nombre: string;
    servicios: ServicioCongelado[];
    condicionesComercialesId?: string;
    condicionesComercialesMetodoPagoId?: string[];
}

interface CotizacionCongeladaResultado {
    cotizacion: {
        id: string;
        nombre: string;
        precio: number;
    };
    serviciosCongelados: ServicioCongelado[];
    totales: {
        totalCosto: number;
        totalGasto: number;
        totalUtilidad: number;
        precioSistema: number;
        gananciaNeta: number;
    };
}

/**
 * Congela los datos de servicios al momento de crear la cotización
 * Usa los campos existentes en CotizacionServicio sin modificar schema
 */
export async function congelarDatosServicios(serviciosIds: { servicioId: string, cantidad: number }[]): Promise<ServicioCongelado[]> {
    const configuracion = await obtenerConfiguracionActiva();
    if (!configuracion) {
        throw new Error('No se encontró configuración activa');
    }

    const serviciosCongelados: ServicioCongelado[] = [];

    for (const item of serviciosIds) {
        const servicio = await obtenerServicio(item.servicioId);
        if (!servicio) continue;

        // Congelar datos del servicio al momento actual
        const servicioCongelado: ServicioCongelado = {
            servicioId: servicio.id,
            servicioCategoriaId: servicio.servicioCategoriaId,
            nombre: servicio.nombre,                    // ✅ Usar campo existente
            precioUnitario: servicio.precio_publico,   // ✅ Usar campo existente
            costo: servicio.costo,                     // ✅ Usar campo existente
            cantidad: item.cantidad,
            subtotal: servicio.precio_publico * item.cantidad // ✅ Usar campo existente
        };

        serviciosCongelados.push(servicioCongelado);
    }

    return serviciosCongelados;
}

/**
 * Crea cotización con precios congelados usando campos existentes
 * NO modifica el schema actual
 */
export async function crearCotizacionCongelada(input: CotizacionCongeladaInput): Promise<CotizacionCongeladaResultado> {
    const configuracion = await obtenerConfiguracionActiva();
    if (!configuracion) {
        throw new Error('No se encontró configuración activa');
    }

    // Calcular totales usando la librería existente
    const serviciosCantidad: ServicioCantidad[] = input.servicios.map(s => ({
        costo: s.costo,
        gasto: 0, // Por ahora, podemos agregar después
        utilidad: 0, // Se calcula automáticamente
        precio_publico: s.precioUnitario,
        cantidad: s.cantidad,
        tipo_utilidad: 'servicio' as const
    }));

    const resultado = calcularPaquete({
        servicios: serviciosCantidad,
        configuracion,
        precioVenta: input.servicios.reduce((total, s) => total + s.subtotal, 0),
        usarSumaPreciosServicio: true
    });

    try {
        // Crear cotización con precios congelados
        const cotizacion = await prisma.cotizacion.create({
            data: {
                eventoTipoId: input.eventoTipoId,
                eventoId: input.eventoId,
                nombre: input.nombre,
                precio: resultado.precioVentaFinal,
                condicionesComercialesId: input.condicionesComercialesId,
                status: COTIZACION_STATUS.PENDIENTE,
            }
        });

        // Crear servicios con datos CONGELADOS usando campos existentes
        for (const servicio of input.servicios) {
            await prisma.cotizacionServicio.create({
                data: {
                    cotizacionId: cotizacion.id,
                    servicioId: servicio.servicioId,
                    servicioCategoriaId: servicio.servicioCategoriaId,
                    cantidad: servicio.cantidad,
                    // ✅ USAR CAMPOS EXISTENTES para congelar datos
                    nombre: servicio.nombre,                    // Campo ya existe
                    precioUnitario: servicio.precioUnitario,   // Campo ya existe  
                    costo: servicio.costo,                     // Campo ya existe
                    subtotal: servicio.subtotal,               // Campo ya existe
                    posicion: 0 // Por defecto
                }
            });
        }

        return {
            cotizacion: {
                id: cotizacion.id,
                nombre: cotizacion.nombre,
                precio: cotizacion.precio
            },
            serviciosCongelados: input.servicios,
            totales: {
                totalCosto: resultado.totales.totalCosto,
                totalGasto: resultado.totales.totalGasto,
                totalUtilidad: resultado.totales.totalUtilidadBase,
                precioSistema: resultado.precioSistemaPaquete,
                gananciaNeta: resultado.gananciaNeta
            }
        };

    } catch (error) {
        console.error('Error creando cotización congelada:', error);
        throw new Error('No se pudo crear la cotización');
    }
}

/**
 * Cargar servicios de un paquete para precarga en wishlist
 */
export async function cargarServiciosDePaquete(paqueteId: string): Promise<ServicioCongelado[]> {
    const paqueteServicios = await prisma.paqueteServicio.findMany({
        where: { paqueteId },
        include: {
            Servicio: {
                select: {
                    id: true,
                    nombre: true,
                    costo: true,
                    precio_publico: true,
                    servicioCategoriaId: true
                }
            }
        }
    });

    // Congelar datos al momento de cargar para la wishlist
    return paqueteServicios.map(ps => ({
        servicioId: ps.servicioId,
        servicioCategoriaId: ps.servicioCategoriaId,
        nombre: ps.Servicio.nombre,
        precioUnitario: ps.Servicio.precio_publico,
        costo: ps.Servicio.costo,
        cantidad: ps.cantidad,
        subtotal: ps.Servicio.precio_publico * ps.cantidad
    }));
}

/**
 * Obtener cotización con datos congelados (retrocompatible)
 */
export async function obtenerCotizacionCongelada(cotizacionId: string) {
    const cotizacion = await prisma.cotizacion.findUnique({
        where: { id: cotizacionId },
        include: {
            Servicio: {
                select: {
                    id: true,
                    servicioId: true,
                    servicioCategoriaId: true,
                    cantidad: true,
                    posicion: true,
                    // Campos congelados (ya existentes en schema)
                    nombre: true,
                    precioUnitario: true,
                    costo: true,
                    subtotal: true
                }
            },
            Evento: {
                select: {
                    id: true,
                    nombre: true,
                    fecha_evento: true
                }
            },
            EventoTipo: {
                select: {
                    nombre: true
                }
            }
        }
    });

    if (!cotizacion) return null;

    // Si los servicios tienen datos congelados, usarlos
    // Si no, calcular desde servicios actuales (retrocompatibilidad)
    const serviciosConDatos = cotizacion.Servicio.map(cs => ({
        id: cs.id,
        servicioId: cs.servicioId,
        servicioCategoriaId: cs.servicioCategoriaId,
        cantidad: cs.cantidad,
        posicion: cs.posicion,
        // Usar datos congelados si existen, sino valores por defecto
        nombre: cs.nombre || 'Servicio',
        precioUnitario: cs.precioUnitario || 0,
        costo: cs.costo || 0,
        subtotal: cs.subtotal || 0,
        // Marcar si tiene datos congelados
        tieneDataCongelada: !!(cs.nombre && cs.precioUnitario && cs.subtotal)
    }));

    return {
        ...cotizacion,
        Servicio: serviciosConDatos
    };
}
