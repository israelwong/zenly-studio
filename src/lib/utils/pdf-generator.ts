"use client";

export interface PDFOptions {
  filename?: string;
  margin?: number;
  image?: { type: string; quality: number };
  html2canvas?: { scale: number };
  jsPDF?: { unit: string; format: string; orientation: string };
}

const DEFAULT_OPTIONS: PDFOptions = {
  margin: 1,
  filename: "contrato.pdf",
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
};

/**
 * Genera un PDF desde contenido HTML
 * @param htmlContent - Contenido HTML a convertir
 * @param options - Opciones de configuración del PDF
 */
export async function generatePDF(
  htmlContent: string,
  options: PDFOptions = {}
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("generatePDF solo puede ejecutarse en el cliente");
  }

  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Crear un contenedor temporal
  const container = document.createElement("div");
  container.innerHTML = htmlContent;

  // Remover todas las clases de Tailwind (incompatible con oklch en html2canvas)
  const allElements = container.querySelectorAll("*");
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute("class");
    htmlEl.removeAttribute("data-tailwind");
  });

  // Crear iframe aislado sin stylesheets para evitar oklch
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "8.5in";
  iframe.style.height = "11in";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) throw new Error("Cannot access iframe document");

  // Escribir HTML mínimo sin stylesheets
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0.5in; width: 8.5in; min-height: 11in; background: white; color: black; font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6;">
      ${container.innerHTML}
    </body>
    </html>
  `);
  iframeDoc.close();

  // Esperar a que el iframe se renderice
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // Importación dinámica solo en el cliente
    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf().set(finalOptions).from(iframeDoc.body).save();
  } finally {
    // Limpiar iframe
    document.body.removeChild(iframe);
  }
}

/**
 * Genera un PDF desde un elemento del DOM
 * @param element - Elemento HTML del DOM
 * @param options - Opciones de configuración del PDF
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("generatePDFFromElement solo puede ejecutarse en el cliente");
  }

  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Clonar el elemento para no afectar el original
  const clone = element.cloneNode(true) as HTMLElement;

  // Remover todas las clases de Tailwind (incompatible con oklch en html2canvas)
  const allElements = clone.querySelectorAll("*");
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute("class");
    htmlEl.removeAttribute("data-tailwind");
  });

  // Crear iframe aislado sin stylesheets para evitar oklch
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "8.5in";
  iframe.style.height = "11in";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) throw new Error("Cannot access iframe document");

  // Escribir HTML mínimo sin stylesheets
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0.5in; width: 8.5in; min-height: 11in; background: white; color: black; font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6;">
      ${clone.innerHTML}
    </body>
    </html>
  `);
  iframeDoc.close();

  // Esperar a que el iframe se renderice
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // Importación dinámica solo en el cliente
    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf().set(finalOptions).from(iframeDoc.body).save();
  } finally {
    // Limpiar iframe
    document.body.removeChild(iframe);
  }
}

/**
 * Genera nombre de archivo para contrato
 * @param eventName - Nombre del evento
 * @param clientName - Nombre del cliente
 */
export function generateContractFilename(
  eventName: string,
  clientName: string
): string {
  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const date = new Date().toISOString().split("T")[0];
  return `contrato-${sanitize(eventName)}-${sanitize(clientName)}-${date}.pdf`;
}
