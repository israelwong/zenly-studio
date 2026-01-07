/**
 * FUNCIÓN ÚNICA DE CÁLCULO DE PRECIOS - ZENLY STUDIO
 * 
 * Esta es la ÚNICA función encargada de calcular precios en todo el sistema.
 * No debe haber otras funciones de cálculo de precios.
 */

export interface ConfiguracionPrecios {
    utilidad_servicio: number;    // 0.30 = 30%
    utilidad_producto: number;   // 0.40 = 40%
    comision_venta: number;       // 0.10 = 10%
    sobreprecio: number;          // 0.05 = 5%
}

export interface ResultadoPrecio {
    // Precios finales
    precio_final: number;         // Precio que ve el cliente
    precio_base: number;          // Precio sin sobreprecio

    // Componentes base
    costo: number;                // Costo base
    gasto: number;                // Total de gastos
    utilidad_base: number;        // Utilidad calculada

    // Desglose de precios
    subtotal: number;             // Costo + gasto + utilidad
    monto_comision: number;       // Monto de comisión
    monto_sobreprecio: number;    // Monto de sobreprecio

    // Porcentajes (para mostrar)
    porcentaje_utilidad: number;  // % de utilidad
    porcentaje_comision: number;  // % de comisión
    porcentaje_sobreprecio: number; // % de sobreprecio

    // Verificación de utilidad real
    utilidad_real: number;        // Utilidad después de comisión
    porcentaje_utilidad_real: number; // % de utilidad real
}

/**
 * CALCULA EL PRECIO FINAL DEL SISTEMA
 * 
 * Esta es la ÚNICA función de cálculo de precios en todo el sistema.
 * 
 * @param costo - Costo base del servicio/producto
 * @param gasto - Suma de gastos asociados
 * @param tipo_utilidad - 'servicio' o 'producto'
 * @param config - Configuración de precios del estudio
 * @returns ResultadoPrecio con todos los cálculos
 */
export function calcularPrecio(
    costo: number,
    gasto: number,
    tipo_utilidad: 'servicio' | 'producto',
    config: ConfiguracionPrecios
): ResultadoPrecio {

    // 1. Validar parámetros
    if (costo < 0 || gasto < 0) {
        throw new Error('Costo y gasto deben ser valores positivos');
    }

    // 2. Normalizar valores de configuración (pueden venir como porcentajes o decimales)
    const normalizarPorcentaje = (valor: number): number => {
        return valor > 1 ? valor / 100 : valor;
    };

    const utilidad_servicio_normalizada = normalizarPorcentaje(config.utilidad_servicio);
    const utilidad_producto_normalizada = normalizarPorcentaje(config.utilidad_producto);
    const comision_venta_normalizada = normalizarPorcentaje(config.comision_venta);
    const sobreprecio_normalizado = normalizarPorcentaje(config.sobreprecio);

    // 3. Determinar porcentaje de utilidad según tipo
    // Normalizar tipo_utilidad para manejar tanto "servicio"/"service" como "producto"/"product"
    const normalizarTipoUtilidad = (tipo: string): 'servicio' | 'producto' => {
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('servicio') || tipoLower.includes('service')) {
            return 'servicio';
        }
        return 'producto';
    };

    const tipo_normalizado = normalizarTipoUtilidad(tipo_utilidad);

    const utilidad_porcentaje = tipo_normalizado === 'servicio'
        ? utilidad_servicio_normalizada
        : utilidad_producto_normalizada;

    // 3. Calcular subtotal de costos (costo base + gastos)
    const subtotal_costos = costo + gasto;

    // 4. Calcular utilidad base sobre el subtotal de costos (en pesos)
    const utilidad_base = subtotal_costos * utilidad_porcentaje;

    // 5. Calcular subtotal (subtotal de costos + utilidad)
    const subtotal = subtotal_costos + utilidad_base;

    // 6. Calcular precio base que cubre utilidad + comisión
    const denominador = 1 - comision_venta_normalizada;

    // Validar que la comisión no sea 100% o mayor
    if (denominador <= 0) {
        // Si comisión es 100% o mayor, retornar solo subtotal
        return {
            // Precios finales
            precio_final: Number(subtotal.toFixed(2)),
            precio_base: Number(subtotal.toFixed(2)),

            // Componentes base
            costo: Number(costo.toFixed(2)),
            gasto: Number(gasto.toFixed(2)),
            utilidad_base: Number(utilidad_base.toFixed(2)),

            // Desglose de precios
            subtotal: Number(subtotal.toFixed(2)),
            monto_comision: 0,
            monto_sobreprecio: 0,

            // Porcentajes (para mostrar)
            porcentaje_utilidad: Number((utilidad_porcentaje * 100).toFixed(1)),
            porcentaje_comision: Number((comision_venta_normalizada * 100).toFixed(1)),
            porcentaje_sobreprecio: Number((sobreprecio_normalizado * 100).toFixed(1)),

            // Verificación de utilidad real
            utilidad_real: Number(utilidad_base.toFixed(2)),
            porcentaje_utilidad_real: Number((utilidad_porcentaje * 100).toFixed(1)),
        };
    }

    const precio_base = subtotal / denominador;

    // 7. Aplicar sobreprecio como margen de descuento
    const precio_final = precio_base * (1 + sobreprecio_normalizado);

    // 8. Calcular montos para el desglose
    const monto_comision = precio_base * comision_venta_normalizada;
    const monto_sobreprecio = precio_base * sobreprecio_normalizado;

    // 9. Calcular utilidad real después de comisión
    const utilidad_real = precio_base - monto_comision - subtotal_costos;
    const porcentaje_utilidad_real = subtotal_costos > 0 ? (utilidad_real / subtotal_costos) * 100 : 0;

    return {
        // Precios finales
        precio_final: Number(precio_final.toFixed(2)),
        precio_base: Number(precio_base.toFixed(2)),

        // Componentes base
        costo: Number(costo.toFixed(2)),
        gasto: Number(gasto.toFixed(2)),
        utilidad_base: Number(utilidad_base.toFixed(2)),

        // Desglose de precios
        subtotal: Number(subtotal.toFixed(2)),
        monto_comision: Number(monto_comision.toFixed(2)),
        monto_sobreprecio: Number(monto_sobreprecio.toFixed(2)),

        // Porcentajes (para mostrar)
        porcentaje_utilidad: Number((utilidad_porcentaje * 100).toFixed(1)),
        porcentaje_comision: Number((comision_venta_normalizada * 100).toFixed(1)),
        porcentaje_sobreprecio: Number((sobreprecio_normalizado * 100).toFixed(1)),

        // Verificación de utilidad real
        utilidad_real: Number(utilidad_real.toFixed(2)),
        porcentaje_utilidad_real: Number(porcentaje_utilidad_real.toFixed(1)),
    };
}

/**
 * Formatea un número como moneda mexicana
 */
export function formatearMoneda(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
