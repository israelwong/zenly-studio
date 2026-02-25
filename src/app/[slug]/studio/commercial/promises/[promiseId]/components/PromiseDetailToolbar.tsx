'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ZenButton, ZenSwitch, ZenConfirmModal } from '@/components/ui/zen';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { logProfileShared, setPromisePublished } from '@/lib/actions/studio/commercial/promises';
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
  /** Si la promesa está publicada (published_at != null). SSOT para Copiar URL y vista pública */
  isPublished?: boolean;
  /** Al activar el toggle para publicar (OFF→ON): abrir modal de automatización (paso obligatorio) */
  onRequestPublish?: () => void;
  /** Tras despublicar con éxito (ej. router.refresh) */
  onUnpublishSuccess?: () => void;
  /** Nombre del evento para plantillas WhatsApp [[nombre_evento]] */
  eventName?: string | null;
  /** Fecha del evento para [[fecha_evento]] */
  eventDate?: Date | null;
  onCopyLink?: () => void;
  /** Si está publicada, botón a la derecha de Previsualizar que abre el modal de opciones de automatización */
  onOpenAutomationOptions?: () => void;
}

export function PromiseDetailToolbar({
  studioSlug,
  promiseId,
  contactData,
  isPublished = false,
  onRequestPublish,
  onUnpublishSuccess,
  eventName = null,
  eventDate = null,
  onCopyLink,
  onOpenAutomationOptions,
}: PromiseDetailToolbarProps) {
  const basePublicUrl = typeof window !== 'undefined' ? `${window.location.origin}/${studioSlug}/promise/${promiseId}` : '';
  const [linkCopied, setLinkCopied] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  if (!promiseId || !contactData) {
    return null;
  }

  const handleTogglePublish = (checked: boolean) => {
    if (checked) {
      onRequestPublish?.();
    } else {
      setShowUnpublishConfirm(true);
    }
  };

  const handleConfirmUnpublish = async () => {
    if (!promiseId) return;
    setIsUnpublishing(true);
    try {
      const result = await setPromisePublished(studioSlug, promiseId, false);
      if (result.success) {
        setShowUnpublishConfirm(false);
        onUnpublishSuccess?.();
        toast.success('Publicación apagada');
      } else {
        toast.error(result.error || 'Error al apagar publicación');
      }
    } catch (error) {
      console.error('Error despublicando:', error);
      toast.error('Error al apagar publicación');
    } finally {
      setIsUnpublishing(false);
    }
  };

  const copyUrlHandler = async () => {
    if (!promiseId) return;
    try {
      const result = await getOrCreateShortUrl(studioSlug, promiseId);
      if (!result.success || !result.data) {
        toast.error('Error al generar URL corta');
        return;
      }
      const shortUrl = `${window.location.origin}/s/${result.data.shortCode}`;
      try {
        await navigator.clipboard.writeText(shortUrl);
      } catch (clipboardError) {
        if (clipboardError instanceof Error && clipboardError.name === 'NotAllowedError') {
          const textArea = document.createElement('textarea');
          textArea.value = shortUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
          } catch (fallbackError) {
            console.debug('Error copiando (fallback):', fallbackError);
          }
          document.body.removeChild(textArea);
        } else {
          throw clipboardError;
        }
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      onCopyLink?.();
      if (contactData) {
        logProfileShared(studioSlug, promiseId, contactData.contactName, shortUrl).catch((err) =>
          console.error('Error registrando copia de URL:', err)
        );
      }
    } catch (error) {
      console.error('Error copiando URL:', error);
      toast.error('Error al copiar URL');
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      {/* Izquierda: Previsualizar + WhatsApp (separado sin divisor) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              if (basePublicUrl) window.open(basePublicUrl, '_blank');
              if (promiseId && contactData) {
                logProfileShared(studioSlug, promiseId, contactData.contactName, basePublicUrl).catch(() => {});
              }
            }}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs bg-zinc-800/50 hover:bg-zinc-700/50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Ver como prospecto</span>
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => {
              if (basePublicUrl) window.open(`${basePublicUrl}?preview=studio`, '_blank');
            }}
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs bg-zinc-800/50 hover:bg-zinc-700/50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Ver como estudio</span>
          </ZenButton>
        </div>
        {contactData.phone && (
          <>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-1.5 ml-2">
              <WhatsAppIcon className="h-4 w-4 text-emerald-400 shrink-0" size={16} />
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setWhatsappModalOpen(true)}
                className="px-2.5 py-1.5 h-7 text-xs text-emerald-400 bg-zinc-800/50 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                Enviar plantilla
              </ZenButton>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  const cleanPhone = contactData.phone.replace(/[\s\-\(\)\+]/g, '');
                  window.open(`https://wa.me/${cleanPhone}`, '_blank');
                }}
                className="px-2.5 py-1.5 h-7 text-xs text-emerald-400 bg-zinc-800/50 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                Abrir chat
              </ZenButton>
            </div>
          </>
        )}
      </div>

      {/* Derecha: Opciones de automatización → [Copiar URL solo si publicado] → Publicar (toggle) */}
      <div className="flex items-center gap-3">
        {onOpenAutomationOptions && (
          <>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={onOpenAutomationOptions}
              className="gap-1.5 px-2.5 py-1.5 h-7 text-xs bg-zinc-800/50 hover:bg-zinc-700/50"
            >
              Opciones de automatización
            </ZenButton>
            <div className="h-4 w-px bg-zinc-700" />
          </>
        )}
        {isPublished && (
          <>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={copyUrlHandler}
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
            <div className="h-4 w-px bg-zinc-700" />
          </>
        )}
        <ZenSwitch
          checked={isPublished}
          onCheckedChange={handleTogglePublish}
          variant="emerald"
          label={isPublished ? 'Despublicar' : 'Publicar'}
          className="mb-0 scale-90 origin-center"
        />
      </div>

      <ZenConfirmModal
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleConfirmUnpublish}
        title="¿Apagar publicación?"
        description="El prospecto ya no podrá ver esta propuesta."
        confirmText="Sí, apagar"
        cancelText="Cancelar"
        variant="default"
        loading={isUnpublishing}
        loadingText="Apagando…"
      />

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

