'use client';

import React from 'react';
import { ZenInput, ZenButton } from '@/components/ui/zen';

export interface WhatsAppTemplateFormProps {
  /** Título de la plantilla */
  title: string;
  /** Mensaje de la plantilla */
  message: string;
  /** Callback cuando cambia el título */
  onTitleChange: (title: string) => void;
  /** Callback cuando cambia el mensaje */
  onMessageChange: (message: string) => void;
  /** Placeholder para el título */
  titlePlaceholder?: string;
  /** Placeholder para el mensaje */
  messagePlaceholder?: string;
  /** Número de filas del textarea del mensaje */
  messageRows?: number;
  /** Si se muestran los chips de variables */
  showVariableChips?: boolean;
  /** Callback cuando se hace clic en un chip de variable */
  onVariableInsert?: (variable: string) => void;
  /** Clase CSS adicional para el contenedor */
  className?: string;
}

const VAR_CHIPS: { label: string; value: string }[] = [
  { label: '+ Nombre contacto', value: '[[nombre_contacto]]' },
  { label: '+ Nombre evento', value: '[[nombre_evento]]' },
  { label: '+ Fecha evento', value: '[[fecha_evento]]' },
  { label: '+ Link promesa', value: '[[link_promesa]]' },
];

const VAR_HINT = 'Variables: [[nombre_prospecto]], [[nombre_evento]], [[link_promesa]]';

/**
 * Componente compartido para crear/editar plantillas de WhatsApp
 * 
 * Maneja los campos: título y mensaje, con soporte para variables.
 * Sigue el ZEN Design System.
 */
export function WhatsAppTemplateForm({
  title,
  message,
  onTitleChange,
  onMessageChange,
  titlePlaceholder = 'Nombre de la plantilla (ej: Saludo inicial)',
  messagePlaceholder = 'Hola [[nombre_prospecto]], te comparto el link de tu cotización: [[link_promesa]]',
  messageRows = 4,
  showVariableChips = false,
  onVariableInsert,
  className = '',
}: WhatsAppTemplateFormProps) {
  const handleVariableClick = (variable: string) => {
    if (onVariableInsert) {
      onVariableInsert(variable);
    } else {
      // Fallback: insertar al final del mensaje
      onMessageChange(message + variable);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <ZenInput
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-1">Mensaje</label>
        {showVariableChips && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VAR_CHIPS.map((chip) => (
              <ZenButton
                key={chip.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleVariableClick(chip.value)}
                className="text-xs h-6 px-2"
              >
                {chip.label}
              </ZenButton>
            ))}
          </div>
        )}
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder={messagePlaceholder}
          rows={messageRows}
          className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        {!showVariableChips && (
          <p className="text-xs text-zinc-500 mt-1">{VAR_HINT}</p>
        )}
      </div>
    </div>
  );
}
