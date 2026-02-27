/**
 * Utilidades de cálculo para paquetes
 * Pueden ser usadas tanto en cliente como en servidor
 */

import type {
    ServicioConCantidad,
    CalculoPaquete,
} from '@/lib/actions/schemas/paquete-schemas';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';

/**
 * Calcular precio de un servicio individual
 * Basado en costo + gasto + utilidad según configuración
 */
export function calcularPrecioServicio(
    servicio: ServicioConCantidad,
    porcentajeUtilidadServicio: number = 0.30,
    porcentajeUtilidadProducto: number = 0.20
): number {
    const { costo, gasto, tipo_utilidad } = servicio;
    const base = costo + gasto;

    const porcentajeUtilidad =
        tipo_utilidad === 'producto'
            ? porcentajeUtilidadProducto
            : porcentajeUtilidadServicio;

    const utilidad = base * porcentajeUtilidad;
    return base + utilidad;
}

/**
 * Calcular precio sistema del paquete
 * Suma de todos los servicios × cantidad (con soporte para cálculo dinámico por horas)
 * 
 * @param servicios - Array de servicios con cantidad
 * @param porcentajeUtilidadServicio - Porcentaje de utilidad para servicios (default: 0.30)
 * @param porcentajeUtilidadProducto - Porcentaje de utilidad para productos (default: 0.20)
 * @param durationHours - Horas totales de cobertura del servicio (opcional). Si se proporciona, los items de tipo HOUR se multiplican por esta duración
 */
export function calcularPrecioPaquete(
    servicios: ServicioConCantidad[],
    porcentajeUtilidadServicio: number = 0.30,
    porcentajeUtilidadProducto: number = 0.20,
    durationHours: number | null = null
): CalculoPaquete {
    let totalCosto = 0;
    let totalGasto = 0;
    let totalUtilidad = 0;
    let precioSistema = 0;

    servicios.forEach((servicio) => {
        // Obtener billing_type del servicio (default: SERVICE para compatibilidad)
        const billingType = (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
        
        // Calcular cantidad efectiva según billing_type
        // Si durationHours es null o 0, usar cantidad base (comportamiento legacy)
        const cantidadEfectiva = calcularCantidadEfectiva(
            billingType,
            servicio.cantidad,
            durationHours
        );

        const costoTotal = servicio.costo * cantidadEfectiva;
        const gastoTotal = servicio.gasto * cantidadEfectiva;
        const precioUnitario = calcularPrecioServicio(
            servicio,
            porcentajeUtilidadServicio,
            porcentajeUtilidadProducto
        );
        const precioTotal = precioUnitario * cantidadEfectiva;
        const utilidadTotal = precioTotal - costoTotal - gastoTotal;

        totalCosto += costoTotal;
        totalGasto += gastoTotal;
        totalUtilidad += utilidadTotal;
        precioSistema += precioTotal;
    });

    return {
        totalCosto,
        totalGasto,
        totalUtilidad,
        precioSistema,
        precioVenta: precioSistema, // Por defecto igual al sistema
        descuentoPorcentaje: 0,
        sobreprecioPorcentaje: 0,
        descuentoMonto: 0,
        sobreprecioMonto: 0,
    };
}

/**
 * Calcular descuento/sobreprecio basado en precio de venta vs precio sistema
 */
export function calcularDiferenciaPrecio(
    precioSistema: number,
    precioVenta: number
): {
    descuentoPorcentaje: number;
    sobreprecioPorcentaje: number;
    descuentoMonto: number;
    sobreprecioMonto: number;
} {
    if (precioSistema === 0) {
        return {
            descuentoPorcentaje: 0,
            sobreprecioPorcentaje: 0,
            descuentoMonto: 0,
            sobreprecioMonto: 0,
        };
    }

    const diferencia = precioVenta - precioSistema;

    if (precioVenta < precioSistema) {
        // Es un descuento
        const descuentoPorcentaje =
            (Math.abs(diferencia) / precioSistema) * 100;
        return {
            descuentoPorcentaje,
            sobreprecioPorcentaje: 0,
            descuentoMonto: Math.abs(diferencia),
            sobreprecioMonto: 0,
        };
    } else if (precioVenta > precioSistema) {
        // Es un sobreprecio
        const sobreprecioPorcentaje = (diferencia / precioSistema) * 100;
        return {
            descuentoPorcentaje: 0,
            sobreprecioPorcentaje,
            descuentoMonto: 0,
            sobreprecioMonto: diferencia,
        };
    }

    return {
        descuentoPorcentaje: 0,
        sobreprecioPorcentaje: 0,
        descuentoMonto: 0,
        sobreprecioMonto: 0,
    };
}

/**
 * Formatear precio a moneda MXN
 */
export function formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(precio);
}

