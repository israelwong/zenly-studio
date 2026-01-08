'use client';

import React from 'react';
import { Receipt, FileText, CreditCard, Tag, Shield } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface PromiseMainToolbarProps {
  studioSlug: string;
  onCondicionesComercialesClick: () => void;
  onTerminosCondicionesClick: () => void;
  onTagsClick: () => void;
  onPaymentMethodsClick: () => void;
  onAvisoPrivacidadClick: () => void;
}

export function PromiseMainToolbar({
  studioSlug,
  onCondicionesComercialesClick,
  onTerminosCondicionesClick,
  onTagsClick,
  onPaymentMethodsClick,
  onAvisoPrivacidadClick,
}: PromiseMainToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      {/* Grupo: Configurar */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 font-medium">Configurar:</span>

        {/* Botón Términos y Condiciones */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onTerminosCondicionesClick}
          className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Términos y Condiciones</span>
        </ZenButton>

        {/* Botón Aviso de Privacidad */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onAvisoPrivacidadClick}
          className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Aviso de Privacidad</span>
        </ZenButton>

        {/* Botón Etiquetas */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onTagsClick}
          className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Etiquetas</span>
        </ZenButton>
      </div>

      {/* Grupo: Métodos de Pago */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 font-medium">Pagos</span>

        {/* Botón Condiciones Comerciales */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onCondicionesComercialesClick}
          className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Condiciones Comerciales</span>
        </ZenButton>

        {/* Botón Métodos de Pago */}
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onPaymentMethodsClick}
          className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Métodos de Pago</span>
        </ZenButton>
      </div>
    </div>
  );
}

