// Renderizado de bloques especiales del contrato

import type { CotizacionRenderData, CondicionesComercialesData } from "../types";
import { formatItemQuantity } from "@/lib/utils/contract-item-formatter";

export interface ContractRendererOptions {
  /** true = estilos negro/zinc para PDF; false = emerald para pantalla */
  isForPdf?: boolean;
}

// Estilos inline para que la tabla se vea siempre (Tailwind no incluye clases dinámicas).
// Pantalla = emerald; PDF = zinc/negro.
function getContractTableTheme(isForPdf: boolean) {
  if (isForPdf) {
    return {
      border: "rgb(212, 212, 216)",
      textHeader: "rgb(0, 0, 0)",
      textPrimary: "rgb(39, 39, 42)",
      textAccent: "rgb(0, 0, 0)",
      bgHeader: "rgb(244, 244, 245)",
      bgRowHighlight: "rgb(244, 244, 245)",
      bgTotal: "rgb(228, 228, 231)",
      bgNoteBox: "rgb(244, 244, 245)",
      borderNoteBox: "rgb(212, 212, 216)",
    };
  }
  return {
    border: "rgba(167, 243, 208, 0.5)",
    textHeader: "rgb(52, 211, 153)",
    textPrimary: "rgb(161, 161, 170)",
    textAccent: "rgb(52, 211, 153)",
    bgHeader: "rgba(6, 78, 59, 0.5)",
    bgRowHighlight: "rgba(6, 78, 59, 0.35)",
    bgTotal: "rgba(6, 78, 59, 0.6)",
    bgNoteBox: "rgba(250, 204, 21, 0.12)",
    borderNoteBox: "rgba(250, 204, 21, 0.4)",
  };
}

/**
 * Renderiza bloque de cotización autorizada
 */
export function renderCotizacionBlock(
  cotizacion: CotizacionRenderData,
  options?: ContractRendererOptions
): string {
  void options; // reservado para tema futuro si se añaden acentos
  if (!cotizacion.secciones || cotizacion.secciones.length === 0) {
    return '<p class="text-zinc-500 italic">No hay cotización disponible</p>';
  }

  let html = '<div class="cotizacion-block space-y-6">';

  const seccionesOrdenadas = [...cotizacion.secciones].sort(
    (a, b) => a.orden - b.orden
  );

  seccionesOrdenadas.forEach((seccion) => {
    html += `<div class="seccion mb-6" style="display: block !important;">`;
    html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3" style="display: block !important; margin-bottom: 0.75rem !important;">${seccion.nombre}</h3>`;

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

        const billingType = item.billing_type || "SERVICE";
        const quantity = item.cantidad || 1;
        const cantidadEfectiva = item.cantidadEfectiva;
        const eventDurationHours = item.horas ?? null;

        const formatted = formatItemQuantity({
          quantity,
          billingType,
          eventDurationHours,
          cantidadEfectiva,
        });

        if (formatted.displayText) {
          html += ` <span class="text-zinc-500">${formatted.displayText}</span>`;
        }
        if (item.is_courtesy) {
          html += ` <span class="text-zinc-500 italic">— $0.00 MXN (Cortesía / Beneficio)</span>`;
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
  condiciones: CondicionesComercialesData,
  options?: ContractRendererOptions
): string {
  const isForPdf = options?.isForPdf === true;
  const t = getContractTableTheme(isForPdf);

  let html = '<div class="condiciones-comerciales space-y-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">';

  html += `<h3 class="text-lg font-semibold text-zinc-200 mb-3">${condiciones.nombre}</h3>`;

  if (condiciones.descripcion) {
    html += `<p class="text-zinc-400 mb-4">${condiciones.descripcion}</p>`;
  }

  html += '<div class="detalles space-y-3">';

  const esNegociacion = condiciones.es_negociacion === true;

  const tieneDescuentoPorMonto = condiciones.descuento_aplicado !== undefined && condiciones.descuento_aplicado > 0;
  const tieneDescuentoPorPorcentaje = condiciones.porcentaje_descuento !== undefined && condiciones.porcentaje_descuento > 0;
  const tieneDiferencia = condiciones.total_contrato !== undefined &&
    condiciones.total_final !== undefined &&
    condiciones.total_contrato > condiciones.total_final;

  const tieneDescuento = tieneDescuentoPorMonto || tieneDescuentoPorPorcentaje || tieneDiferencia;

  const tieneConcesiones = condiciones.tiene_concesiones === true;
  const debeMostrarTabla = condiciones.total_final !== undefined;

  if (debeMostrarTabla) {
    html += `
      <div class="calculo-total mb-4 pt-3">
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid ${t.border}; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: ${t.bgHeader}; border-bottom: 2px solid ${t.border};">
              <th style="text-align: left; padding: 12px 16px; color: ${t.textHeader}; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Concepto</th>
              <th style="text-align: right; padding: 12px 16px; color: ${t.textHeader}; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Monto</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (tieneConcesiones && condiciones.precio_lista !== undefined && condiciones.precio_lista > 0) {
      const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
      html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Precio de lista</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textPrimary}; font-weight: 500; font-size: 14px;">${fmt(condiciones.precio_lista)}</td>
        </tr>`;
      if ((condiciones.monto_cortesias ?? 0) > 0) {
        html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Cortesías</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textAccent}; font-weight: 600; font-size: 14px;">-${fmt(condiciones.monto_cortesias!)}</td>
        </tr>`;
      }
      if ((condiciones.monto_bono ?? 0) > 0) {
        html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Bono especial</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textAccent}; font-weight: 600; font-size: 14px;">-${fmt(condiciones.monto_bono!)}</td>
        </tr>`;
      }
      const ajuste = condiciones.ajuste_cierre ?? 0;
      if (Math.abs(ajuste) >= 0.01) {
        const label = ajuste < 0 ? "Descuento adicional / Ajuste por cierre" : "Ajuste por cierre";
        const valor = ajuste < 0 ? `-${fmt(Math.abs(ajuste))}` : `+${fmt(ajuste)}`;
        html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">${label}</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textPrimary}; font-weight: 500; font-size: 14px;">${valor}</td>
        </tr>`;
      }
    } else if (!tieneConcesiones && esNegociacion) {
      const precioOriginalFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.precio_original ?? condiciones.total_contrato);

      html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Precio original</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textPrimary}; font-weight: 500; font-size: 14px;">${precioOriginalFormateado}</td>
        </tr>
      `;

      const precioNegociadoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.precio_negociado ?? condiciones.total_final);

      html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Precio especial</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textAccent}; font-weight: 600; font-size: 14px;">${precioNegociadoFormateado}</td>
        </tr>
      `;

      if (condiciones.ahorro_total !== undefined && condiciones.ahorro_total > 0) {
        const ahorroFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(condiciones.ahorro_total);

        html += `
          <tr style="border-bottom: 1px solid ${t.border};">
            <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px; font-weight: 500;">Ahorro total</td>
            <td style="padding: 12px 16px; text-align: right; color: ${t.textAccent}; font-weight: 600; font-size: 14px;">${ahorroFormateado}</td>
          </tr>
        `;
      }
    } else if (!tieneConcesiones) {
      const precioFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.total_contrato ?? 0);

      html += `
        <tr style="border-bottom: 1px solid ${t.border};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Precio</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textPrimary}; font-weight: 500; font-size: 14px;">${precioFormateado}</td>
        </tr>
      `;

      if (tieneDescuento) {
        const descuentoAMostrar = condiciones.descuento_aplicado !== undefined && condiciones.descuento_aplicado > 0
          ? condiciones.descuento_aplicado
          : (condiciones.total_contrato ?? 0) - (condiciones.total_final ?? 0);

        const descuentoFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(descuentoAMostrar);
        const porcentajeDescuento = condiciones.porcentaje_descuento
          ? ` (${condiciones.porcentaje_descuento}%)`
          : "";

        html += `
          <tr style="border-bottom: 1px solid ${t.border};">
            <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px; font-weight: 500;">Descuento${porcentajeDescuento}</td>
            <td style="padding: 12px 16px; text-align: right; color: ${t.textAccent}; font-weight: 600; font-size: 14px;">-${descuentoFormateado}</td>
          </tr>
        `;

        const subtotalFormateado = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(condiciones.total_final);

        html += `
          <tr style="border-bottom: 1px solid ${t.border};">
            <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Subtotal</td>
            <td style="padding: 12px 16px; text-align: right; color: ${t.textPrimary}; font-weight: 500; font-size: 14px;">${subtotalFormateado}</td>
          </tr>
        `;
      }
    }

    if (condiciones.monto_anticipo !== undefined && condiciones.monto_anticipo > 0) {
      const isFullPayment = condiciones.porcentaje_anticipo === 100;

      const montoAnticipoFormateado = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(condiciones.monto_anticipo);

      let anticipoLabel = isFullPayment
        ? "Monto para reservar"
        : "Anticipo mínimo";

      if (!isFullPayment && condiciones.porcentaje_anticipo && condiciones.tipo_anticipo === "percentage") {
        anticipoLabel += ` (${condiciones.porcentaje_anticipo}%)`;
      }

      html += `
        <tr style="border-bottom: 1px solid ${t.border}; background: ${t.bgRowHighlight};">
          <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px; font-weight: 500;">${anticipoLabel}</td>
          <td style="padding: 12px 16px; text-align: right; color: ${t.textAccent}; font-weight: 600; font-size: 15px;">${montoAnticipoFormateado}</td>
        </tr>
      `;

      if (!isFullPayment) {
        const baseParaDiferido = condiciones.total_final ?? 0;
        const diferido = baseParaDiferido - condiciones.monto_anticipo;

        if (diferido > 0) {
          const diferidoFormateado = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(diferido);

          html += `
            <tr style="border-bottom: 1px solid ${t.border};">
              <td style="padding: 12px 16px; color: ${t.textPrimary}; font-size: 14px;">Saldo pendiente</td>
              <td style="padding: 12px 16px; text-align: right; color: ${t.textPrimary}; font-weight: 500; font-size: 14px;">${diferidoFormateado}</td>
            </tr>
          `;
        }
      }
    }

    const totalFinalFormateado = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(condiciones.total_final);

    html += `
          <tr style="border-top: 2px solid ${t.border}; background: ${t.bgTotal};">
            <td style="padding: 14px 16px; color: ${t.textAccent}; font-weight: 700; font-size: 15px;">TOTAL A PAGAR</td>
            <td style="padding: 14px 16px; text-align: right; color: ${t.textAccent}; font-weight: 700; font-size: 18px;">${totalFinalFormateado}</td>
          </tr>
        </tbody>
      </table>
    `;

    if (condiciones.monto_anticipo !== undefined && condiciones.monto_anticipo > 0) {
      const isFullPayment = condiciones.porcentaje_anticipo === 100;

      if (!isFullPayment) {
        html += `
          <div class="contract-note-anticipo" style="margin-top: 16px; padding: 12px; background: ${t.bgNoteBox}; border-left: 4px solid ${t.borderNoteBox}; border-radius: 4px;">
            <p style="font-size: 12px; color: ${t.textPrimary}; line-height: 1.6;">
              💡 <span style="font-weight: 600;">Flexibilidad de pago:</span> Este es el monto mínimo para formalizar tu fecha.
              Si prefieres abonar una cantidad mayor, puedes hacerlo y se acreditará a tu saldo pendiente.
            </p>
          </div>
        `;
      } else {
        html += `
          <div class="contract-note-anticipo" style="margin-top: 16px; padding: 12px; background: ${t.bgNoteBox}; border-left: 4px solid ${t.borderNoteBox}; border-radius: 4px;">
            <p style="font-size: 12px; color: ${t.textPrimary}; line-height: 1.6;">Este contrato requiere liquidación total para confirmar tu reserva.</p>
          </div>
        `;
      }
    }

    html += "</div>";
  }

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
