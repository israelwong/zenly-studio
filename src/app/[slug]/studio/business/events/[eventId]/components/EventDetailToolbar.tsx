'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, ChevronRight, Phone } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { BitacoraSheet } from '@/components/shared/bitacora';
import { logWhatsAppSent, logCallMade } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';

interface EventDetailToolbarProps {
  studioSlug: string;
  eventId: string;
  promiseId: string | null;
  contactId: string | null;
  contactPhone: string | null;
  contactName: string | null;
}

export function EventDetailToolbar({
  studioSlug,
  eventId,
  promiseId,
  contactId,
  contactPhone,
  contactName,
}: EventDetailToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);

  const hasContactData = !!contactPhone;

  const buildPortalLoginUrl = () => {
    if (!contactPhone) return null;
    return `/${studioSlug}/cliente/login?phone=${encodeURIComponent(contactPhone)}`;
  };

  const handleCopyPortalUrl = () => {
    const portalUrl = buildPortalLoginUrl();
    if (!portalUrl) {
      toast.error('No hay número de teléfono disponible');
      return;
    }

    const fullUrl = `${window.location.origin}${portalUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setLinkCopied(true);
      toast.success('URL del portal copiada');
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      toast.error('Error al copiar URL');
    });
  };

  const handlePreviewPortal = () => {
    const portalUrl = buildPortalLoginUrl();
    if (!portalUrl) {
      toast.error('No hay número de teléfono disponible');
      return;
    }

    window.open(portalUrl, '_blank');
  };

  const handleWhatsApp = async () => {
    if (!contactPhone || !contactName) return;
    
    const cleanPhone = contactPhone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${contactName}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    if (promiseId) {
      logWhatsAppSent(studioSlug, promiseId, contactName, contactPhone).catch((error) => {
        console.error('Error registrando WhatsApp:', error);
      });
    }

    window.open(whatsappUrl, '_blank');
  };

  const handleCall = async () => {
    if (!contactPhone || !contactName) return;

    if (promiseId) {
      logCallMade(studioSlug, promiseId, contactName, contactPhone).catch((error) => {
        console.error('Error registrando llamada:', error);
      });
    }

    window.open(`tel:${contactPhone}`, '_self');
  };

  if (!hasContactData && !promiseId) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          {/* Sección: Compartir */}
          {hasContactData && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 font-medium">Compartir</span>
                {/* Botón Copiar URL */}
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPortalUrl}
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
                      <span>Copiar portal URL</span>
                    </>
                  )}
                </ZenButton>
              </div>

              {/* Divisor */}
              <div className="h-4 w-px bg-zinc-700" />
            </>
          )}

          {/* Sección: Contactar */}
          {hasContactData && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 font-medium">Contactar</span>
                {/* Botón WhatsApp */}
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleWhatsApp}
                  className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
                  <span>WhatsApp</span>
                </ZenButton>

                {/* Botón Llamada */}
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCall}
                  className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-blue-500/10 hover:text-blue-400"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Llamar</span>
                </ZenButton>
              </div>

              {/* Divisor */}
              <div className="h-4 w-px bg-zinc-700" />
            </>
          )}

          {/* Sección: Revisar */}
          {hasContactData && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 font-medium">Revisar</span>
              {/* Botón Portal del cliente */}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handlePreviewPortal}
                className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Portal del cliente</span>
              </ZenButton>
            </div>
          )}
        </div>

        {/* Botón de bitácora alineado a la derecha */}
        {promiseId && (
          <ZenButton
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
            title="Bitácora"
            onClick={() => setLogsSheetOpen(true)}
          >
            <span>Bitácora</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </ZenButton>
        )}
      </div>

      {/* Sheet de bitácora */}
      {promiseId && (
        <BitacoraSheet
          open={logsSheetOpen}
          onOpenChange={setLogsSheetOpen}
          studioSlug={studioSlug}
          promiseId={promiseId}
          contactId={contactId}
        />
      )}
    </>
  );
}

