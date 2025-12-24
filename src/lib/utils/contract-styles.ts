/**
 * Estilos unificados para preview de contratos
 * Usado en todos los componentes que muestran preview de contratos
 */
export const CONTRACT_PREVIEW_STYLES = `
  .contract-preview {
    color: rgb(161 161 170);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .contract-preview br {
    display: block;
    margin: 0;
    padding: 0;
    line-height: 1.2;
    height: 0;
    content: "";
  }
  .contract-preview h1 {
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    margin-top: 1.5rem !important;
    margin-bottom: 1rem !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding: 0 !important;
    color: rgb(244, 244, 245) !important;
    text-align: left !important;
    text-transform: uppercase;
  }
  .contract-preview h1:first-child {
    margin-top: 0 !important;
  }
  .contract-preview h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: rgb(244 244 245);
  }
  .contract-preview h3 {
    font-size: 1.125rem;
    font-weight: 500;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
    color: rgb(212 212 216);
  }
  .contract-preview p {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    line-height: 1.6;
    color: rgb(161 161 170);
  }
  .contract-preview ul,
  .contract-preview ol {
    list-style-position: outside;
    padding-left: 1.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    color: rgb(161 161 170);
  }
  .contract-preview ul {
    list-style-type: disc;
  }
  .contract-preview ol {
    list-style-type: decimal;
  }
  .contract-preview ul li,
  .contract-preview ol li {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    padding-left: 0.5rem;
    line-height: 1.5;
    display: list-item;
  }
  .contract-preview strong {
    font-weight: 600;
    color: rgb(228 228 231);
  }
  .contract-preview em {
    font-style: italic;
    color: rgb(113 113 122);
  }
  .contract-preview blockquote {
    margin: 0.5rem 0;
    padding-left: 1rem;
    border-left: 2px solid rgb(63 63 70);
    color: rgb(161 161 170);
  }
  .contract-preview [class*="copy"],
  .contract-preview [class*="Copy"],
  .contract-preview [class*="clipboard"],
  .contract-preview button[aria-label*="copiar"],
  .contract-preview button[aria-label*="Copiar"],
  .contract-preview button[title*="copiar"],
  .contract-preview button[title*="Copiar"],
  .contract-preview svg[class*="copy"],
  .contract-preview svg[class*="Copy"] {
    display: none !important;
  }
`;

