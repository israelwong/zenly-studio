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

  // Usar el mismo enfoque que PaymentReceipt: html2canvas + jsPDF directamente

  // Función para limpiar estilos inline con funciones de color no soportadas
  const cleanUnsupportedColors = (style: string): string => {
    if (!style) return style;

    // Remover funciones de color no soportadas (lab, oklch, lch, etc.)
    return style
      .replace(/lab\([^)]+\)/gi, 'rgb(128, 128, 128)') // Reemplazar lab() con gris
      .replace(/oklch\([^)]+\)/gi, 'rgb(128, 128, 128)') // Reemplazar oklch() con gris
      .replace(/lch\([^)]+\)/gi, 'rgb(128, 128, 128)') // Reemplazar lch() con gris
      .replace(/color-mix\([^)]+\)/gi, 'rgb(128, 128, 128)'); // Reemplazar color-mix() con gris
  };

  // Función para reconstruir HTML mal estructurado
  const reconstructHTML = (html: string): string => {
    // Crear un contenedor temporal para procesar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Función para verificar si un elemento está vacío (sin contenido útil)
    const isEmptyElement = (el: HTMLElement): boolean => {
      const textContent = el.textContent?.trim() || '';
      const innerHTML = el.innerHTML.trim();
      return !textContent && (innerHTML === '' || !!innerHTML.match(/^(\s*<(p|h[1-6]|div|span|br)[^>]*>\s*<\/\2>\s*)+$/i));
    };

    // Primera pasada: eliminar elementos completamente vacíos
    const allElements = Array.from(tempDiv.querySelectorAll('*'));
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (isEmptyElement(htmlEl)) {
        htmlEl.remove();
      }
    });

    // Segunda pasada: reconstruir elementos con textContent pero innerHTML problemático
    const elementsToRebuild = Array.from(tempDiv.querySelectorAll('*'));
    elementsToRebuild.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const tagName = htmlEl.tagName.toLowerCase();
      const textContent = htmlEl.textContent?.trim() || '';
      const innerHTML = htmlEl.innerHTML.trim();

      // Si tiene textContent pero innerHTML está vacío o solo tiene elementos vacíos
      if (textContent && (!innerHTML || isEmptyElement(htmlEl))) {
        // Reconstruir con el textContent
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span', 'strong', 'b', 'em', 'i', 'blockquote', 'div'].includes(tagName)) {
          htmlEl.innerHTML = textContent;
        }
      } else if (textContent && innerHTML) {
        // Si tiene ambos, verificar si innerHTML solo contiene elementos vacíos
        const tempCheck = document.createElement('div');
        tempCheck.innerHTML = innerHTML;
        const hasContent = Array.from(tempCheck.children).some((child) => {
          const childEl = child as HTMLElement;
          return childEl.textContent?.trim() || childEl.children.length > 0;
        });

        // Si no hay contenido útil, reconstruir
        if (!hasContent && textContent) {
          htmlEl.innerHTML = textContent;
        }
      }
    });

    // Tercera pasada: eliminar elementos vacíos que quedaron después de la reconstrucción
    const finalEmptyElements = Array.from(tempDiv.querySelectorAll('*'));
    finalEmptyElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (isEmptyElement(htmlEl)) {
        htmlEl.remove();
      }
    });

    return tempDiv.innerHTML;
  };

  // Reconstruir HTML mal estructurado
  let cleanedHtml = reconstructHTML(htmlContent);

  // Limpiar funciones de color problemáticas
  cleanedHtml = cleanedHtml
    // Remover funciones de color en atributos style
    .replace(/style=["']([^"']*)["']/gi, (match, styleContent) => {
      if (!styleContent) return match;
      const cleaned = cleanUnsupportedColors(styleContent);
      return cleaned && cleaned.trim() ? `style="${cleaned}"` : match;
    })
    // Remover funciones de color en cualquier lugar del HTML
    .replace(/:\s*lab\([^)]+\)/gi, ': rgb(0, 0, 0)')
    .replace(/:\s*oklch\([^)]+\)/gi, ': rgb(0, 0, 0)')
    .replace(/:\s*lch\([^)]+\)/gi, ': rgb(0, 0, 0)')
    .replace(/:\s*color-mix\([^)]+\)/gi, ': rgb(0, 0, 0)');

  // Verificar que el HTML limpio tenga contenido
  if (!cleanedHtml || cleanedHtml.trim() === '') {
    throw new Error("El contenido HTML está vacío después de la limpieza");
  }

  // Crear un contenedor temporal
  const container = document.createElement("div");
  container.innerHTML = cleanedHtml;

  // Verificar que hay contenido
  if (!container.innerHTML || container.innerHTML.trim() === '') {
    throw new Error("El contenido HTML está vacío después de la limpieza");
  }

  // Verificar que hay texto o elementos con contenido
  const hasTextContent = container.textContent && container.textContent.trim().length > 0;
  const hasElements = container.children.length > 0;

  if (!hasTextContent && !hasElements) {
    throw new Error("El contenido HTML no tiene texto ni elementos después de parsear");
  }

  // Remover clases problemáticas pero mantener estructura y contenido
  const allElements = container.querySelectorAll("*");
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;

    // Remover solo clases de Tailwind problemáticas, no todas las clases
    const classAttr = htmlEl.getAttribute("class");
    if (classAttr) {
      // Remover clases que puedan causar problemas pero mantener estructura básica
      const cleanedClasses = classAttr
        .split(' ')
        .filter(cls => !cls.includes('bg-') && !cls.includes('text-') && !cls.includes('border-'))
        .join(' ');
      if (cleanedClasses) {
        htmlEl.setAttribute("class", cleanedClasses);
      } else {
        htmlEl.removeAttribute("class");
      }
    }
    htmlEl.removeAttribute("data-tailwind");
    htmlEl.removeAttribute("data-theme");

    // Limpiar estilos inline problemáticos pero mantener layout
    // NO sobrescribir completamente, solo limpiar funciones de color problemáticas
    if (htmlEl.style.cssText) {
      const currentStyle = htmlEl.style.cssText;
      // Solo remover funciones de color problemáticas, mantener todo lo demás
      const cleanedStyle = currentStyle
        .replace(/lab\([^)]+\)/gi, 'rgb(0, 0, 0)')
        .replace(/oklch\([^)]+\)/gi, 'rgb(0, 0, 0)')
        .replace(/lch\([^)]+\)/gi, 'rgb(0, 0, 0)')
        .replace(/color-mix\([^)]+\)/gi, 'rgb(0, 0, 0)');
      htmlEl.style.cssText = cleanedStyle;
    }

    // NO aplicar estilos inline agresivamente - dejar que el CSS del iframe maneje los estilos
    // Solo asegurar que no haya funciones de color problemáticas
  });

  // Crear iframe aislado sin stylesheets (como en PaymentReceipt)
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) throw new Error("Cannot access iframe document");

  // Escribir HTML mínimo sin stylesheets
  const containerHTML = container.innerHTML;

  // Verificar que hay contenido antes de escribir
  if (!containerHTML || containerHTML.trim() === '') {
    throw new Error("No hay contenido HTML para renderizar en el PDF");
  }


  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 32px;
          width: 210mm;
          min-height: 297mm;
          background: white;
          color: black;
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.6;
        }
        * {
          color: black !important;
        }
        body, div, p, span, h1, h2, h3, h4, h5, h6, ul, ol, li {
          background-color: transparent !important;
        }
        h1, h2, h3, h4, h5, h6 {
          font-weight: bold;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: black !important;
          display: block !important;
        }
        p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          color: black !important;
          display: block !important;
        }
        ul, ol {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
          color: black !important;
          display: block !important;
        }
        li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          color: black !important;
          display: list-item !important;
        }
        strong, b {
          font-weight: bold;
          color: black !important;
        }
        em, i {
          font-style: italic;
          color: black !important;
        }
        span {
          color: black !important;
        }
        br {
          display: block !important;
          content: "" !important;
          margin: 0.5em 0 !important;
        }
      </style>
    </head>
    <body>
      ${containerHTML}
    </body>
    </html>
  `);
  iframeDoc.close();

  // Esperar a que el iframe se renderice completamente
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Verificar que el contenido se haya renderizado
    const bodyContent = iframeDoc.body.innerHTML.trim();
    if (!bodyContent) {
      throw new Error("El contenido del contrato está vacío en el iframe");
    }

    // Verificar que el body tenga elementos visibles
    const hasVisibleContent = iframeDoc.body.children.length > 0 || iframeDoc.body.textContent?.trim();
    if (!hasVisibleContent) {
      throw new Error("El contenido del contrato no tiene elementos visibles");
    }

    // Usar html2canvas directamente (como en PaymentReceipt)
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // Obtener dimensiones del contenido
    const bodyElement = iframeDoc.body;
    const contentWidth = bodyElement.scrollWidth || bodyElement.offsetWidth || 794; // A4 width en pixels a 96dpi
    const contentHeight = bodyElement.scrollHeight || bodyElement.offsetHeight || 1123; // A4 height en pixels

    const canvas = await html2canvas(bodyElement, {
      scale: finalOptions.html2canvas?.scale || 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      foreignObjectRendering: false,
    });

    // Verificar que el canvas tenga contenido
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("El canvas generado está vacío");
    }

    const pdf = new jsPDF(
      (finalOptions.jsPDF?.orientation || 'portrait') as 'portrait' | 'landscape',
      (finalOptions.jsPDF?.unit || 'mm') as 'mm' | 'pt' | 'px' | 'in' | 'cm',
      finalOptions.jsPDF?.format || 'a4'
    );

    const imgData = canvas.toDataURL('image/jpeg', finalOptions.image?.quality || 0.98);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm de margen (como en PaymentReceipt)
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Si el contenido cabe en una página, agregarlo directamente
    if (imgHeight <= pageHeight - (margin * 2)) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    } else {
      // Contenido de múltiples páginas
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - (margin * 2));

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - (margin * 2));
      }
    }

    pdf.save(finalOptions.filename || 'contrato.pdf');
  } catch (error) {
    throw error;
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

  // Clone and strip all classes/attributes that reference Tailwind (exactamente como PaymentReceipt)
  const clone = element.cloneNode(true) as HTMLElement;
  const allElements = clone.querySelectorAll('*');

  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute('class');
    htmlEl.removeAttribute('data-tailwind');
    htmlEl.removeAttribute('data-theme');
  });

  // Create iframe to isolate from page styles (exactamente como PaymentReceipt)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) throw new Error('Cannot access iframe document');

  // Write HTML with professional styles for PDF
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 40px 50px;
          width: 210mm;
          min-height: 297mm;
          background: white;
          color: #1a1a1a;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.7;
        }
        h1 {
          font-size: 18pt;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 24pt;
          margin-bottom: 12pt;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
          page-break-after: avoid;
        }
        h1:first-child {
          margin-top: 0;
        }
        h2 {
          font-size: 14pt;
          font-weight: 600;
          margin-top: 18pt;
          margin-bottom: 10pt;
          color: #1a1a1a;
          border-bottom: 1px solid #e5e5e5;
          padding-bottom: 4pt;
          page-break-after: avoid;
        }
        h3 {
          font-size: 12pt;
          font-weight: 600;
          margin-top: 14pt;
          margin-bottom: 8pt;
          color: #2a2a2a;
          page-break-after: avoid;
        }
        p {
          margin-top: 8pt;
          margin-bottom: 8pt;
          line-height: 1.7;
          color: #1a1a1a;
          text-align: justify;
          orphans: 3;
          widows: 3;
        }
        p:empty {
          display: none;
        }
        ul, ol {
          margin-top: 10pt;
          margin-bottom: 10pt;
          padding-left: 24pt;
          color: #1a1a1a;
        }
        ul {
          list-style-type: disc;
        }
        ol {
          list-style-type: decimal;
        }
        li {
          margin-top: 4pt;
          margin-bottom: 4pt;
          line-height: 1.7;
          padding-left: 4pt;
        }
        strong, b {
          font-weight: 600;
          color: #000000;
        }
        em, i {
          font-style: italic;
        }
        blockquote {
          margin: 12pt 0;
          padding-left: 16pt;
          border-left: 3px solid #d0d0d0;
          color: #3a3a3a;
          font-style: italic;
        }
        br {
          line-height: 1.7;
        }
        hr {
          border: none;
          border-top: 1px solid #e5e5e5;
          margin: 16pt 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
        }
        table td, table th {
          padding: 6pt;
          border: 1px solid #e5e5e5;
        }
        table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      ${clone.innerHTML}
    </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for iframe to render (exactamente como PaymentReceipt)
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(iframeDoc.body, {
      scale: finalOptions.html2canvas?.scale || 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      foreignObjectRendering: false
    });

    // Verificar que el canvas tenga contenido
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("El canvas generado está vacío");
    }

    const imgData = canvas.toDataURL('image/jpeg', finalOptions.image?.quality || 0.98);
    const margin = finalOptions.margin || 10;

    // Calcular dimensiones del contenido
    const contentWidth = 210 - (margin * 2); // A4 width en mm menos márgenes
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    // Crear PDF con altura dinámica basada en el contenido (una sola página larga)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [210, contentHeight + (margin * 2)] // Ancho A4, altura dinámica
    });

    // Agregar imagen completa en una sola página
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);

    pdf.save(finalOptions.filename || 'contrato.pdf');
  } catch (error) {
    throw error;
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
