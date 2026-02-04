// Renderizado de bloques especiales del contrato

import { CotizacionRenderData, CondicionesComercialesData } from "../types";
import { formatItemQuantity } from "@/lib/utils/contract-item-formatter";

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
        
        // ✅ UNIFICADO: Usar formatItemQuantity para renderizado consistente
        const billingType = item.billing_type || 'SERVICE';
        const quantity = item.cantidad || 1;
        const cantidadEfectiva = (item as any).cantidadEfectiva;
        const eventDurationHours = item.horas || null;
        
        const formatted = formatItemQuantity({
          quantity,
          billingType,
          eventDurationHours,
          cantidadEfectiva,
        });
        
        // Agregar texto formateado si existe
        if (formatted.displayText) {
          html += ` <span class="text-zinc-500">${formatted.displayText}</span>`;
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
    // ⚠️ TABLA PROFESIONAL: Usar <table> con estilos inline para compatibilidad con PDF
    html += `
      <div class="calculo-total mb-4 pt-3">
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid rgba(63, 63, 70, 0.5); border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: linear-gradient(to bottom, rgba(39, 39, 42, 0.8), rgba(39, 39, 42, 0.5)); border-bottom: 2px solid rgba(63, 63, 70, 1);">
              <th style="text-align: left; padding: 12px 16px; color: rgba(228, 228, 231, 1); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                Concepto
              </th>
              <th style="text-align: right; padding: 12px 16px; color: rgba(228, 228, 231, 1); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                Monto
              </th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (esNegociacion) {
      // MODO NEGOCIACIÓN: Precio original → Precio negociado → Ahorro total
      const precioOriginalFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.precio_original ?? condiciones.total_contrato);
      
      html += `
        <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
          <td style="padding: 12px 16px; color: rgba(161, 161, 170, 1); font-size: 14px;">
            Precio original
          </td>
          <td style="padding: 12px 16px; text-align: right; color: rgba(212, 212, 216, 1); font-weight: 500; font-size: 14px;">
            ${precioOriginalFormateado}
          </td>
        </tr>
      `;

      const precioNegociadoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.precio_negociado ?? condiciones.total_final);
      
      html += `
        <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
          <td style="padding: 12px 16px; color: rgba(161, 161, 170, 1); font-size: 14px;">
            Precio negociado
          </td>
          <td style="padding: 12px 16px; text-align: right; color: rgba(96, 165, 250, 1); font-weight: 500; font-size: 14px;">
            ${precioNegociadoFormateado}
          </td>
        </tr>
      `;

      if (condiciones.ahorro_total !== undefined && condiciones.ahorro_total > 0) {
        const ahorroFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(condiciones.ahorro_total);
        
        html += `
          <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
            <td style="padding: 12px 16px; color: rgba(52, 211, 153, 1); font-size: 14px; font-weight: 500;">
              Ahorro total
            </td>
            <td style="padding: 12px 16px; text-align: right; color: rgba(52, 211, 153, 1); font-weight: 600; font-size: 14px;">
              ${ahorroFormateado}
            </td>
          </tr>
        `;
      }
    } else {
      // MODO NORMAL: Precio → Descuento → Subtotal
      const precioFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.total_contrato);
      
      html += `
        <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
          <td style="padding: 12px 16px; color: rgba(161, 161, 170, 1); font-size: 14px;">
            Precio
          </td>
          <td style="padding: 12px 16px; text-align: right; color: rgba(212, 212, 216, 1); font-weight: 500; font-size: 14px;">
            ${precioFormateado}
          </td>
        </tr>
      `;

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
        
        html += `
          <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
            <td style="padding: 12px 16px; color: rgba(52, 211, 153, 1); font-size: 14px; font-weight: 500;">
              Descuento${porcentajeDescuento}
            </td>
            <td style="padding: 12px 16px; text-align: right; color: rgba(52, 211, 153, 1); font-weight: 600; font-size: 14px;">
              -${descuentoFormateado}
            </td>
          </tr>
        `;

        const subtotalFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(condiciones.total_final);
        
        html += `
          <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
            <td style="padding: 12px 16px; color: rgba(161, 161, 170, 1); font-size: 14px;">
              Subtotal
            </td>
            <td style="padding: 12px 16px; text-align: right; color: rgba(212, 212, 216, 1); font-weight: 500; font-size: 14px;">
              ${subtotalFormateado}
            </td>
          </tr>
        `;
      }
    }

    // 4. Anticipo/Pago (si aplica)
    if (condiciones.monto_anticipo !== undefined && condiciones.monto_anticipo > 0) {
      const isFullPayment = condiciones.porcentaje_anticipo === 100;
      
      const montoAnticipoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.monto_anticipo);
      
      let anticipoLabel = isFullPayment 
        ? 'Monto para reservar'
        : 'Anticipo mínimo';
      
      if (!isFullPayment && condiciones.porcentaje_anticipo && condiciones.tipo_anticipo === "percentage") {
        anticipoLabel += ` (${condiciones.porcentaje_anticipo}%)`;
      }
      
      html += `
        <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3); background-color: rgba(52, 211, 153, 0.05);">
          <td style="padding: 12px 16px; color: rgba(161, 161, 170, 1); font-size: 14px; font-weight: 500;">
            ${anticipoLabel}
          </td>
          <td style="padding: 12px 16px; text-align: right; color: rgba(52, 211, 153, 1); font-weight: 600; font-size: 15px;">
            ${montoAnticipoFormateado}
          </td>
        </tr>
      `;
      
      // 5. Diferido - Solo si NO es pago completo
      if (!isFullPayment) {
        const baseParaDiferido = condiciones.total_final;
        const diferido = baseParaDiferido - condiciones.monto_anticipo;
        
        if (diferido > 0) {
          const diferidoFormateado = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(diferido);
          
          html += `
            <tr style="border-bottom: 1px solid rgba(63, 63, 70, 0.3);">
              <td style="padding: 12px 16px; color: rgba(161, 161, 170, 1); font-size: 14px;">
                Saldo pendiente
              </td>
              <td style="padding: 12px 16px; text-align: right; color: rgba(212, 212, 216, 1); font-weight: 500; font-size: 14px;">
                ${diferidoFormateado}
              </td>
            </tr>
          `;
        }
      }
    }

    // 6. Total a pagar (total_final) - Row destacado
    const totalFinalFormateado = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(condiciones.total_final);
    
    html += `
          <tr style="border-top: 2px solid rgba(63, 63, 70, 1); background-color: rgba(39, 39, 42, 0.6);">
            <td style="padding: 14px 16px; color: rgba(228, 228, 231, 1); font-weight: 700; font-size: 15px;">
              TOTAL A PAGAR
            </td>
            <td style="padding: 14px 16px; text-align: right; color: rgba(52, 211, 153, 1); font-weight: 700; font-size: 18px;">
              ${totalFinalFormateado}
            </td>
          </tr>
        </tbody>
      </table>
    `;
    
    // Mensaje de flexibilidad - Solo si NO es pago completo y hay anticipo
    if (condiciones.monto_anticipo !== undefined && condiciones.monto_anticipo > 0) {
      const isFullPayment = condiciones.porcentaje_anticipo === 100;
      
      if (!isFullPayment) {
        html += `
          <div style="margin-top: 16px; padding: 12px; background-color: rgba(59, 130, 246, 0.1); border-left: 3px solid rgba(59, 130, 246, 0.5); border-radius: 4px;">
            <p style="font-size: 12px; color: rgba(161, 161, 170, 1); line-height: 1.6;">
              💡 <span style="font-weight: 600;">Flexibilidad de pago:</span> Este es el monto mínimo para formalizar tu fecha. 
              Si prefieres abonar una cantidad mayor, puedes hacerlo y se acreditará a tu saldo pendiente.
            </p>
          </div>
        `;
      } else {
        html += `
          <div style="margin-top: 16px; padding: 12px; background-color: rgba(59, 130, 246, 0.1); border-left: 3px solid rgba(59, 130, 246, 0.5); border-radius: 4px;">
            <p style="font-size: 12px; color: rgba(161, 161, 170, 1); line-height: 1.6;">
              Este contrato requiere liquidación total para confirmar tu reserva.
            </p>
          </div>
        `;
      }
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

