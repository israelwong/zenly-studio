'use client';

import React, { useState } from 'react';
import { Settings, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  logProfileShared,
} from '@/lib/actions/studio/commercial/promises';
import { PromiseShareOptionsModal } from './PromiseShareOptionsModal';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent } from '@/components/ui/zen';

interface PromiseQuickActionsProps {
  studioSlug: string;
  contactId: string;
  contactName: string;
  phone: string;
  email?: string | null;
  promiseId?: string | null;
  isLoading?: boolean;
}

export function PromiseQuickActionsSkeleton() {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="px-3 py-2 rounded-lg bg-zinc-600/10 animate-pulse flex items-center gap-2"
        >
          <div className="h-4 w-4 bg-zinc-700 rounded" />
          <div className="h-4 w-20 bg-zinc-700 rounded" />
        </div>
      ))}
    </div>
  );
}

export function PromiseQuickActions({
  studioSlug,
  contactId,
  contactName,
  phone: _phone,
  email,
  promiseId,
  isLoading = false,
}: PromiseQuickActionsProps) {
  if (isLoading) {
    return <PromiseQuickActionsSkeleton />;
  }
  const [linkCopied, setLinkCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/${studioSlug}/client/profile/${contactId}`;

    // Registrar log si hay promiseId
    if (promiseId) {
      logProfileShared(studioSlug, promiseId, contactName, profileUrl).catch((error) => {
        console.error('Error registrando perfil compartido:', error);
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${contactName}`,
          text: `Revisa el perfil de ${contactName}`,
          url: profileUrl,
        });
      } catch (error) {
        // Usuario canceló el share
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Link copiado al portapapeles');
    }
  };

  const handleCopyLink = async () => {
    if (!promiseId) {
      toast.error('La promesa debe estar guardada para copiar el link');
      return;
    }

    const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;

    try {
      await navigator.clipboard.writeText(previewUrl);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copiando link:', error);
      toast.error('Error al copiar el link');
    }
  };

  const handlePreview = () => {
    if (!promiseId) {
      toast.error('La promesa debe estar guardada para ver la vista previa');
      return;
    }

    const previewUrl = `${window.location.origin}/${studioSlug}/promise/${promiseId}`;

    // Registrar log
    logProfileShared(studioSlug, promiseId, contactName, previewUrl).catch((error) => {
      console.error('Error registrando promesa compartida:', error);
    });

    // Abrir en nueva ventana
    window.open(previewUrl, '_blank');
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Acciones Rápidas
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-3">
          <div className="space-y-2.5">
            <button
              onClick={handleCopyLink}
              className={`w-full px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${linkCopied
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              title={linkCopied ? 'Link copiado' : 'Copiar link'}
              aria-label={linkCopied ? 'Link copiado' : 'Copiar link'}
              disabled={!promiseId}
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 shrink-0" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
            <button
              onClick={handlePreview}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-2 text-sm font-medium"
              title="Abrir vista previa (abre en nueva pestaña)"
              aria-label="Abrir vista previa (abre en nueva pestaña)"
              disabled={!promiseId}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span>Abrir vista previa</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-2 text-sm font-medium"
              title="Configurar compartir"
              aria-label="Configurar compartir"
              disabled={!promiseId}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Configurar compartir</span>
            </button>
          </div>
        </ZenCardContent>
      </ZenCard>
      {promiseId && (
        <PromiseShareOptionsModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          studioSlug={studioSlug}
          promiseId={promiseId}
        />
      )}
    </>
  );
}

