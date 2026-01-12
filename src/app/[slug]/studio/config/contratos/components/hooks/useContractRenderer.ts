"use client";

import { useMemo } from "react";
import { EventContractData } from "@/types/contracts";
import {
  CotizacionRenderData,
  CondicionesComercialesData,
} from "../types";
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
      return '';
    }

    if (showVariables) {
      // Convertir saltos de línea a <br> incluso cuando showVariables es true
      return content.replace(/\n/g, '<br>');
    }

    // Si el contenido es HTML, preservar saltos de línea entre elementos
    let rendered = content;

    // Si es HTML, NO convertir saltos de línea entre tags en <br>
    // El HTML ya tiene su estructura y los saltos de línea entre tags no deben convertirse
    // Solo convertir saltos de línea dentro de elementos de texto
    if (rendered && !/<[^>]+>/.test(rendered)) {
      // Si es texto plano, convertir saltos de línea a <br>
      rendered = rendered.replace(/\n/g, '<br>');
    }

    if (!eventData) {
      // Si no hay datos, mostrar placeholders
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

      // Placeholders para bloques
      if (rendered.includes("@cotizacion_autorizada")) {
        rendered = rendered.replace(
          "@cotizacion_autorizada",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Cotización autorizada aparecerá aquí</p></div>'
        );
      }
      if (rendered.includes("{cotizacion_autorizada}")) {
        rendered = rendered.replace(
          "{cotizacion_autorizada}",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Cotización autorizada aparecerá aquí</p></div>'
        );
      }
      if (rendered.includes("@condiciones_comerciales")) {
        rendered = rendered.replace(
          "@condiciones_comerciales",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Condiciones comerciales aparecerán aquí</p></div>'
        );
      }
      if (rendered.includes("{condiciones_comerciales}")) {
        rendered = rendered.replace(
          "{condiciones_comerciales}",
          '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">Condiciones comerciales aparecerán aquí</p></div>'
        );
      }

      return rendered;
    }

    // Variables de cliente (se convertirán a mayúsculas)
    const clienteVars: Record<string, string> = {
      "@nombre_cliente": eventData.nombre_cliente.toUpperCase(),
      "@email_cliente": (eventData.email_cliente || "").toUpperCase(),
      "@telefono_cliente": (eventData.telefono_cliente || "").toUpperCase(),
      "@direccion_cliente": (eventData.direccion_cliente || "").toUpperCase(),
    };

    // Variables de estudio (se convertirán a mayúsculas)
    const studioVars: Record<string, string> = {
      "@nombre_studio": eventData.nombre_studio.toUpperCase(),
      "@nombre_representante": (eventData.nombre_representante || "").toUpperCase(),
      "@telefono_studio": (eventData.telefono_studio || "").toUpperCase(),
      "@correo_studio": (eventData.correo_studio || "").toUpperCase(),
      "@direccion_studio": (eventData.direccion_studio || "").toUpperCase(),
    };

    // Variables de negocio/comerciales (sin mayúsculas)
    // NO incluir @condiciones_pago aquí, se reemplazará después con el bloque completo si hay condicionesData
    const comercialesVars: Record<string, string> = {
      "@total_contrato": eventData.total_contrato,
    };

    // Variables de evento (sin mayúsculas)
    const eventoVars: Record<string, string> = {
      "@fecha_evento": eventData.fecha_evento,
      "@tipo_evento": eventData.tipo_evento,
      "@nombre_evento": eventData.nombre_evento,
      "@fecha_firma_cliente": eventData.fecha_firma_cliente || "",
    };

    // Combinar todas las variables
    const variables: Record<string, string> = {
      ...clienteVars,
      ...studioVars,
      ...comercialesVars,
      ...eventoVars,
    };

    // También soportar sintaxis {variable} con las mismas conversiones
    // NO incluir {condiciones_pago} aquí, se reemplazará después con el bloque completo si hay condicionesData
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
    };

    // Reemplazar variables @variable
    Object.entries(variables).forEach(([key, value]) => {
      // Usar replaceAll para reemplazar todas las ocurrencias
      rendered = rendered.replaceAll(key, value);
    });

    // Reemplazar variables {variable}
    Object.entries(braceVariables).forEach(([key, value]) => {
      // Usar replaceAll para reemplazar todas las ocurrencias
      rendered = rendered.replaceAll(key, value);
    });

    // Renderizar bloque de cotización
    if (cotizacionData) {
      const cotizacionHtml = renderCotizacionBlock(cotizacionData);
      rendered = rendered.replace("@cotizacion_autorizada", cotizacionHtml);
      rendered = rendered.replace("{cotizacion_autorizada}", cotizacionHtml);
    } else {
      // Placeholder si no hay datos
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay cotización autorizada disponible</p></div>';
      rendered = rendered.replace("@cotizacion_autorizada", placeholder);
      rendered = rendered.replace("{cotizacion_autorizada}", placeholder);
    }

    // Renderizar bloque de condiciones comerciales
    if (condicionesData) {
      const condicionesHtml = renderCondicionesComercialesBlock(condicionesData);
      
      // Reemplazar @condiciones_comerciales o {condiciones_comerciales} (todas las ocurrencias)
      rendered = rendered.replaceAll("@condiciones_comerciales", condicionesHtml);
      rendered = rendered.replaceAll("{condiciones_comerciales}", condicionesHtml);
      
      // También reemplazar @condiciones_pago con el bloque completo si existe
      // Esto permite que el template use @condiciones_pago pero muestre el bloque completo con desglose
      if (rendered.includes("@condiciones_pago")) {
        // Reemplazar @condiciones_pago con el bloque completo
        rendered = rendered.replace("@condiciones_pago", condicionesHtml);
      }
      if (rendered.includes("{condiciones_pago}")) {
        rendered = rendered.replace("{condiciones_pago}", condicionesHtml);
      }
    } else {
      // Placeholder si no hay datos
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay condiciones comerciales disponibles</p></div>';
      rendered = rendered.replace("@condiciones_comerciales", placeholder);
      rendered = rendered.replace("{condiciones_comerciales}", placeholder);
    }

    // Renderizar bloque legacy [SERVICIOS_INCLUIDOS] si existe
    // Usar cotizacionData si está disponible (tiene estructura completa con secciones)
    if (rendered.includes("[SERVICIOS_INCLUIDOS]")) {
      let serviciosHtml: string;
      if (cotizacionData && cotizacionData.secciones && cotizacionData.secciones.length > 0) {
        // Usar estructura completa con secciones
        serviciosHtml = renderCotizacionBlock(cotizacionData);
      } else {
        // Fallback a formato legacy
        serviciosHtml = renderServiciosBlock(eventData.servicios_incluidos);
      }
      // Agregar divisor antes y después del bloque de servicios
      serviciosHtml = '<div class="mb-6 pb-4 border-b border-zinc-800"></div>' + serviciosHtml + '<div class="mt-6 pt-4 border-t border-zinc-800"></div>';
      rendered = rendered.replace("[SERVICIOS_INCLUIDOS]", serviciosHtml);
    }

    // Limitar múltiples <br> seguidos a máximo 1 (saltos de línea simples)
    rendered = rendered.replace(/(<br>\s*){2,}/g, '<br>');

    // NO agregar <br> entre elementos HTML - los márgenes CSS ya manejan el espaciado
    // Solo limpiar <br> que puedan estar entre elementos de bloque
    rendered = rendered
      .replace(/<\/h1>\s*<br>\s*<h2/g, '</h1><h2')
      .replace(/<\/h2>\s*<br>\s*<h3/g, '</h2><h3')
      .replace(/<\/h3>\s*<br>\s*<p/g, '</h3><p')
      .replace(/<\/h1>\s*<br>\s*<p/g, '</h1><p')
      .replace(/<\/h2>\s*<br>\s*<p/g, '</h2><p')
      .replace(/<\/ul>\s*<br>\s*<h/g, '</ul><h')
      .replace(/<\/ol>\s*<br>\s*<h/g, '</ol><h')
      .replace(/<\/p>\s*<br>\s*<h/g, '</p><h');

    return rendered;
  }, [content, eventData, cotizacionData, condicionesData, showVariables]);

  return { renderedContent };
}

// Helper para renderizar servicios (legacy)
function renderServiciosBlock(servicios: any[]): string {
  if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
    return "<p><em>No hay servicios incluidos</em></p>";
  }

  let html = '<div class="servicios-incluidos">';

  servicios.forEach((categoria: any) => {
    html += `
      <div class="servicio-categoria mb-5">
        <h3 class="font-semibold text-zinc-300 mb-2">${categoria.categoria}</h3>
        <ul class="list-disc list-inside space-y-1 text-zinc-400">
    `;

    categoria.servicios.forEach((servicio: any) => {
      // NO mostrar precios en el preview
      html += `<li>${servicio.nombre}</li>`;

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

