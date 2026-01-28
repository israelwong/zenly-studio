// Renderizado de bloques especiales del contrato

import { CotizacionRenderData, CondicionesComercialesData } from "../types";

/**
 * Renderiza bloque de cotización autorizada
 */
export function renderCotizacionBlock(
  cotizacion: CotizacionRenderData
): string {
  if (!cotizacion.secciones || cotizacion.secciones.length === 0) {
    return '<p class="text-zinc-500 italic">No hay cotización disponible</p>';
  }

  let html = '<div class="cotizacion-block space-y-6">';

  // Ordenar secciones por orden
  const seccionesOrdenadas = [...cotizacion.secciones].sort(
    (a, b) => a.orden - b.orden
  );

  seccionesOrdenadas.forEach((seccion) => {
    html += `<div class="seccion mb-6" style="display: block !important;">`;
    html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3" style="display: block !important; margin-bottom: 0.75rem !important;">${seccion.nombre}</h3>`;

    // Ordenar categorías por orden
    const categoriasOrdenadas = [...seccion.categorias].sort(
      (a, b) => a.orden - b.orden
    );

    categoriasOrdenadas.forEach((categoria) => {
      html += `<div class="categoria mb-4 ml-4">`;
      html += `<h4 class="text-base font-medium text-zinc-300 mb-2">${categoria.nombre}</h4>`;
      html += `<ul class="list-disc list-inside space-y-1 text-zinc-400 ml-4">`;

      categoria.items.forEach((item) => {
        html += `<li class="mb-1">`;
        html += `<span class="font-medium">${item.nombre}</span>`;
        
        // ✅ SIMPLIFICADO: Solo mostrar /hrs para horas, xCantidad para el resto (solo si > 1)
        const billingType = item.billing_type || 'SERVICE';
        
        if (billingType === 'HOUR' && item.horas && item.horas > 0) {
          // Item tipo HOUR: siempre mostrar cantidad efectiva con /hrs (incluso si es 1)
          // Ejemplo: "x8 /hrs" o "x1 /hrs"
          const cantidadEfectiva = (item as any).cantidadEfectiva ?? (item.cantidad * item.horas);
          html += ` <span class="text-zinc-500">x${cantidadEfectiva} /hrs</span>`;
        } else {
          // Para SERVICE, UNIT o cualquier otro: solo mostrar xCantidad si cantidad > 1
          // Si cantidad = 1, no mostrar nada
          if (item.cantidad > 1) {
            html += ` <span class="text-zinc-500">x${item.cantidad}</span>`;
          }
        }
        
        html += `</li>`;

        if (item.descripcion) {
          html += `<p class="text-sm text-zinc-500 ml-6 mb-2">${item.descripcion}</p>`;
        }
      });

      html += `</ul>`;
      html += `</div>`;
    });

    html += `</div>`;
  });

  html += "</div>";

  return html;
}

/**
 * Renderiza bloque de condiciones comerciales
 */
export function renderCondicionesComercialesBlock(
  condiciones: CondicionesComercialesData
): string {
  let html = '<div class="condiciones-comerciales space-y-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">';

  html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3">${condiciones.nombre}</h3>`;

  if (condiciones.descripcion) {
    html += `<p class="text-zinc-400 mb-4">${condiciones.descripcion}</p>`;
  }

  html += '<div class="detalles space-y-3">';

  // Verificar si es modo negociación
  const esNegociacion = condiciones.es_negociacion === true;

  // Verificar si hay descuento aplicado (por monto o porcentaje)
  // También verificar si hay diferencia entre total_contrato y total_final
  const tieneDescuentoPorMonto = condiciones.descuento_aplicado !== undefined && condiciones.descuento_aplicado > 0;
  const tieneDescuentoPorPorcentaje = condiciones.porcentaje_descuento !== undefined && condiciones.porcentaje_descuento > 0;
  const tieneDiferencia = condiciones.total_contrato !== undefined && 
    condiciones.total_final !== undefined && 
    condiciones.total_contrato > condiciones.total_final;
  
  const tieneDescuento = tieneDescuentoPorMonto || tieneDescuentoPorPorcentaje || tieneDiferencia;

  // Mostrar desglose siempre que tengamos total_contrato y total_final válidos
  const debeMostrarDesglose = condiciones.total_contrato !== undefined && 
    condiciones.total_final !== undefined &&
    condiciones.total_contrato > 0;
  
  if (debeMostrarDesglose) {
    html += '<div class="calculo-total space-y-2 mb-4 pt-3 border-t border-zinc-800">';
    
    if (esNegociacion) {
      // MODO NEGOCIACIÓN: Precio original → Precio negociado → Ahorro total
      // 1. Precio original
      const precioOriginalFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.precio_original ?? condiciones.total_contrato);
      html += `<div class="flex justify-between items-center">`;
      html += `<span class="text-zinc-400">Precio original:</span>`;
      html += `<span class="text-zinc-300 font-medium">${precioOriginalFormateado}</span>`;
      html += `</div>`;

      // 2. Precio negociado
      const precioNegociadoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.precio_negociado ?? condiciones.total_final);
      html += `<div class="flex justify-between items-center">`;
      html += `<span class="text-zinc-400">Precio negociado:</span>`;
      html += `<span class="text-blue-400 font-medium">${precioNegociadoFormateado}</span>`;
      html += `</div>`;

      // 3. Ahorro total (solo si hay ahorro)
      if (condiciones.ahorro_total !== undefined && condiciones.ahorro_total > 0) {
        const ahorroFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(condiciones.ahorro_total);
        html += `<div class="flex justify-between items-center text-emerald-400">`;
        html += `<span>Ahorro total:</span>`;
        html += `<span class="font-medium">${ahorroFormateado}</span>`;
        html += `</div>`;
      }
    } else {
      // MODO NORMAL: Precio → Descuento → Subtotal
      // 1. Precio base (total_contrato)
      const precioFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.total_contrato);
      html += `<div class="flex justify-between items-center">`;
      html += `<span class="text-zinc-400">Precio:</span>`;
      html += `<span class="text-zinc-300 font-medium">${precioFormateado}</span>`;
      html += `</div>`;

      // 2. Descuento (solo si aplica)
      if (tieneDescuento) {
        const descuentoAMostrar = condiciones.descuento_aplicado !== undefined && condiciones.descuento_aplicado > 0
          ? condiciones.descuento_aplicado
          : condiciones.total_contrato - condiciones.total_final;
        
        const descuentoFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(descuentoAMostrar);
        const porcentajeDescuento = condiciones.porcentaje_descuento 
          ? ` (${condiciones.porcentaje_descuento}%)`
          : '';
        html += `<div class="flex justify-between items-center text-emerald-400">`;
        html += `<span>Descuento${porcentajeDescuento}:</span>`;
        html += `<span class="font-medium">-${descuentoFormateado}</span>`;
        html += `</div>`;

        // 3. Subtotal (solo si hay descuento)
        const subtotalFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(condiciones.total_final);
        html += `<div class="flex justify-between items-center">`;
        html += `<span class="text-zinc-400">Subtotal:</span>`;
        html += `<span class="text-zinc-300 font-medium">${subtotalFormateado}</span>`;
        html += `</div>`;
      }
    }

    // 4. Anticipo (si aplica) - siempre después del subtotal/precio negociado
    // Mostrar anticipo si está definido y es mayor a 0
    if (condiciones.monto_anticipo !== undefined && condiciones.monto_anticipo > 0) {
      const montoAnticipoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.monto_anticipo);
      
      html += `<div class="flex justify-between items-center">`;
      html += `<span class="text-zinc-400">Anticipo`;
      if (condiciones.porcentaje_anticipo && condiciones.tipo_anticipo === "percentage") {
        html += ` (${condiciones.porcentaje_anticipo}%)`;
      }
      html += `:</span>`;
      html += `<span class="text-zinc-300 font-medium">${montoAnticipoFormateado}</span>`;
      html += `</div>`;
      
      // 5. Diferido (calcular basado en total_final menos anticipo)
      // En negociación: usar precio negociado (total_final)
      // En normal: usar total_final (subtotal si hay descuento, precio si no)
      const baseParaDiferido = condiciones.total_final;
      const diferido = baseParaDiferido - condiciones.monto_anticipo;
      const diferidoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(diferido);
      html += `<div class="flex justify-between items-center">`;
      html += `<span class="text-zinc-400">Diferido:</span>`;
      html += `<span class="text-zinc-300 font-medium">${diferidoFormateado}</span>`;
      html += `</div>`;
    }

    // 6. Total a pagar (total_final)
    const totalFinalFormateado = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(condiciones.total_final);
    html += `<div class="flex justify-between items-center pt-2 border-t border-zinc-800">`;
    html += `<span class="text-zinc-200 font-semibold">Total a pagar:</span>`;
    html += `<span class="text-emerald-400 font-bold text-lg">${totalFinalFormateado}</span>`;
    html += `</div>`;
    html += '</div>';
  }

  // Métodos de pago
  if (
    condiciones.condiciones_metodo_pago &&
    condiciones.condiciones_metodo_pago.length > 0
  ) {
    html += `<div class="metodos-pago mt-4 pt-3 border-t border-zinc-800">`;
    html += `<p class="font-medium text-zinc-300 mb-2">Métodos de Pago:</p>`;
    html += `<ul class="list-disc list-inside space-y-1 text-zinc-400 ml-4">`;
    condiciones.condiciones_metodo_pago.forEach((metodo) => {
      html += `<li>${metodo.metodo_pago}`;
      if (metodo.descripcion) {
        html += ` - ${metodo.descripcion}`;
      }
      html += `</li>`;
    });
    html += `</ul>`;
    html += `</div>`;
  }

  html += "</div>";
  html += "</div>";

  return html;
}

