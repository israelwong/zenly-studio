'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Copy, Check, ExternalLink, Plus, List } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { BitacoraSheet } from '@/components/shared/bitacora';
import { toast } from 'sonner';

interface EventDetailToolbarProps {
  studioSlug: string;
  eventId: string;
  promiseId: string | null;
  /** ID de la cotización principal del evento; necesario para "+ Anexar servicio". */
  parentCotizacionId?: string | null;
  contactId: string | null;
  contactPhone: string | null;
  contactName: string | null;
  /** Si hay contrato generado para el evento; si false, no se muestra el botón "Ver contrato" */
  hasContract?: boolean;
  /** Contenido a la derecha del toolbar (ej. botón Personal) */
  rightContent?: React.ReactNode;
}

export function EventDetailToolbar({
  studioSlug,
  eventId,
  promiseId,
  parentCotizacionId,
  contactId,
  contactPhone,
  contactName,
  hasContract = true,
  rightContent,
}: EventDetailToolbarProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);

  const hasContactData = !!contactPhone;

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

  if (!hasContactData && !promiseId && !rightContent) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-1.5 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        {/* Izquierda: Portal + Contrato */}
        <div className="flex items-center gap-3">
          {hasContactData && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-500 font-medium">Portal del cliente</span>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleCopyPortalUrl}
                className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs ${linkCopied ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/80'}`}
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
                className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/80"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir portal</span>
              </ZenButton>
            </div>
          )}
          {promiseId && hasContract && (
            <>
              {hasContactData && (
                <div className="h-5 w-px bg-zinc-700 shrink-0" aria-hidden />
              )}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('open-contrato-preview'))}
                className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
              >
                <span>Ver contrato</span>
              </ZenButton>
            </>
          )}
          {promiseId && parentCotizacionId && (
            <>
              {(hasContactData || (promiseId && hasContract)) && (
                <div className="h-5 w-px bg-zinc-700 shrink-0" aria-hidden />
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500 font-medium">Anexos</span>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/20"
                  asChild
                >
                  <Link
                    href={`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/nueva?isAnnex=true&parentId=${encodeURIComponent(parentCotizacionId)}&returnUrl=${encodeURIComponent(`/${studioSlug}/studio/business/events/${eventId}`)}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Crear</span>
                  </Link>
                </ZenButton>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/20"
                  asChild
                >
                  <Link href={`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`}>
                    <List className="h-3.5 w-3.5" />
                    <span>Gestionar</span>
                  </Link>
                </ZenButton>
              </div>
            </>
          )}
        </div>
        {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
      </div>

      {/* Sheet de bitácora */}
      {promiseId && (
        <BitacoraSheet
          open={logsSheetOpen}
          onOpenChange={setLogsSheetOpen}
          studioSlug={studioSlug}
          promiseId={promiseId}
          context="EVENT"
          contactId={contactId}
        />
      )}

    </>
  );
}

