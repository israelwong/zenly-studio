'use client';

import React from 'react';
import { Phone, Clock } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { ZenDialog } from '@/components/ui/zen';

export interface PromiseContactModalStudio {
  studio_name: string;
  logo_url?: string | null;
  phone?: string | null;
  /** Horarios de atención formateados; si no hay, se muestra texto genérico */
  business_hours_text?: string | null;
  /** Teléfonos con tipo (LLAMADAS | WHATSAPP | AMBOS). Si existe, se validan botones como en profile/contacto. */
  contact_phones?: { number: string; type: string }[];
}

interface PromiseContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studio: PromiseContactModalStudio;
}

/**
 * Modal de contacto del estudio para vistas públicas de promesa.
 * Usa datos del Studio (teléfono/WhatsApp), NO del usuario logueado.
 */
const TIPO_LLAMADAS = 'LLAMADAS';
const TIPO_WHATSAPP = 'WHATSAPP';
const TIPO_AMBOS = 'AMBOS';

export function PromiseContactModal({
  open,
  onOpenChange,
  studio,
}: PromiseContactModalProps) {
  const contactPhones = studio.contact_phones?.filter((p) => p?.number?.trim()) ?? [];
  const hasTypedPhones = contactPhones.length > 0;
  const fallbackPhone = studio.phone?.trim() || null;

  // Normalizar type a mayúsculas (DB guarda LLAMADAS | WHATSAPP | AMBOS desde EditPhoneModal)
  const normalizeType = (t: string | undefined) => (t?.toUpperCase?.() ?? '') as string;
  const callPhones = contactPhones.filter(
    (p) => normalizeType(p.type) === TIPO_LLAMADAS || normalizeType(p.type) === TIPO_AMBOS
  );
  const whatsappPhones = contactPhones.filter(
    (p) => normalizeType(p.type) === TIPO_WHATSAPP || normalizeType(p.type) === TIPO_AMBOS
  );

  const hasCall = callPhones.length > 0;
  const hasWhatsApp = whatsappPhones.length > 0;

  // Si hay contact_phones con tipo: solo mostrar botones según tipo (no usar fallback para el otro).
  // Si no hay contact_phones: fallback a studio.phone para ambos.
  const normalizeNum = (n: string) => n.trim().replace(/\s+/g, '').replace(/^\+/, '');
  const callNumber = hasCall
    ? normalizeNum(callPhones[0].number)
    : hasTypedPhones ? null : (fallbackPhone ? normalizeNum(fallbackPhone) : null);
  const whatsappNumber = hasWhatsApp
    ? normalizeNum(whatsappPhones[0].number)
    : hasTypedPhones ? null : (fallbackPhone ? normalizeNum(fallbackPhone) : null);

  const showWhatsApp = !!whatsappNumber;
  const showCall = !!callNumber;
  const showFallbackMessage = !showWhatsApp && !showCall;

  const waUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, tengo una consulta sobre mi propuesta.')}`
    : null;
  const telUrl = callNumber ? `tel:${callNumber}` : null;
  const businessHoursText = studio.business_hours_text?.trim() || 'Consulte horarios con el estudio.';

  return (
    <ZenDialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Contáctanos"
      description={studio.studio_name}
      showCloseButton
      closeOnClickOutside
      maxWidth="sm"
    >
      <div className="p-4 pt-0 space-y-4">
        {studio.logo_url && (
          <div className="flex justify-center">
            <img
              src={studio.logo_url}
              alt={studio.studio_name}
              className="h-12 w-12 rounded-full object-contain border border-zinc-700"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {showWhatsApp && waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-medium text-white bg-[#25D366] hover:bg-[#20bd5a] transition-colors"
            >
              <WhatsAppIcon size={20} className="h-5 w-5" />
              WhatsApp
            </a>
          )}
          {showCall && telUrl && (
            <a
              href={telUrl}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Llamar
            </a>
          )}
          {showFallbackMessage && (
            <p className="text-sm text-zinc-500 italic">
              No hay número de contacto disponible.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Horarios de atención
              </p>
              <p className="text-sm text-zinc-400 mt-0.5">
                {businessHoursText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
