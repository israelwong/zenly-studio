// Utilidades para manejo de variables

import { ContractVariable, ParsedVariable } from "../types";

/**
 * Parsea variables en el texto (soporta @variable, {variable} y [BLOQUE_ESPECIAL])
 */
export function parseVariables(text: string): ParsedVariable[] {
  const variables: ParsedVariable[] = [];
  
  // Regex para @variable
  const atPattern = /@(\w+)/g;
  let match;
  
  while ((match = atPattern.exec(text)) !== null) {
    variables.push({
      fullMatch: match[0],
      key: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      syntax: "@",
    });
  }
  
  // Regex para {variable}
  const bracePattern = /\{(\w+)\}/g;
  while ((match = bracePattern.exec(text)) !== null) {
    variables.push({
      fullMatch: match[0],
      key: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      syntax: "{",
    });
  }
  
  // Regex para [BLOQUE_ESPECIAL] - bloques que empiezan con [ y terminan con ]
  // Ejemplo: [SERVICIOS_INCLUIDOS], [CONDICIONES_COMERCIALES]
  const blockPattern = /\[([A-Z][A-Z0-9_]*)\]/g;
  while ((match = blockPattern.exec(text)) !== null) {
    variables.push({
      fullMatch: match[0],
      key: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      syntax: "[",
    });
  }
  
  // Ordenar por posición
  return variables.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Obtiene la variable en la posición del cursor
 */
export function getVariableAtCursor(
  text: string,
  cursorPosition: number
): ParsedVariable | null {
  const variables = parseVariables(text);
  return (
    variables.find(
      (v) => cursorPosition >= v.startIndex && cursorPosition <= v.endIndex
    ) || null
  );
}

/**
 * Filtra variables según query (para autocompletado)
 */
export function filterVariables(
  variables: ContractVariable[],
  query: string
): ContractVariable[] {
  if (!query) return variables;
  
  const lowerQuery = query.toLowerCase();
  return variables.filter(
    (v) =>
      v.key.toLowerCase().includes(lowerQuery) ||
      v.label.toLowerCase().includes(lowerQuery) ||
      v.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Normaliza variable key (remueve @ o {})
 */
export function normalizeVariableKey(key: string): string {
  return key.replace(/^[@{}]/, "").replace(/[{}]$/, "");
}

/**
 * Formatea variable con sintaxis @
 */
export function formatVariable(key: string, syntax: "@" | "{" = "@"): string {
  if (syntax === "@") {
    return `@${key}`;
  }
  return `{${key}}`;
}

