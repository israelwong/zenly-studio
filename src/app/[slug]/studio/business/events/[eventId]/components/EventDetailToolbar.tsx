'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Phone } from 'lucide-react';
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

  // Abrir bitácora desde QuickNoteCard u otros (mismo patrón que PromiseLayoutClient)
  useEffect(() => {
    const handler = () => setLogsSheetOpen(true);
    window.addEventListener('open-bitacora-sheet', handler);
    return () => window.removeEventListener('open-bitacora-sheet', handler);
  }, []);

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
    window.open(`${window.location.origin}${portalUrl}`, '_blank');
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
        {/* Izquierda: Compartir + Revisar */}
        <div className="flex items-center gap-3">
          {hasContactData && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 font-medium">Portal del cliente</span>
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
                      <span>Copiar URL</span>
                    </>
                  )}
                </ZenButton>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviewPortal}
                  className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir portal</span>
                </ZenButton>
              </div>
            </>
          )}
        </div>

        {/* Derecha: Contactar */}
        {hasContactData && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Contactar</span>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleWhatsApp}
              className="gap-1.5 px-2.5 py-1.5 h-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
              <span>WhatsApp</span>
            </ZenButton>
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

