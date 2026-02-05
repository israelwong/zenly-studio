'use client';

import React from 'react';
import { PromiseContactTrigger } from './PromiseContactTrigger';
import type { PromiseContactModalStudio } from './PromiseContactModal';

const dividerClass = 'absolute left-16 right-16 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent';

interface PromiseContactBlockProps {
  studio: PromiseContactModalStudio;
  /** Línea arriba del botón */
  showDividerTop?: boolean;
  /** Línea abajo del botón */
  showDividerBottom?: boolean;
  className?: string;
}

/**
 * Bloque completo: divisor opcional arriba + botón Contáctanos + divisor opcional abajo.
 * Reutilizable en Pendientes, Negociación, Cierre.
 */
export function PromiseContactBlock({
  studio,
  showDividerTop = true,
  showDividerBottom = true,
  className = '',
}: PromiseContactBlockProps) {
  return (
    <section
      className={`max-w-4xl mx-auto px-4 py-6 flex justify-center relative ${className}`.trim()}
    >
      {showDividerTop && (
        <div className={`${dividerClass} top-0`} aria-hidden />
      )}
      {showDividerBottom && (
        <div className={`${dividerClass} bottom-0`} aria-hidden />
      )}
      <PromiseContactTrigger studio={studio} />
    </section>
  );
}
