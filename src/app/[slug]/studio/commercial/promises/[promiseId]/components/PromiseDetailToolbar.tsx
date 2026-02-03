'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { logProfileShared } from '@/lib/actions/studio/commercial/promises';
import { getOrCreateShortUrl } from '@/lib/actions/studio/commercial/promises/promise-short-url.actions';
import { toast } from 'sonner';
import { WhatsAppMessageModal } from './WhatsAppMessageModal';

interface PromiseDetailToolbarProps {
  studioSlug: string;
  promiseId: string | null;
  contactData: {
    contactId: string;
    contactName: string;
    phone: string;
  } | null;
  /** Nombre del evento para plantillas WhatsApp [[nombre_evento]] */
  eventName?: string | null;
  /** Fecha del evento para [[fecha_evento]] */
  eventDate?: Date | null;
  onCopyLink?: () => void;
  onPreview: () => void;
}

export function PromiseDetailToolbar({
  studioSlug,
  promiseId,
  contactData,
  eventName = null,
  eventDate = null,
  onCopyLink,
  onPreview,
}: PromiseDetailToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  if (!promiseId || !contactData) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        {/* Grupo: Compartir */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Compartir</span>
          {/* Botón Copiar URL */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!promiseId) return;

              try {
                // Obtener o crear URL corta
                const result = await getOrCreateShortUrl(studioSlug, promiseId);

                if (!result.success || !result.data) {
                  toast.error('Error al generar URL corta');
                  return;
                }

                const shortUrl = `${window.location.origin}/s/${result.data.shortCode}`;

                // Copiar al portapapeles con fallback
                try {
                  await navigator.clipboard.writeText(shortUrl);
                } catch (clipboardError) {
                  // Fallback: usar método tradicional si la API moderna falla
                  if (clipboardError instanceof Error && clipboardError.name === 'NotAllowedError') {
                    // Intentar método tradicional como fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = shortUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                      document.execCommand('copy');
                    } catch (fallbackError) {
                      console.debug('Error copiando al portapapeles (fallback):', fallbackError);
                    }
                    document.body.removeChild(textArea);
                  } else {
                    throw clipboardError;
                  }
                }
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
                onCopyLink?.();

                // Registrar log
                if (contactData) {
                  logProfileShared(studioSlug, promiseId, contactData.contactName, shortUrl).catch((error) => {
                    console.error('Error registrando copia de URL:', error);
                  });
                }
              } catch (error) {
                console.error('Error copiando URL:', error);
                toast.error('Error al copiar URL');
              }
            }}
            className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs ${linkCopied ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
          >
            {linkCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar URL</span>
              </>
            )}
          </ZenButton>

          {/* Botón Vista previa */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              onPreview();

              // Registrar log
              if (promiseId && contactData) {
                const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}?preview=true`;
                logProfileShared(studioSlug, promiseId, contactData.contactName, previewUrl).catch((error) => {
                  console.error('Error registrando vista previa:', error);
                });
              }
            }}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Vista previa</span>
          </ZenButton>
        </div>
      </div>

      {/* WhatsApp: lado derecho del toolbar */}
      {contactData.phone && (
        <div className="flex items-center gap-1.5">
          {/* Label con icono */}
          <div className="flex items-center gap-1.5">
            <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
            <span className="text-xs text-zinc-500 font-medium">WhatsApp</span>
          </div>
          
          {/* Separador vertical */}
          <div className="h-4 w-px bg-zinc-700" />
          
          {/* Botón: Enviar plantilla */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => setWhatsappModalOpen(true)}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            <span>Enviar plantilla</span>
          </ZenButton>
          
          {/* Botón: Abrir conversación */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              // Formatear número: eliminar espacios, guiones, paréntesis y el prefijo + si existe
              const cleanPhone = contactData.phone.replace(/[\s\-\(\)\+]/g, '');
              // Construir URL de WhatsApp
              const whatsappUrl = `https://wa.me/${cleanPhone}`;
              window.open(whatsappUrl, '_blank');
            }}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            <span>Abrir conversación</span>
          </ZenButton>
        </div>
      )}

      <WhatsAppMessageModal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactName={contactData.contactName}
        phone={contactData.phone}
        eventName={eventName}
        eventDate={eventDate}
      />
    </div>
  );
}

