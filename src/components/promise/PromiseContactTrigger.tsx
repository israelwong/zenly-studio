'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { PromiseContactModal, type PromiseContactModalStudio } from './PromiseContactModal';

interface PromiseContactTriggerProps {
  studio: PromiseContactModalStudio;
  className?: string;
}

/**
 * Botón ghost "¿Tienes dudas? Contáctanos" que abre el modal de contacto del estudio.
 * Visible en header/footer de las vistas públicas de promesa (Negociación, Pendientes, Cierre).
 */
export function PromiseContactTrigger({ studio, className }: PromiseContactTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ZenButton
        variant="ghost"
        size="sm"
        className={`text-zinc-400 hover:text-zinc-200 ${className ?? ''}`}
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-4 w-4 mr-1.5" />
        ¿Tienes dudas? Contáctanos
      </ZenButton>
      <PromiseContactModal
        open={open}
        onOpenChange={setOpen}
        studio={studio}
      />
    </>
  );
}
