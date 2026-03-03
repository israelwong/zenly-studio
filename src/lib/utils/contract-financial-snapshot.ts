/**
 * Utilidad compartida para generar el HTML del resumen financiero al autorizar.
 * Se usa en autorizarYCrearEvento para inyectar el bloque en contract_content_snapshot
 * de forma permanente (sin depender de placeholders ni tablas de condiciones tras la firma).
 */

import type { CondicionesComercialesData } from "@/components/shared/contracts/types";
import { renderCondicionesComercialesBlock } from "@/components/shared/contracts/utils/contract-renderer";

export interface FinancialSnapshotInput {
  nombre: string;
  descripcion?: string | null;
  precio_lista: number;
  monto_cortesias: number;
  ajuste_cierre: number;
  monto_bono: number;
  total_final: number;
  /** Para plan de pagos en el bloque (anticipo mínimo / monto para reservar) */
  monto_anticipo?: number;
  tipo_anticipo?: "percentage" | "fixed_amount" | null;
  porcentaje_anticipo?: number | null;
}

/**
 * Genera el HTML del resumen financiero (desglose + total) a partir de valores de snapshot.
 * Usar al autorizar para persistir en contract_content_snapshot.
 */
export function generateFinancialSummaryHtml(
  input: FinancialSnapshotInput,
  options?: { isForPdf?: boolean }
): string {
  const tieneConcesiones =
    input.monto_cortesias > 0 ||
    input.monto_bono > 0 ||
    Math.abs(input.ajuste_cierre) >= 0.01 ||
    input.precio_lista > input.total_final;

  const data: CondicionesComercialesData = {
    nombre: input.nombre || "Condiciones comerciales",
    descripcion: input.descripcion ?? undefined,
    total_final: input.total_final,
    tiene_concesiones: tieneConcesiones,
    precio_lista: input.precio_lista,
    monto_cortesias: input.monto_cortesias,
    monto_bono: input.monto_bono,
    ajuste_cierre: input.ajuste_cierre,
    monto_anticipo: input.monto_anticipo,
    tipo_anticipo: input.tipo_anticipo ?? undefined,
    porcentaje_anticipo: input.porcentaje_anticipo ?? undefined,
  };

  return renderCondicionesComercialesBlock(data, options);
}

const PLACEHOLDERS = [
  "@condiciones_comerciales",
  "{condiciones_comerciales}",
  "@condiciones_pago",
  "{condiciones_pago}",
];

/**
 * Inyecta el HTML del resumen financiero en el contenido del contrato,
 * reemplazando placeholders. Si no hay placeholder, concatena el bloque al final.
 * Retorna el contenido listo para guardar en contract_content_snapshot.
 */
export function injectFinancialSummaryIntoContractContent(
  rawContent: string | null,
  financialHtml: string
): string {
  if (!rawContent || !rawContent.trim()) {
    return `<div class="condiciones-comerciales-snapshot">${financialHtml}</div>`;
  }

  let content = rawContent;
  let replaced = false;

  for (const placeholder of PLACEHOLDERS) {
    if (content.includes(placeholder)) {
      content = content.replaceAll(placeholder, financialHtml);
      replaced = true;
    }
  }

  if (!replaced) {
    const hasHtmlStructure = content.includes("</div>") || content.includes("</p>");
    const injectionPoint = content.lastIndexOf("</div>");
    const block = `<div class="mt-8 border-t border-zinc-700 pt-6">${financialHtml}</div>`;
    if (hasHtmlStructure && injectionPoint > 0) {
      content = content.substring(0, injectionPoint) + block + content.substring(injectionPoint);
    } else {
      content += block;
    }
  }

  return content;
}
