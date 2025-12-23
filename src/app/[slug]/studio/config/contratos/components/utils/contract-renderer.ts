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
    html += `<div class="seccion mb-6">`;
    html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3">${seccion.nombre}</h3>`;

    // Ordenar categorías por orden
    const categoriasOrdenadas = [...seccion.categorias].sort(
      (a, b) => a.orden - b.orden
    );

    categoriasOrdenadas.forEach((categoria) => {
      html += `<div class="categoria mb-4 ml-4">`;
      html += `<h4 class="text-base font-medium text-zinc-300 mb-2">${categoria.nombre}</h4>`;
      html += `<ul class="list-disc list-inside space-y-1 text-zinc-400 ml-4">`;

      categoria.items.forEach((item) => {
        const subtotalFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(item.subtotal);

        html += `<li class="mb-1">`;
        html += `<span class="font-medium">${item.nombre}</span>`;
        if (item.cantidad > 1) {
          html += ` <span class="text-zinc-500">(x${item.cantidad})</span>`;
        }
        html += ` <span class="text-emerald-400">${subtotalFormateado}</span>`;
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

  // Total
  const totalFormateado = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cotizacion.total);

  html += `<div class="total mt-6 pt-4 border-t border-zinc-800">`;
  html += `<p class="text-lg font-semibold text-zinc-200">`;
  html += `Total: <span class="text-emerald-400">${totalFormateado}</span>`;
  html += `</p>`;
  html += `</div>`;

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

  // Mostrar cálculo completo si hay totales
  if (condiciones.total_contrato !== undefined && condiciones.total_final !== undefined) {
    html += '<div class="calculo-total space-y-2 mb-4 pt-3 border-t border-zinc-800">';
    
    // Total del contrato
    const totalContratoFormateado = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(condiciones.total_contrato);
    html += `<div class="flex justify-between items-center">`;
    html += `<span class="text-zinc-400">Total del contrato:</span>`;
    html += `<span class="text-zinc-300 font-medium">${totalContratoFormateado}</span>`;
    html += `</div>`;

    // Descuento aplicado
    if (condiciones.descuento_aplicado !== undefined && condiciones.descuento_aplicado > 0) {
      const descuentoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.descuento_aplicado);
      const porcentajeDescuento = condiciones.porcentaje_descuento 
        ? ` (${condiciones.porcentaje_descuento}%)`
        : '';
      html += `<div class="flex justify-between items-center text-emerald-400">`;
      html += `<span>Descuento${porcentajeDescuento}:</span>`;
      html += `<span class="font-medium">-${descuentoFormateado}</span>`;
      html += `</div>`;
    }

    // Total final
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

  // Anticipo
  if (condiciones.monto_anticipo !== undefined && condiciones.monto_anticipo > 0) {
    const montoAnticipoFormateado = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(condiciones.monto_anticipo);
    
    html += '<div class="anticipo pt-3 border-t border-zinc-800">';
    html += `<div class="flex justify-between items-center mb-2">`;
    html += `<span class="text-zinc-300 font-medium">Anticipo`;
    if (condiciones.porcentaje_anticipo && condiciones.tipo_anticipo === "percentage") {
      html += ` (${condiciones.porcentaje_anticipo}%)`;
    }
    html += `:</span>`;
    html += `<span class="text-emerald-400 font-semibold">${montoAnticipoFormateado}</span>`;
    html += `</div>`;
    
    // Restante a pagar
    if (condiciones.total_final !== undefined) {
      const restante = condiciones.total_final - condiciones.monto_anticipo;
      const restanteFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(restante);
      html += `<div class="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800/50">`;
      html += `<span class="text-zinc-400">Restante a pagar:</span>`;
      html += `<span class="text-zinc-300 font-medium">${restanteFormateado}</span>`;
      html += `</div>`;
    }
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

