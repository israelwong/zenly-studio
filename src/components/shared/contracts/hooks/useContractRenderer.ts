"use client";

import { useMemo } from "react";
import { EventContractData } from "@/types/contracts";
import type { CotizacionRenderData, CondicionesComercialesData } from "../types";
import { renderCotizacionBlock, renderCondicionesComercialesBlock } from "../utils/contract-renderer";

interface UseContractRendererProps {
  content: string;
  eventData?: EventContractData;
  cotizacionData?: CotizacionRenderData;
  condicionesData?: CondicionesComercialesData;
  showVariables?: boolean;
}

export function useContractRenderer({
  content,
  eventData,
  cotizacionData,
  condicionesData,
  showVariables = false,
}: UseContractRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) {
      return "";
    }

    if (showVariables) {
      return content.replace(/\n/g, "<br>");
    }

    let rendered = content;

    if (rendered && !/<[^>]+>/.test(rendered)) {
      rendered = rendered.replace(/\n/g, "<br>");
    }

    if (!eventData) {
      const placeholders: Record<string, string> = {
        "@nombre_cliente": "{nombre_cliente}",
        "@email_cliente": "{email_cliente}",
        "@telefono_cliente": "{telefono_cliente}",
        "@direccion_cliente": "{direccion_cliente}",
        "@fecha_evento": "{fecha_evento}",
        "@tipo_evento": "{tipo_evento}",
        "@nombre_evento": "{nombre_evento}",
        "@total_contrato": "{total_contrato}",
        "@condiciones_pago": "{condiciones_pago}",
        "@nombre_studio": "{nombre_studio}",
        "@nombre_representante": "{nombre_representante}",
        "@telefono_studio": "{telefono_studio}",
        "@correo_studio": "{correo_studio}",
        "@direccion_studio": "{direccion_studio}",
        "@fecha_firma_cliente": "{fecha_firma_cliente}",
      };

      Object.entries(placeholders).forEach(([key, placeholder]) => {
        rendered = rendered.replaceAll(key, placeholder);
        rendered = rendered.replaceAll(
          key.replace("@", "{").replace("@", "}"),
          placeholder
        );
      });

      const blockPlaceholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">';
      if (rendered.includes("@cotizacion_autorizada")) {
        rendered = rendered.replace("@cotizacion_autorizada", blockPlaceholder + "Cotización autorizada aparecerá aquí</p></div>");
      }
      if (rendered.includes("{cotizacion_autorizada}")) {
        rendered = rendered.replace("{cotizacion_autorizada}", blockPlaceholder + "Cotización autorizada aparecerá aquí</p></div>");
      }
      if (rendered.includes("@condiciones_comerciales")) {
        rendered = rendered.replace("@condiciones_comerciales", blockPlaceholder + "Condiciones comerciales aparecerán aquí</p></div>");
      }
      if (rendered.includes("{condiciones_comerciales}")) {
        rendered = rendered.replace("{condiciones_comerciales}", blockPlaceholder + "Condiciones comerciales aparecerán aquí</p></div>");
      }

      return rendered;
    }

    const clienteVars: Record<string, string> = {
      "@nombre_cliente": eventData.nombre_cliente.toUpperCase(),
      "@email_cliente": (eventData.email_cliente || "").toUpperCase(),
      "@telefono_cliente": (eventData.telefono_cliente || "").toUpperCase(),
      "@direccion_cliente": (eventData.direccion_cliente || "").toUpperCase(),
    };

    const studioVars: Record<string, string> = {
      "@nombre_studio": eventData.nombre_studio.toUpperCase(),
      "@nombre_representante": (eventData.nombre_representante || "").toUpperCase(),
      "@telefono_studio": (eventData.telefono_studio || "").toUpperCase(),
      "@correo_studio": (eventData.correo_studio || "").toUpperCase(),
      "@direccion_studio": (eventData.direccion_studio || "").toUpperCase(),
      "@banco": (eventData.banco || "").toUpperCase(),
      "@titular": (eventData.titular || "").toUpperCase(),
      "@clabe": eventData.clabe || "",
    };

    const comercialesVars: Record<string, string> = {
      "@total_contrato": eventData.total_contrato,
    };

    const eventoVars: Record<string, string> = {
      "@fecha_evento": eventData.fecha_evento,
      "@tipo_evento": eventData.tipo_evento,
      "@nombre_evento": eventData.nombre_evento,
      "@fecha_firma_cliente": eventData.fecha_firma_cliente || "",
    };

    const variables: Record<string, string> = {
      ...clienteVars,
      ...studioVars,
      ...comercialesVars,
      ...eventoVars,
    };

    const braceVariables: Record<string, string> = {
      "{nombre_cliente}": eventData.nombre_cliente.toUpperCase(),
      "{email_cliente}": (eventData.email_cliente || "").toUpperCase(),
      "{telefono_cliente}": (eventData.telefono_cliente || "").toUpperCase(),
      "{direccion_cliente}": (eventData.direccion_cliente || "").toUpperCase(),
      "{fecha_evento}": eventData.fecha_evento,
      "{tipo_evento}": eventData.tipo_evento,
      "{nombre_evento}": eventData.nombre_evento,
      "{total_contrato}": eventData.total_contrato,
      "{nombre_studio}": eventData.nombre_studio.toUpperCase(),
      "{nombre_representante}": (eventData.nombre_representante || "").toUpperCase(),
      "{telefono_studio}": (eventData.telefono_studio || "").toUpperCase(),
      "{correo_studio}": (eventData.correo_studio || "").toUpperCase(),
      "{direccion_studio}": (eventData.direccion_studio || "").toUpperCase(),
      "{fecha_firma_cliente}": eventData.fecha_firma_cliente || "",
      "{banco}": (eventData.banco || "").toUpperCase(),
      "{titular}": (eventData.titular || "").toUpperCase(),
      "{clabe}": eventData.clabe || "",
    };

    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });
    Object.entries(braceVariables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    if (cotizacionData) {
      const cotizacionHtml = renderCotizacionBlock(cotizacionData);
      rendered = rendered.replace("@cotizacion_autorizada", cotizacionHtml);
      rendered = rendered.replace("{cotizacion_autorizada}", cotizacionHtml);
    } else {
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay cotización autorizada disponible</p></div>';
      rendered = rendered.replace("@cotizacion_autorizada", placeholder);
      rendered = rendered.replace("{cotizacion_autorizada}", placeholder);
    }

    if (condicionesData) {
      const condicionesHtml = renderCondicionesComercialesBlock(condicionesData);
      rendered = rendered.replaceAll("@condiciones_comerciales", condicionesHtml);
      rendered = rendered.replaceAll("{condiciones_comerciales}", condicionesHtml);
      if (rendered.includes("@condiciones_pago")) {
        rendered = rendered.replace("@condiciones_pago", condicionesHtml);
      }
      if (rendered.includes("{condiciones_pago}")) {
        rendered = rendered.replace("{condiciones_pago}", condicionesHtml);
      }
    } else {
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay condiciones comerciales disponibles</p></div>';
      rendered = rendered.replace("@condiciones_comerciales", placeholder);
      rendered = rendered.replace("{condiciones_comerciales}", placeholder);
    }

    if (rendered.includes("[SERVICIOS_INCLUIDOS]")) {
      let serviciosHtml: string;
      if (cotizacionData?.secciones?.length) {
        serviciosHtml = renderCotizacionBlock(cotizacionData);
      } else {
        serviciosHtml = renderServiciosBlock(eventData.servicios_incluidos);
      }
      serviciosHtml =
        '<div class="mb-6 pb-4 border-b border-zinc-800"></div>' +
        serviciosHtml +
        '<div class="mt-6 pt-4 border-t border-zinc-800"></div>';
      rendered = rendered.replace("[SERVICIOS_INCLUIDOS]", serviciosHtml);
    }

    rendered = rendered.replace(/(<br>\s*){2,}/g, "<br>");
    rendered = rendered
      .replace(/<\/h1>\s*<br>\s*<h2/g, "</h1><h2")
      .replace(/<\/h2>\s*<br>\s*<h3/g, "</h2><h3")
      .replace(/<\/h3>\s*<br>\s*<p/g, "</h3><p")
      .replace(/<\/h1>\s*<br>\s*<p/g, "</h1><p")
      .replace(/<\/h2>\s*<br>\s*<p/g, "</h2><p")
      .replace(/<\/ul>\s*<br>\s*<h/g, "</ul><h")
      .replace(/<\/ol>\s*<br>\s*<h/g, "</ol><h")
      .replace(/<\/p>\s*<br>\s*<h/g, "</p><h");

    return rendered;
  }, [content, eventData, cotizacionData, condicionesData, showVariables]);

  return { renderedContent };
}

function renderServiciosBlock(servicios: unknown): string {
  if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
    return "<p><em>No hay servicios incluidos</em></p>";
  }

  let html = '<div class="servicios-incluidos">';

  servicios.forEach((categoria: { categoria?: string; servicios?: Array<{ nombre?: string; descripcion?: string }> }) => {
    html += `
      <div class="servicio-categoria mb-5">
        <h3 class="font-semibold text-zinc-300 mb-2">${categoria.categoria ?? ""}</h3>
        <ul class="list-disc list-inside space-y-1 text-zinc-400">
    `;
    (categoria.servicios ?? []).forEach((servicio) => {
      html += `<li>${servicio.nombre ?? ""}</li>`;
      if (servicio.descripcion) {
        html += `<p class="text-sm text-zinc-500 ml-6">${servicio.descripcion}</p>`;
      }
    });
    html += `
        </ul>
      </div>
    `;
  });

  html += "</div>";
  return html;
}
